import "server-only";
import type { User, Credential } from "@/types/Models";
import { Role } from "@/types/Roles";

export const SEED_PASSWORD = "password123";

const SEED_CREATED_AT = "2026-01-01T09:00:00.000Z";

type SeedUser = Omit<User, "createdAt">;

const SEED_USERS: readonly SeedUser[] = [
  { id: "u-ivan", fullName: "Ivan Kovalenko", email: "ivan@corp.test", role: Role.IT, status: "active", managerId: null },
  { id: "u-sofia", fullName: "Sofia Bondar", email: "sofia@corp.test", role: Role.IT, status: "active", managerId: null },
  { id: "u-anna", fullName: "Anna Shevchenko", email: "anna@corp.test", role: Role.Manager, status: "active", managerId: null },
  { id: "u-olena", fullName: "Olena Melnyk", email: "olena@corp.test", role: Role.User, status: "active", managerId: "u-anna" },
  { id: "u-maksym", fullName: "Maksym Tkachenko", email: "maksym@corp.test", role: Role.User, status: "active", managerId: "u-anna" },
  { id: "u-iryna", fullName: "Iryna Lysenko", email: "iryna@corp.test", role: Role.User, status: "active", managerId: "u-anna" },
  { id: "u-yulia", fullName: "Yulia Boyko", email: "yulia@corp.test", role: Role.User, status: "deactivated", managerId: "u-anna" },
  { id: "u-bohdan", fullName: "Bohdan Kravchenko", email: "bohdan@corp.test", role: Role.Manager, status: "active", managerId: null },
  { id: "u-dmytro", fullName: "Dmytro Savchenko", email: "dmytro@corp.test", role: Role.User, status: "active", managerId: "u-bohdan" },
  { id: "u-mark", fullName: "Mark Rudenko", email: "mark@corp.test", role: Role.Manager, status: "active", managerId: null },
  { id: "u-taras", fullName: "Taras Moroz", email: "taras@corp.test", role: Role.Manager, status: "deactivated", managerId: null },
  { id: "u-kateryna", fullName: "Kateryna Pavlenko", email: "kateryna@corp.test", role: Role.User, status: "active", managerId: "u-taras" },
  { id: "u-roman", fullName: "Roman Hnatiuk", email: "roman@corp.test", role: Role.User, status: "active", managerId: null },
];

export function seedUsers(): User[] {
  return SEED_USERS.map((u) => ({ ...u, createdAt: SEED_CREATED_AT }));
}

export function seedCredentials(): Credential[] {
  return SEED_USERS.map((u) => ({ userId: u.id, password: SEED_PASSWORD }));
}
