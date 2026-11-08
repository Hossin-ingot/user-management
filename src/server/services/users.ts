import { getRoleDefinition } from "@/lib/roles";
import { AppError, errorFromDenials, fail, ok, Result } from "../result";
import { User } from "@/types/Models";
import { CreateUserInput, ManagedUser, ManageUsersResponse, MeResponse } from "@/types/Api";
import { allowedActionsOn, authorizeUserUpdate, canAccessUserManagement, canAssignManagers, canCreateUser, canViewContent, canViewUser, filterVisibleUsers } from "../auth/policy";
import { getStore } from "@/data/store";
import { randomUUID } from "node:crypto";
import { ROLES } from "@/types/Roles";
import { revokeSessionsForUser } from "../auth/session";
import { UserPatch } from "@/types/Policy";

const FORBIDDEN_LIST: AppError = {
  status: 403,
  code: "FORBIDDEN",
  message: "You don't have access to user management.",
};

function allUsers(): User[] {
  return [...getStore().users.values()];
}

function managerNameOf(user: User): string | null {
  if (!user.managerId) return null;
  return getStore().users.get(user.managerId)?.fullName ?? null;
}

function toManagedUser(actor: User, user: User): ManagedUser {
  return {
    ...user,
    managerName: managerNameOf(user),
    allowed: allowedActionsOn(actor, user),
  };
}

function isEmailTaken(email: string, exceptUserId?: string): boolean {
  for (const u of getStore().users.values()) {
    if (u.email === email && u.id !== exceptUserId) return true;
  }
  return false;
}

function validateManagerAssignment(
  userId: string | null,
  managerId: string | null,
): AppError | null {
  if (managerId === null) return null;
  const { users } = getStore();
  const manager = users.get(managerId);
  if (!manager) {
    return {
      status: 422,
      code: "VALIDATION",
      message: "Manager does not exist.",
    };
  }
  if (!getRoleDefinition(manager.role).canHaveReports) {
    return {
      status: 422,
      code: "VALIDATION",
      message: "That user's role cannot have direct reports.",
    };
  }
  if (userId !== null) {
    let cursor: User | undefined = manager;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      if (cursor.id === userId) {
        return {
          status: 422,
          code: "VALIDATION",
          message:
            "A user cannot report to themselves, directly or indirectly.",
        };
      }
      seen.add(cursor.id);
      cursor = cursor.managerId ? users.get(cursor.managerId) : undefined;
    }
  }
  return null;
}

export function getOwnProfile(actor: User): Result<MeResponse> {
  if (!canViewContent(actor)) {
    return fail({
      status: 403,
      code: "FORBIDDEN",
      message: "Your role cannot view content pages.",
    });
  }
  return ok({
    user: actor,
    managerName: managerNameOf(actor),
    roleLabel: getRoleDefinition(actor.role).label,
  });
}

export function createUser(
  actor: User,
  input: CreateUserInput,
): Result<ManagedUser> {
  if (!canCreateUser(actor)) {
    return fail({
      status: 403,
      code: "FORBIDDEN",
      message: "Only IT can create users.",
    });
  }
  if (input.managerId !== null && !canAssignManagers(actor)) {
    return fail({
      status: 403,
      code: "FORBIDDEN",
      message: "You cannot assign a manager.",
    });
  }
  if (isEmailTaken(input.email)) {
    return fail({
      status: 409,
      code: "CONFLICT",
      message: "That email is already in use.",
    });
  }
  const managerError = validateManagerAssignment(null, input.managerId);
  if (managerError) return fail(managerError);

  const user: User = {
    id: `u-${randomUUID()}`,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    status: "active",
    managerId: input.managerId,
    createdAt: new Date().toISOString(),
  };

  const store = getStore();
  store.users.set(user.id, user);
  store.credentials.set(user.id, { userId: user.id, password: input.password });
  return ok(toManagedUser(actor, user));
}

export function updateUser(
  actor: User,
  targetId: string,
  patch: UserPatch,
): Result<ManagedUser> {
  const store = getStore();
  const target = store.users.get(targetId);
  const isSelf = target?.id === actor.id;
  if (!target || (!isSelf && !canViewUser(actor, target))) {
    return fail({ status: 404, code: "NOT_FOUND", message: "User not found." });
  }

  const decision = authorizeUserUpdate(actor, target, patch, allUsers());
  if (!decision.allowed) return fail(errorFromDenials(decision.denials));
  if (patch.email !== undefined && isEmailTaken(patch.email, target.id)) {
    return fail({
      status: 409,
      code: "CONFLICT",
      message: "That email is already in use.",
    });
  }
  if (patch.managerId !== undefined) {
    const managerError = validateManagerAssignment(target.id, patch.managerId);
    if (managerError) return fail(managerError);
  }
  if (
    patch.role !== undefined &&
    !getRoleDefinition(patch.role).canHaveReports
  ) {
    const hasReports = allUsers().some((u) => u.managerId === target.id);
    if (hasReports) {
      return fail({
        status: 409,
        code: "CONFLICT",
        message:
          "Reassign this user's direct reports before changing their role.",
      });
    }
  }

  const updated: User = {
    ...target,
    ...(patch.fullName !== undefined && { fullName: patch.fullName }),
    ...(patch.email !== undefined && { email: patch.email }),
    ...(patch.role !== undefined && { role: patch.role }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.managerId !== undefined && { managerId: patch.managerId }),
  };
  store.users.set(updated.id, updated);

  if (updated.status === "deactivated") revokeSessionsForUser(updated.id);

  return ok(toManagedUser(actor, updated));
}

export function listManagedUsers(actor: User): Result<ManageUsersResponse> {
  if (!canAccessUserManagement(actor)) return fail(FORBIDDEN_LIST);

  const users = allUsers();
  const visible = filterVisibleUsers(actor, users).sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );

  return ok({
    users: visible.map((u) => toManagedUser(actor, u)),
    meta: {
      canCreate: canCreateUser(actor),
      roleOptions: ROLES.map((value) => ({
        value,
        label: getRoleDefinition(value).label,
      })),
      managerOptions: canAssignManagers(actor)
        ? users
            .filter((u) => getRoleDefinition(u.role).canHaveReports)
            .map((u) => ({ id: u.id, fullName: u.fullName }))
        : [],
    },
  });
}