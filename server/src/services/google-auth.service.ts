import { prisma } from "@/config/db";
import { AppError } from "@/utils/app-error";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export class GoogleAuthService {
  private async createOAuthClient() {
    const { google } = await import("googleapis");

    const clientId =
      process.env.GOOGLE_CLIENT_ID;

    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI;

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      throw new AppError(
        "Google OAuth configuration ไม่ครบถ้วน",
        500,
      );
    }

    const oauthClient =
      new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );

    return {
      google,
      oauthClient,
    };
  }

  async createAuthUrl(
    userId: bigint,
  ): Promise<string> {
    const {
      oauthClient,
    } =
      await this.createOAuthClient();

    const state =
      this.encodeState({
        user_id:
          userId.toString(),
      });

    return oauthClient.generateAuthUrl({
      access_type:
        "offline",

      prompt:
        "consent",

      scope:
        GOOGLE_CALENDAR_SCOPES,

      state,

      include_granted_scopes:
        true,
    });
  }

  async handleCallback(
    code: string,
    state: string,
  ) {
    if (!code) {
      throw new AppError(
        "ไม่พบ Google authorization code",
        400,
      );
    }

    if (!state) {
      throw new AppError(
        "ไม่พบ Google OAuth state",
        400,
      );
    }

    const decodedState =
      this.decodeState(state);

    const userId =
      this.parseId(
        decodedState.user_id,
      );

    const user =
      await prisma.users.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
        },
      });

    if (!user) {
      throw new AppError(
        "ไม่พบผู้ใช้งาน",
        404,
      );
    }

    const {
      google,
      oauthClient,
    } =
      await this.createOAuthClient();

    const {
      tokens,
    } =
      await oauthClient.getToken(
        code,
      );

    const existingAccount =
      await prisma.google_accounts.findUnique({
        where: {
          user_id:
            userId,
        },
      });

    /*
     * Google จะไม่ส่ง refresh token ทุกครั้ง
     * จึงใช้ของเดิมได้ถ้ามีอยู่แล้ว
     */
    const refreshToken =
      tokens.refresh_token ??
      existingAccount?.refresh_token;

    if (!refreshToken) {
      throw new AppError(
        "Google ไม่ได้ส่ง refresh token กรุณาถอดสิทธิ์แอปแล้วเชื่อมต่อใหม่",
        400,
      );
    }

    oauthClient.setCredentials({
      access_token:
        tokens.access_token ??
        undefined,

      refresh_token:
        refreshToken,

      expiry_date:
        tokens.expiry_date ??
        undefined,

      scope:
        tokens.scope ??
        undefined,

      token_type:
        tokens.token_type ??
        undefined,

      id_token:
        tokens.id_token ??
        undefined,
    });

    const oauth2 =
      google.oauth2({
        version:
          "v2",

        auth:
          oauthClient,
      });

    const profile =
      await oauth2.userinfo.get();

    const googleEmail =
      profile.data.email
        ?.trim()
        .toLowerCase();

    if (!googleEmail) {
      throw new AppError(
        "ไม่พบอีเมลบัญชี Google",
        400,
      );
    }

    return prisma.google_accounts.upsert({
      where: {
        user_id:
          userId,
      },

      update: {
        google_email:
          googleEmail,

        access_token:
          tokens.access_token ??
          existingAccount?.access_token ??
          null,

        refresh_token:
          refreshToken,

        token_expiry:
          tokens.expiry_date
            ? new Date(
                tokens.expiry_date,
              )
            : existingAccount?.token_expiry ??
              null,

        scope:
          tokens.scope ??
          existingAccount?.scope ??
          null,
      },

      create: {
        user_id:
          userId,

        google_email:
          googleEmail,

        access_token:
          tokens.access_token ??
          null,

        refresh_token:
          refreshToken,

        token_expiry:
          tokens.expiry_date
            ? new Date(
                tokens.expiry_date,
              )
            : null,

        scope:
          tokens.scope ??
          null,
      },

      select: {
        id: true,
        user_id: true,
        google_email: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async getConnection(
    userId: bigint,
  ) {
    const account =
      await prisma.google_accounts.findUnique({
        where: {
          user_id:
            userId,
        },

        select: {
          google_email:
            true,

          created_at:
            true,

          updated_at:
            true,
        },
      });

    return {
      connected:
        Boolean(account),

      google_email:
        account?.google_email ??
        null,

      connected_at:
        account?.created_at ??
        null,

      updated_at:
        account?.updated_at ??
        null,
    };
  }

  async disconnect(
    userId: bigint,
  ): Promise<void> {
    const account =
      await prisma.google_accounts.findUnique({
        where: {
          user_id:
            userId,
        },

        select: {
          id: true,
          access_token:
            true,
          refresh_token:
            true,
        },
      });

    if (!account) {
      return;
    }

    try {
      const {
        oauthClient,
      } =
        await this.createOAuthClient();

      const tokenToRevoke =
        account.access_token ??
        account.refresh_token;

      await oauthClient.revokeToken(
        tokenToRevoke,
      );
    } catch (error) {
      console.error(
        "[GoogleAuthService] Could not revoke Google token:",
        error,
      );
    }

    await prisma.google_accounts.delete({
      where: {
        id:
          account.id,
      },
    });
  }

  private encodeState(
    value: {
      user_id: string;
    },
  ): string {
    return Buffer.from(
      JSON.stringify(value),
    ).toString(
      "base64url",
    );
  }

  private decodeState(
    value: string,
  ): {
    user_id: string;
  } {
    try {
      const decoded =
        Buffer.from(
          value,
          "base64url",
        ).toString(
          "utf8",
        );

      const parsed =
        JSON.parse(decoded) as {
          user_id?: unknown;
        };

      if (
        typeof parsed.user_id !==
          "string" ||
        !parsed.user_id
      ) {
        throw new Error(
          "Missing user_id",
        );
      }

      return {
        user_id:
          parsed.user_id,
      };
    } catch {
      throw new AppError(
        "Google OAuth state ไม่ถูกต้อง",
        400,
      );
    }
  }

  private parseId(
    value: string,
  ): bigint {
    if (
      !/^\d+$/.test(value)
    ) {
      throw new AppError(
        "รหัสผู้ใช้งานไม่ถูกต้อง",
        400,
      );
    }

    const id =
      BigInt(value);

    if (
      id <= 0n
    ) {
      throw new AppError(
        "รหัสผู้ใช้งานไม่ถูกต้อง",
        400,
      );
    }

    return id;
  }
}