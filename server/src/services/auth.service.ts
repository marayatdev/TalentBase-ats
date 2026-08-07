import { prisma } from "@/config/db";
import { users_role } from "@/generated/prisma/client";

export class AuthService {
  async getUserByEmail(email: string) {
    return prisma.users.findUnique({
      where: {
        email,
      },
    });
  }

  async getUserById(id: string | bigint) {
    return prisma.users.findUnique({
      where: {
        id: BigInt(id),
      },
    });
  }

  async registerUser(data: any) {
    return prisma.users.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role ?? users_role.hr,
      },
    });
  }

  async getAllUsers() {
    return prisma.users.findMany({
      orderBy: {
        created_at: "desc",
      },
    });
  }
}
