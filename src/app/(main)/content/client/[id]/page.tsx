import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requirePageActor } from "@/server/auth/guards";
import { canViewContent } from "@/server/auth/policy";
import { getClient } from "@/server/services/clients";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor(canViewContent);
  const { id } = await params;
  const result = getClient(actor, id);
  
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    forbidden();
  }
  const client = result.value;

  return (
    <>
      <p>
        <Link href="/content">← Back to clients</Link>
      </p>
      <div className="card">
        <h1>{client.name}</h1>
        <dl>
          <dt>ID</dt><dd>{client.id}</dd>
          <dt>Company</dt><dd>{client.company}</dd>
          <dt>Email</dt><dd>{client.email}</dd>
          <dt>Country</dt><dd>{client.country}</dd>
          <dt>Status</dt><dd><span className={`badge ${client.status}`}>{client.status}</span></dd>
          <dt>Created</dt><dd>{new Date(client.createdAt).toLocaleDateString("en-GB")}</dd>
        </dl>
      </div>
    </>
  );
}
