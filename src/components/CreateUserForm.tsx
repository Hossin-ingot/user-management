"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/client/api";
import type { ManageUsersResponse } from "@/types/Api";

export function CreateUserForm({ meta }: { meta: ManageUsersResponse["meta"] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const result = await apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify({
        fullName: data.get("fullName"),
        email: data.get("email"),
        password: data.get("password"),
        role: data.get("role"),
        managerId: data.get("managerId") || null,
      }),
    });

    if (!result.ok) {
      setMessage({ ok: false, text: result.error.message });
      return;
    }
    setMessage({ ok: true, text: "User created." });
    form.reset();
    router.refresh();
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <strong>Create user</strong>
      <div className="row">
        <input name="fullName" placeholder="Full name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required minLength={8} />
        <select name="role" defaultValue="user">
          {meta.roleOptions.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select name="managerId" defaultValue="">
          <option value="">No manager</option>
          {meta.managerOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
        <button type="submit">Create</button>
      </div>
      {message && <p className={message.ok ? "ok" : "error"}>{message.text}</p>}
    </form>
  );
}