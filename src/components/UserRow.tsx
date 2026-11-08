"use client";

import { useState } from "react";
import type { ManageUsersResponse, ManagedUser } from "@/types/Api";

type Props = {
  user: ManagedUser;
  meta: ManageUsersResponse["meta"];
  isMe: boolean;
  onSave: (patch: Record<string, string | null>) => Promise<boolean>;
};

export function UserRow({ user, meta, isMe, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const { allowed } = user;
  const canEdit =
    allowed.editProfile || allowed.changeRole || allowed.assignManager;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch: Record<string, string | null> = {};
    for (const field of ["fullName", "email", "role"] as const) {
      const value = data.get(field);
      if (value !== null && value !== user[field]) patch[field] = String(value);
    }
    const managerId = data.get("managerId");
    if (managerId !== null && (managerId || null) !== user.managerId) {
      patch.managerId = managerId ? String(managerId) : null;
    }

    if (Object.keys(patch).length === 0 || (await onSave(patch)))
      setEditing(false);
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <form className="row" onSubmit={handleSubmit}>
            <input
              name="fullName"
              defaultValue={user.fullName}
              disabled={!allowed.editProfile}
            />
            <input
              name="email"
              defaultValue={user.email}
              disabled={!allowed.editProfile}
            />
            <select
              name="role"
              defaultValue={user.role}
              disabled={!allowed.changeRole}
            >
              {meta.roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {allowed.assignManager && (
              <select name="managerId" defaultValue={user.managerId ?? ""}>
                <option value="">No manager</option>
                {meta.managerOptions
                  .filter((m) => m.id !== user.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
              </select>
            )}
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        </td>
      </tr>
    );
  }

  const nextStatus = user.status === "active" ? "deactivated" : "active";

  return (
    <tr>
      <td>
        {user.fullName} {isMe && <span className="muted">(you)</span>}
      </td>
      <td>{user.email}</td>
      <td>{meta.roleOptions.find((r) => r.value === user.role)?.label}</td>
      <td>
        <span className={`badge ${user.status}`}>{user.status}</span>
      </td>
      <td>{user.managerName ?? "—"}</td>
      <td>
        {canEdit && <button onClick={() => setEditing(true)}>Edit</button>}{" "}
        {allowed.changeStatus && (
          <button onClick={() => onSave({ status: nextStatus })}>
            {user.status === "active" ? "Deactivate" : "Activate"}
          </button>
        )}
      </td>
    </tr>
  );
}
