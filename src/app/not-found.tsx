import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card">
      <h1>404 — Not found</h1>
      <Link href="/">Go to your home page</Link>
    </div>
  );
}
