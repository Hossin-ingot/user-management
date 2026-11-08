import { redirect } from "next/navigation";
import { getOptionalActor } from "@/server/auth/guards";
import { getRoleDefinition } from "@/lib/roles";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const actor = await getOptionalActor();
  if (actor) redirect(getRoleDefinition(actor.role).landingPath);

  return (
    <div className="card" style={{ maxWidth: 380, margin: "3rem auto" }}>
      <h1>Log in</h1>
      <LoginForm />
      <p className="muted">Seeded accounts are listed in the README (password: password123).</p>
    </div>
  );
}
