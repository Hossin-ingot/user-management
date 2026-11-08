import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="card">
      <h1>403 — Forbidden</h1>
      <p>You are logged in, but your role does not have access to this page.</p>
      <Link href="/">Go to your home page</Link>
    </div>
  );
}
