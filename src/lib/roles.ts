import { Role, ROLE_DEFINITIONS, RoleDefinition } from "@/types/Roles";

export function getRoleDefinition(role: Role): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

export function isAdministratorRole(role: Role): boolean {
  const { can } = ROLE_DEFINITIONS[role];
  return can.changeRole && can.changeStatus;
}