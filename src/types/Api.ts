import { User } from "./Models";

export interface MeResponse {
  user: User;
  managerName: string | null;
  roleLabel: string;
}