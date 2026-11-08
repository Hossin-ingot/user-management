import { getRoleDefinition } from "@/lib/roles";
import { User, UserStatus } from "@/types/Models";
import { Role } from "@/types/Roles";

export type DenialCode = "FORBIDDEN" | "SELF_LOCKOUT" | "LAST_ADMINISTRATOR";

export interface UserPatch {
  fullName?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  managerId?: string | null;
}

export interface Denial {
  code: DenialCode;
  message: string;
  field?: keyof UserPatch;
}

export function canViewContent(actor: User): boolean {
  return getRoleDefinition(actor.role).can.viewContent;
}