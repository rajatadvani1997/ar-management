/**
 * NextAuth module augmentation — extends Session, User, and JWT types
 * to include `id` and `role` so callers never need `as any` casts.
 *
 * SOLID — LSP: Session type correctly contracts that `role: Role` is
 * always present after authentication; no call site can assign a wrong type.
 */
import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";
import type { Role } from "@/app/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
    };
  }
  interface User extends DefaultUser {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
  }
}
