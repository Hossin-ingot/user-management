import { Store } from "@/types/Store";
import { generateClients } from "./client-generator";
import { seedCredentials, seedUsers } from "./seed";

function createStore(): Store {
  const clients = generateClients();
  return {
    users: new Map(seedUsers().map((u) => [u.id, u])),
    credentials: new Map(seedCredentials().map((c) => [c.userId, c])),
    clients,
    clientsById: new Map(clients.map((c) => [c.id, c])),
    sessions: new Map(),
  };
}

const globalForStore = globalThis as typeof globalThis & {
  __userMgmtStore?: Store;
};

export function getStore(): Store {
  globalForStore.__userMgmtStore ??= createStore();
  return globalForStore.__userMgmtStore;
}


export function resetStore(): void {
  globalForStore.__userMgmtStore = createStore();
}