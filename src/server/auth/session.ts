import { getStore } from "@/data/store";
import { User } from "@/types/Models";
import { randomBytes } from "node:crypto";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("base64url");
  getStore().sessions.set(token, { token, userId, createdAt: Date.now() });
  return token;
}

export function destroySession(token: string): void {
  getStore().sessions.delete(token);
}

export function revokeSessionsForUser(userId: string): void {
  const { sessions } = getStore();
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}

export function resolveSession(token: string | undefined): User | null {
  if (!token) return null;
  const store = getStore();
  const session = store.sessions.get(token);
  if (!session) return null;

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    store.sessions.delete(token);
    return null;
  }

  const user = store.users.get(session.userId);
  if (!user || user.status !== "active") {
    store.sessions.delete(token);
    return null;
  }
  return user;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
} as const;