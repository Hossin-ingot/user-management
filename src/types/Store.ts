import type { Client, User, Credential } from "./Models";
import { Session } from "./Session";

export interface Store {
  users: Map<string, User>;
  credentials: Map<string, Credential>;
  clients: Client[];
  clientsById: Map<string, Client>;
  sessions: Map<string, Session>;
}