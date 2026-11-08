import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createSession } from "@/server/auth/session";
import { fail, ok, type Result } from "@/server/result";
import { getRoleDefinition } from "@/lib/roles";
import { getStore } from "@/data/store";

export interface LoginSuccess {
  token: string;
  landingPath: string;
}

function passwordsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function login(email: string, password: string): Result<LoginSuccess> {
  const store = getStore();
  const user = [...store.users.values()].find((u) => u.email === email);
  const credential = user ? store.credentials.get(user.id) : undefined;

  if (!user || !credential || !passwordsMatch(password, credential.password)) {
    return fail({ status: 401, code: "UNAUTHENTICATED", message: "Invalid email or password." });
  }

  if (user.status !== "active") {
    return fail({ status: 403, code: "FORBIDDEN", message: "This account is deactivated." });
  }

  return ok({
    token: createSession(user.id),
    landingPath: getRoleDefinition(user.role).landingPath,
  });
}
