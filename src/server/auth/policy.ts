import { getRoleDefinition, isAdministratorRole } from "@/lib/roles";
import { User } from "@/types/Models";
import { AllowedActions, Decision, Denial, UserPatch } from "@/types/Policy";
import { Scope } from "@/types/Roles";

const ALLOW: Decision = { allowed: true };

export function canViewContent(actor: User): boolean {
  return getRoleDefinition(actor.role).can.viewContent;
}

function deny(...denials: Denial[]): Decision {
  return { allowed: false, denials };
}

function isInScope(scope: Scope, actor: User, target: User): boolean {
  switch (scope) {
    case "all":
      return true;
    case "directReports":
      return target.managerId === actor.id && target.id !== actor.id;
    case "none":
      return false;
  }
}

export function canViewUser(actor: User, target: User): boolean {
  return isInScope(getRoleDefinition(actor.role).can.viewUsers, actor, target);
}

export function canAccessUserManagement(actor: User): boolean {
  return getRoleDefinition(actor.role).can.viewUsers !== "none";
}

export function canCreateUser(actor: User): boolean {
  return getRoleDefinition(actor.role).can.createUser;
}

export function filterVisibleUsers(actor: User, users: readonly User[]): User[] {
  return users.filter((u) => canViewUser(actor, u));
}

function isActiveAdministrator(user: Pick<User, "role" | "status">): boolean {
  return user.status === "active" && isAdministratorRole(user.role);
}

export function allowedActionsOn(actor: User, target: User): AllowedActions {
  const { can } = getRoleDefinition(actor.role);
  const visible = canViewUser(actor, target);
  
  return {
    editProfile: visible && isInScope(can.editProfile, actor, target),
    changeRole: visible && can.changeRole,
    changeStatus: visible && can.changeStatus,
    assignManager: visible && can.assignManager,
  };
}

export function authorizeUserUpdate(
  actor: User,
  target: User,
  patch: UserPatch,
  allUsers: readonly User[],
): Decision {
  const actions = allowedActionsOn(actor, target);

  const changes = {
    profile:
      (patch.fullName !== undefined && patch.fullName !== target.fullName) ||
      (patch.email !== undefined && patch.email !== target.email),
    role: patch.role !== undefined && patch.role !== target.role,
    status: patch.status !== undefined && patch.status !== target.status,
    manager: patch.managerId !== undefined && patch.managerId !== target.managerId,
  };

  const forbidden: Denial[] = [];

  if (changes.profile && !actions.editProfile) {
    forbidden.push({
      code: "FORBIDDEN",
      field: "fullName",
      message: "You can only edit the name and email of your own direct reports.",
    });
  }

  if (changes.role && !actions.changeRole) {
    forbidden.push({ code: "FORBIDDEN", field: "role", message: "Only IT can change roles." });
  }

  if (changes.status && !actions.changeStatus) {
    forbidden.push({
      code: "FORBIDDEN",
      field: "status",
      message: "Only IT can activate or deactivate accounts.",
    });
  }

  if (changes.manager && !actions.assignManager) {
    forbidden.push({
      code: "FORBIDDEN",
      field: "managerId",
      message: "Only IT can change who a user reports to.",
    });
  }

  if (forbidden.length > 0) return deny(...forbidden);

  const nextRole = patch.role ?? target.role;
  const nextStatus = patch.status ?? target.status;
  const invariantDenials: Denial[] = [];

  const losesAdministrator =
    isActiveAdministrator(target) &&
    !isActiveAdministrator({ role: nextRole, status: nextStatus });

  if (losesAdministrator) {
    const otherActiveAdmins = allUsers.filter(
      (u) => u.id !== target.id && isActiveAdministrator(u),
    ).length;
    if (otherActiveAdmins === 0) {
      invariantDenials.push({
        code: "LAST_ADMINISTRATOR",
        field: changes.status ? "status" : "role",
        message:
          "This is the last active IT account. Activate or promote another IT account first.",
      });
    }
  }

  if (target.id === actor.id) {
    if (changes.status && nextStatus === "deactivated") {
      invariantDenials.push({
        code: "SELF_LOCKOUT",
        field: "status",
        message: "You cannot deactivate your own account.",
      });
    }
    if (changes.role) {
      invariantDenials.push({
        code: "SELF_LOCKOUT",
        field: "role",
        message: "You cannot change your own role.",
      });
    }
  }

  return invariantDenials.length > 0 ? deny(...invariantDenials) : ALLOW;
}