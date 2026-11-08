import { forbidden } from "next/navigation";
import { CreateUserForm } from "@/components/CreateUserForm";
import { UsersTable } from "@/components/UsersTable";
import { requirePageActor } from "@/server/auth/guards";
import { canAccessUserManagement } from "@/server/auth/policy";
import { listManagedUsers } from "@/server/services/users";

export default async function ManageUsersPage() {
  const actor = await requirePageActor(canAccessUserManagement);

  const result = listManagedUsers(actor);
  if (!result.ok) forbidden();
  const { users, meta } = result.value;

  return (
    <>
      <h1>Manage users</h1>
      {meta.canCreate && <CreateUserForm meta={meta} />}
      <UsersTable users={users} meta={meta} currentUserId={actor.id} />
    </>
  );
}