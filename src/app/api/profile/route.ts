import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/server/auth/guards";
import { respond } from "@/server/http/respond";
import { getOwnProfile } from "@/server/services/users";

export function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.ok) return auth.response;
  return respond(getOwnProfile(auth.actor));
}
