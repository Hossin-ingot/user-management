import "server-only";
import type { Client, ClientStatus } from "@/types/Models";

function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Alex", "Maria", "John", "Sofia", "Liam", "Emma", "Noah", "Olivia", "Lucas", "Mia",
  "Ethan", "Ava", "Mateo", "Zoe", "Leo", "Nora", "Omar", "Layla", "Yuki", "Hana",
  "Andrei", "Elena", "Karim", "Lina", "Diego", "Clara", "Felix", "Ines", "Tariq", "Nadia",
] as const;

const LAST_NAMES = [
  "Smith", "Garcia", "Müller", "Rossi", "Kowalski", "Novak", "Haddad", "Tanaka", "Silva",
  "Dubois", "Jensen", "Petrenko", "Costa", "Nguyen", "Kaya", "Ivanova", "Larsen", "Moreau",
  "Schmidt", "Khoury", "Ortiz", "Popescu", "Fischer", "Andersson", "Romano",
] as const;

const COMPANY_PREFIXES = [
  "Blue", "North", "Bright", "Iron", "Silver", "Green", "Swift", "Prime", "Atlas", "Nova",
  "Summit", "Harbor", "Pixel", "Quantum", "Cedar", "Orbit",
] as const;

const COMPANY_SUFFIXES = [
  "Labs", "Logistics", "Systems", "Foods", "Capital", "Media", "Health", "Works",
  "Analytics", "Retail", "Energy", "Studio",
] as const;

const COUNTRIES = [
  "Cyprus", "Ukraine", "Germany", "France", "Spain", "Italy", "Poland", "United Kingdom",
  "United States", "Canada", "Brazil", "Japan", "Lebanon", "UAE", "Netherlands", "Sweden",
] as const;

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick() called with an empty list");
  return item;
}

export const CLIENT_COUNT = 1_250;
const CHURN_RATE = 0.3;
const SEED = 20_261_106;
const EPOCH = Date.UTC(2026, 0, 1);
const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

export function generateClients(count: number = CLIENT_COUNT): Client[] {
  const rng = createRng(SEED);
  const clients: Client[] = [];

  for (let i = 1; i <= count; i++) {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const company = `${pick(rng, COMPANY_PREFIXES)} ${pick(rng, COMPANY_SUFFIXES)}`;
    const status: ClientStatus = rng() < CHURN_RATE ? "churned" : "active";
    const domain = company.toLowerCase().replace(/[^a-z]+/g, "");

    clients.push({
      id: `cl-${String(i).padStart(4, "0")}`,
      name: `${first} ${last}`,
      company,
      email: `${first}.${last}.${i}@${domain}.example`.toLowerCase(),
      country: pick(rng, COUNTRIES),
      status,
      createdAt: new Date(EPOCH - Math.floor(rng() * THREE_YEARS_MS)).toISOString(),
    });
  }

  return clients;
}
