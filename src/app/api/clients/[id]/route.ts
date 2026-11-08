import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/server/auth/guards";
import { respond } from "@/server/http/respond";
import { getClient } from "@/server/services/clients";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  return respond(getClient(auth.actor, id));
}
