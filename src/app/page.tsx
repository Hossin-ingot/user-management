import { redirect } from "next/navigation";
import { getOptionalActor } from "@/server/auth/guards";
import { getRoleDefinition } from "@/lib/roles";

export default async function Home() {
  const actor = await getOptionalActor();
  redirect(actor ? getRoleDefinition(actor.role).landingPath : "/login");
}
