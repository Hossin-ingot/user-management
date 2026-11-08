import { Suspense } from "react";
import { ClientTable } from "@/components/ClientTable";
import { requirePageActor } from "@/server/auth/guards";
import { canViewContent } from "@/server/auth/policy";

export default async function ContentPage() {
  await requirePageActor(canViewContent);
  return (
    <>
      <h1>Clients</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <ClientTable />
      </Suspense>
    </>
  );
}
