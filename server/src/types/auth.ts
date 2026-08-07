import { users_role } from "@/generated/prisma/enums";

export type User = {
  id: string | bigint;
  name: string;
  email: string;
  password: string;
  role: users_role;
  is_active: number;
};
