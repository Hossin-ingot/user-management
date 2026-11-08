import { Role } from "./Roles";

export type UserStatus = "active" | "deactivated";
export type ClientStatus = "active" | "churned";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  managerId: string | null;
  createdAt: string;
}

export interface Credential {
  userId: string;
  password: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  country: string;
  status: ClientStatus;
  createdAt: string;
}