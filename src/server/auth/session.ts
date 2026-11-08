import { getStore } from "@/data/store";
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

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
} as const;