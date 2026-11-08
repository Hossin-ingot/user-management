import { UserStatus } from "./Models";
import { Role } from "./Roles";

export type DenialCode = "FORBIDDEN" | "SELF_LOCKOUT" | "LAST_ADMINISTRATOR";
export type Decision = { allowed: true } | { allowed: false; denials: Denial[] };

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


export interface AllowedActions {
  editProfile: boolean;
  changeRole: boolean;
  changeStatus: boolean;
  assignManager: boolean;
}