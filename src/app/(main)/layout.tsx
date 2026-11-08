import Link from "next/link";
import { getRoleDefinition } from "@/lib/roles";
import { getOptionalActor } from "@/server/auth/guards";
import { canAccessUserManagement, canViewContent } from "@/server/auth/policy";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getOptionalActor();

  return (
    <>
      <header>
        <strong>UMC</strong>
        <nav>
          {actor && canViewContent(actor) && (
            <>
              <Link href="/content">Clients</Link>
              <Link href="/content/me">My profile</Link>
            </>
          )}
          {actor && canAccessUserManagement(actor) && <Link href="/manage-users">Manage users</Link>}
        </nav>
        {actor && (
          <>
            <span className="muted">
              {actor.fullName} · {getRoleDefinition(actor.role).label}
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit">Log out</button>
            </form>
          </>
        )}
      </header>
      <main>{children}</main>
    </>
  );
}