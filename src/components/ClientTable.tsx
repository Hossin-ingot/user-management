"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/client/api";
import type { Page } from "@/types/Api";
import type { Client } from "@/types/Models";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

export function ClientTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Page<Client> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sort = searchParams.get("sort") ?? "name";
  const order = searchParams.get("order") ?? "asc";
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";
  const query = searchParams.toString();

  useEffect(() => {
    const controller = new AbortController();

    apiFetch<Page<Client>>(`/api/clients?${query}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (result.ok) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error.message);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Network error, please try again.");
      });

    return () => controller.abort();
  }, [query]);

  function setParams(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/content?${params}`);
  }

  function sortBy(field: string) {
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    setParams({ sort: field, order: nextOrder, page: "" });
  }

  function header(field: string, label: string) {
    const Icon =
      sort !== field
        ? ChevronsUpDown
        : order === "asc"
          ? ChevronUp
          : ChevronDown;
    return (
      <th>
        <button
          type="button"
          onClick={() => sortBy(field)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          {label}
          <Icon size={14} opacity={sort === field ? 1 : 0.4} />
        </button>
      </th>
    );
  }

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  return (
    <>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const search = new FormData(e.currentTarget).get("q");
          setParams({ q: String(search ?? ""), page: "" });
        }}
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, company, email"
        />
        <button type="submit">Search</button>
        <select
          value={status}
          onChange={(e) => setParams({ status: e.target.value, page: "" })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="churned">Churned</option>
        </select>
        <span className="muted">{data.total} clients</span>
      </form>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            {header("name", "Name")}
            {header("company", "Company")}
            {header("country", "Country")}
            {header("status", "Status")}
            {header("createdAt", "Created")}
          </tr>
        </thead>
        <tbody>
          {data.items.map((client) => (
            <tr key={client.id}>
              <td>
                <Link href={`/content/client/${client.id}`}>{client.name}</Link>
              </td>
              <td>{client.company}</td>
              <td>{client.country}</td>
              <td>
                <span className={`badge ${client.status}`}>
                  {client.status}
                </span>
              </td>
              <td>{new Date(client.createdAt).toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.items.length === 0 && <p>No clients match.</p>}

      <div className="row">
        <button
          disabled={data.page <= 1}
          onClick={() => setParams({ page: String(data.page - 1) })}
        >
          Prev
        </button>
        <span>
          Page {data.page} of {data.totalPages}
        </span>
        <button
          disabled={data.page >= data.totalPages}
          onClick={() => setParams({ page: String(data.page + 1) })}
        >
          Next
        </button>
      </div>
    </>
  );
}
