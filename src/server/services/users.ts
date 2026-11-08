import { getRoleDefinition } from "@/lib/roles";
import { fail, ok, Result } from "../result";
import { User } from "@/types/Models";
import { MeResponse } from "@/types/Api";
import { canViewContent } from "../auth/policy";
import { getStore } from "@/data/store";

function managerNameOf(user: User): string | null {
  if (!user.managerId) return null;
  return getStore().users.get(user.managerId)?.fullName ?? null;
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