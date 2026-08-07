import crypto from "crypto";

import { prisma } from "@/config/db";
import { AppError } from "@/utils/app-error";

export interface CreateGoogleCalendarEventInput {
  user_id: bigint;

  title: string;
  description?: string | null;

  start_at: Date;
  end_at: Date;
  timezone: string;

  attendees: string[];
}

export interface UpdateGoogleCalendarEventInput {
  user_id: bigint;
  calendar_id: string;
  event_id: string;

  title: string;
  description?: string | null;

  start_at: Date;
  end_at: Date;
  timezone: string;

  attendees: string[];
}

export interface GoogleCalendarEventResult {
  calendar_id: string;
  event_id: string;
  event_url: string | null;
  meet_url: string | null;
}

export interface CheckGoogleCalendarConflictInput {
  user_id: bigint;

  start_at: Date;
  end_at: Date;

  /**
   * ใช้ตอน Reschedule เพื่อไม่ให้ Google Event
   * ปัจจุบันถูกตรวจว่าเป็น conflict กับตัวเอง
   */
  exclude_event_id?: string;
}

export interface GoogleCalendarConflict {
  event_id: string;
  title: string | null;

  start_at: Date;
  end_at: Date;

  event_url: string | null;
}

export interface GoogleCalendarConflictResult {
  has_conflict: boolean;
  conflicts: GoogleCalendarConflict[];
}

export class GoogleCalendarService {
  private async loadGoogleApis() {
    const { google } = await import("googleapis");

    return google;
  }

  private async createOAuthClient(params: {
    access_token?: string | null;
    refresh_token: string;
    token_expiry?: Date | null;
  }) {
    const google = await this.loadGoogleApis();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new AppError(
        "Google OAuth configuration ไม่ครบถ้วน",
        500,
      );
    }

    const oauthClient = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    oauthClient.setCredentials({
      access_token:
        params.access_token ?? undefined,

      refresh_token:
        params.refresh_token,

      expiry_date:
        params.token_expiry?.getTime(),
    });

    return {
      google,
      oauthClient,
    };
  }

  private async getConnectedCalendarClient(
    userId: bigint,
    notConnectedMessage: string,
  ) {
    const account =
      await prisma.google_accounts.findUnique({
        where: {
          user_id: userId,
        },
      });

    if (!account) {
      throw new AppError(
        notConnectedMessage,
        409,
      );
    }

    const {
      google,
      oauthClient,
    } = await this.createOAuthClient({
      access_token:
        account.access_token,

      refresh_token:
        account.refresh_token,

      token_expiry:
        account.token_expiry,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauthClient,
    });

    return {
      calendar,
      account,
    };
  }

  async createMeetEvent(
    input: CreateGoogleCalendarEventInput,
  ): Promise<GoogleCalendarEventResult> {
    const { calendar } =
      await this.getConnectedCalendarClient(
        input.user_id,
        "กรุณาเชื่อมต่อ Google Calendar ก่อนนัดสัมภาษณ์",
      );

    const calendarId = "primary";

    const response =
      await calendar.events.insert({
        calendarId,

        conferenceDataVersion: 1,

        sendUpdates: "all",

        requestBody: {
          summary: input.title,

          description:
            input.description ?? undefined,

          start: {
            dateTime:
              input.start_at.toISOString(),

            timeZone:
              input.timezone,
          },

          end: {
            dateTime:
              input.end_at.toISOString(),

            timeZone:
              input.timezone,
          },

          attendees:
            input.attendees.map((email) => ({
              email,
            })),

          conferenceData: {
            createRequest: {
              requestId:
                crypto.randomUUID(),

              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },

          reminders: {
            useDefault: false,

            overrides: [
              {
                method: "email",
                minutes: 24 * 60,
              },
              {
                method: "popup",
                minutes: 30,
              },
            ],
          },
        },
      });

    const event = response.data;

    if (!event.id) {
      throw new AppError(
        "Google Calendar ไม่คืนรหัส Event",
        502,
      );
    }

    const meetUrl =
      event.hangoutLink ??
      event.conferenceData
        ?.entryPoints
        ?.find(
          (entryPoint) =>
            entryPoint.entryPointType === "video",
        )?.uri ??
      null;

    return {
      calendar_id: calendarId,
      event_id: event.id,
      event_url: event.htmlLink ?? null,
      meet_url: meetUrl,
    };
  }

  async updateMeetEvent(
    input: UpdateGoogleCalendarEventInput,
  ): Promise<GoogleCalendarEventResult> {
    const { calendar } =
      await this.getConnectedCalendarClient(
        input.user_id,
        "กรุณาเชื่อมต่อ Google Calendar ก่อนแก้ไขนัดสัมภาษณ์",
      );

    const response =
      await calendar.events.patch({
        calendarId:
          input.calendar_id,

        eventId:
          input.event_id,

        conferenceDataVersion: 1,

        sendUpdates: "all",

        requestBody: {
          summary: input.title,

          description:
            input.description ?? undefined,

          start: {
            dateTime:
              input.start_at.toISOString(),

            timeZone:
              input.timezone,
          },

          end: {
            dateTime:
              input.end_at.toISOString(),

            timeZone:
              input.timezone,
          },

          attendees:
            input.attendees.map((email) => ({
              email,
            })),
        },
      });

    const event = response.data;

    if (!event.id) {
      throw new AppError(
        "Google Calendar ไม่คืนรหัส Event หลังแก้ไข",
        502,
      );
    }

    const meetUrl =
      event.hangoutLink ??
      event.conferenceData
        ?.entryPoints
        ?.find(
          (entryPoint) =>
            entryPoint.entryPointType === "video",
        )?.uri ??
      null;

    return {
      calendar_id:
        input.calendar_id,

      event_id:
        event.id,

      event_url:
        event.htmlLink ?? null,

      meet_url:
        meetUrl,
    };
  }

  async deleteEvent(params: {
    user_id: bigint;
    calendar_id: string;
    event_id: string;
  }): Promise<void> {
    const account =
      await prisma.google_accounts.findUnique({
        where: {
          user_id:
            params.user_id,
        },
      });

    if (!account) {
      return;
    }

    const {
      google,
      oauthClient,
    } = await this.createOAuthClient({
      access_token:
        account.access_token,

      refresh_token:
        account.refresh_token,

      token_expiry:
        account.token_expiry,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauthClient,
    });

    await calendar.events.delete({
      calendarId:
        params.calendar_id,

      eventId:
        params.event_id,

      sendUpdates: "all",
    });
  }

  /**
   * ตรวจว่าช่วงเวลาที่ต้องการนัดชนกับ Event อื่น
   * ใน Google Calendar หลักของผู้สร้างนัดหรือไม่
   *
   * ใช้ events.list แทน freebusy.query เพราะตอน Reschedule
   * เราต้องรู้ event_id เพื่อ exclude Event เดิมออกจากผลตรวจ
   */
  async checkScheduleConflict(
    input: CheckGoogleCalendarConflictInput,
  ): Promise<GoogleCalendarConflictResult> {
    this.validateDateRange(
      input.start_at,
      input.end_at,
    );

    const { calendar } =
      await this.getConnectedCalendarClient(
        input.user_id,
        "กรุณาเชื่อมต่อ Google Calendar ก่อนนัดสัมภาษณ์",
      );

    try {
      const response =
        await calendar.events.list({
          calendarId: "primary",

          timeMin:
            input.start_at.toISOString(),

          timeMax:
            input.end_at.toISOString(),

          singleEvents: true,

          orderBy: "startTime",

          showDeleted: false,

          maxResults: 100,
        });

      const conflicts: GoogleCalendarConflict[] = [];

      for (const event of response.data.items ?? []) {
        if (
          input.exclude_event_id &&
          event.id === input.exclude_event_id
        ) {
          continue;
        }

        if (event.status === "cancelled") {
          continue;
        }

        /*
         * transparency = transparent หมายถึง Show as free
         * จึงไม่ควร block เวลา
         */
        if (event.transparency === "transparent") {
          continue;
        }

        const startValue =
          event.start?.dateTime ??
          event.start?.date;

        const endValue =
          event.end?.dateTime ??
          event.end?.date;

        if (!startValue || !endValue) {
          continue;
        }

        const eventStart = new Date(startValue);
        const eventEnd = new Date(endValue);

        if (
          Number.isNaN(eventStart.getTime()) ||
          Number.isNaN(eventEnd.getTime())
        ) {
          continue;
        }

        const overlaps =
          eventStart < input.end_at &&
          eventEnd > input.start_at;

        if (!overlaps) {
          continue;
        }

        conflicts.push({
          event_id:
            event.id ?? "",

          title:
            event.summary ?? null,

          start_at:
            eventStart,

          end_at:
            eventEnd,

          event_url:
            event.htmlLink ?? null,
        });
      }

      return {
        has_conflict:
          conflicts.length > 0,

        conflicts,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unknown Google Calendar conflict check error";

      console.error(
        "[GoogleCalendarService] Conflict check failed:",
        {
          userId:
            input.user_id.toString(),

          startAt:
            input.start_at.toISOString(),

          endAt:
            input.end_at.toISOString(),

          excludeEventId:
            input.exclude_event_id ?? null,

          error,
        },
      );

      throw new AppError(
        `ตรวจสอบเวลาว่างใน Google Calendar ไม่สำเร็จ: ${message}`,
        502,
      );
    }
  }

  private validateDateRange(
    startAt: Date,
    endAt: Date,
  ): void {
    if (
      !(startAt instanceof Date) ||
      Number.isNaN(startAt.getTime())
    ) {
      throw new AppError(
        "เวลาเริ่มต้นไม่ถูกต้อง",
        400,
      );
    }

    if (
      !(endAt instanceof Date) ||
      Number.isNaN(endAt.getTime())
    ) {
      throw new AppError(
        "เวลาสิ้นสุดไม่ถูกต้อง",
        400,
      );
    }

    if (endAt <= startAt) {
      throw new AppError(
        "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
        400,
      );
    }
  }
}