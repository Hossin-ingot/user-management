import { User } from "./Models";
import { Role } from "./Roles";

export interface MeResponse {
  user: User;
  managerName: string | null;
  roleLabel: string;
}

export interface ManagedUser extends User {
  managerName: string | null;
  allowed: {
    editProfile: boolean;
    changeRole: boolean;
    changeStatus: boolean;
    assignManager: boolean;
  };
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: Role;
  password: string;
  managerId: string | null;
}

export interface ManageUsersResponse {
  users: ManagedUser[];
  meta: {
    canCreate: boolean;
    roleOptions: { value: Role; label: string }[];
    managerOptions: { id: string; fullName: string }[];
  };
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { code?: string; field?: string; message: string }[];
  };
}