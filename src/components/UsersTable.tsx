"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/client/api";
import type { ManageUsersResponse, ManagedUser } from "@/types/Api";
import { UserRow } from "./UserRow";

type Props = {
  users: ManagedUser[];
  meta: ManageUsersResponse["meta"];
  currentUserId: string;
};

export function UsersTable({ users, meta, currentUserId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function updateUser(id: string, patch: Record<string, string | null>) {
    const result = await apiFetch(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    setError(null);
    router.refresh();
    return true;
  }

  if (users.length === 0) return <p>No users to manage.</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Manager</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              meta={meta}
              isMe={user.id === currentUserId}
              onSave={(patch) => updateUser(user.id, patch)}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}