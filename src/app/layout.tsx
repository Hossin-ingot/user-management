import type { Metadata } from "next";
import Link from "next/link";
import { getOptionalActor } from "@/server/auth/guards";
import { canAccessUserManagement, canViewContent } from "@/server/auth/policy";
import "./globals.css";
import { getRoleDefinition } from "@/lib/roles";

export const metadata: Metadata = {
  title: "User Management & Content",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const actor = await getOptionalActor();

  return (
    <html lang="en">
      <body>
        <header>
          <strong>Aloplay</strong>
          <nav>
            {actor && canViewContent(actor) && (
              <>
                <Link href="/content">Clients</Link>
                <Link href="/content/profile">My profile</Link>
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
      </body>
    </html>
  );
}
