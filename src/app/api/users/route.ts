import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/server/auth/guards";
import { parseJsonBody, respond } from "@/server/http/respond";
import { createUserSchema } from "@/server/http/schemas";
import { createUser, listManagedUsers } from "@/server/services/users";

export function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;
  return respond(listManagedUsers(auth.actor));
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, createUserSchema);
  if (!body.ok) return body.response;

  return respond(createUser(auth.actor, body.data), 201);
}
