import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/server/auth/guards";
import { parseWith, respond } from "@/server/http/respond";
import { clientListQuerySchema } from "@/server/http/schemas";
import { listClients } from "@/server/services/clients";

export function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const query = parseWith(
    clientListQuerySchema,
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.ok) return query.response;

  return respond(listClients(auth.actor, query.data));
}
