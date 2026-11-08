"use client";

import { apiFetch } from "@/client/api";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await apiFetch<{ landingPath: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      },
      { redirectOnUnauthenticated: false },
    );
    if (result.ok) {
      window.location.assign(result.data.landingPath);
      return;
    }
    setError(result.error.message);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="row">
        <label style={{ width: "100%" }}>
          Email
          <br />
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            style={{ width: "100%" }}
          />
        </label>
      </div>
      <div className="row">
        <label style={{ width: "100%" }}>
          Password
          <br />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ width: "100%" }}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
