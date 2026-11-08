import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/server/auth/guards";
import { parseJsonBody, respond } from "@/server/http/respond";
import { updateUserSchema } from "@/server/http/schemas";
import { updateUser } from "@/server/services/users";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, updateUserSchema);
  if (!body.ok) return body.response;

  const { id } = await params;
  return respond(updateUser(auth.actor, id, body.data));
}