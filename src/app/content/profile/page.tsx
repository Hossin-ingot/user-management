import { forbidden } from "next/navigation";
import { requirePageActor } from "@/server/auth/guards";
import { canViewContent } from "@/server/auth/policy";
import { getOwnProfile } from "@/server/services/users";

export default async function ProfilePage() {
  const actor = await requirePageActor(canViewContent);
  const result = getOwnProfile(actor);
  if (!result.ok) forbidden();
  const { user, managerName, roleLabel } = result.value;

  return (
    <div className="card">
      <h1>My profile</h1>
      <dl>
        <dt>Name</dt><dd>{user.fullName}</dd>
        <dt>Email</dt><dd>{user.email}</dd>
        <dt>Role</dt><dd>{roleLabel}</dd>
        <dt>Status</dt><dd><span className={`badge ${user.status}`}>{user.status}</span></dd>
        <dt>Manager</dt><dd>{managerName ?? "—"}</dd>
        <dt>Member since</dt><dd>{new Date(user.createdAt).toLocaleDateString("en-GB")}</dd>
      </dl>
    </div>
  );
}
