import { NextRequest } from "next/server";
import { resolveSession, SESSION_COOKIE } from "./session";
import { User } from "@/types/Models";
import { forbidden, redirect } from "next/navigation";
import { cookies } from "next/headers";

export type ApiAuth = { ok: true; actor: User } | { ok: false; response: Response };

export function authenticateRequest(request: NextRequest): ApiAuth {
  const actor = resolveSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!actor) {
    return {
      ok: false,
      response: Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Please log in." } },
        { status: 401 },
      ),
    };
  }
  return { ok: true, actor };
}

export async function getOptionalActor(): Promise<User | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

export async function requirePageActor(allowed?: (actor: User) => boolean): Promise<User> {
  const actor = await getOptionalActor();
  if (!actor) redirect("/login");
  if (allowed && !allowed(actor)) forbidden();
  return actor;
}