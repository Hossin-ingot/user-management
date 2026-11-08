import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";
import { errorResponse, parseJsonBody } from "@/server/http/respond";
import { loginSchema } from "@/server/http/schemas";
import { login } from "@/server/services/auth";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request, loginSchema);
  if (!body.ok) return body.response;

  const result = login(body.data.email, body.data.password);
  if (!result.ok) return errorResponse(result.error);
  const response = NextResponse.json({ landingPath: result.value.landingPath });
  response.cookies.set(SESSION_COOKIE, result.value.token, sessionCookieOptions);
  return response;
}