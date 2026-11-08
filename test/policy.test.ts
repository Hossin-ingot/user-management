import { beforeEach, describe, expect, it } from "vitest";
import {
  allowedActionsOn,
  authorizeUserUpdate,
  canAccessUserManagement,
  canCreateUser,
  canViewContent,
  filterVisibleUsers,
} from "@/server/auth/policy";
import { User } from "@/types/Models";
import { Role } from "@/types/Roles";
import { getStore, resetStore } from "@/data/store";

let users: User[];
const get = (id: string): User => {
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error(`seed user ${id} missing`);
  return u;
};

beforeEach(() => {
  resetStore();
  users = [...getStore().users.values()];
});

describe("role matrix (read literally, not hierarchically)", () => {
  it("IT manages users but cannot view content", () => {
    const ivan = get("u-ivan");
    expect(canCreateUser(ivan)).toBe(true);
    expect(canAccessUserManagement(ivan)).toBe(true);
    expect(canViewContent(ivan)).toBe(false);
  });

  it("manager views content and manages only direct reports", () => {
    const anna = get("u-anna");
    expect(canViewContent(anna)).toBe(true);
    expect(canCreateUser(anna)).toBe(false);
    expect(filterVisibleUsers(anna, users).map((u) => u.id).sort()).toEqual(
      ["u-iryna", "u-maksym", "u-olena", "u-yulia"],
    );
  });

  it("user views content only", () => {
    const olena = get("u-olena");
    expect(canViewContent(olena)).toBe(true);
    expect(canAccessUserManagement(olena)).toBe(false);
    expect(filterVisibleUsers(olena, users)).toEqual([]);
  });
});

describe("rule 2: manager edits name/email of direct reports only", () => {
  const anna = () => get("u-anna");

  it.each([
    ["their direct report", "u-olena", true],
    ["another manager's report", "u-dmytro", false],
    ["another manager", "u-bohdan", false],
    ["themselves", "u-anna", false],
    ["an unassigned user", "u-roman", false],
  ])("%s (%s) → allowed=%s", (_label, targetId, expected) => {
    const decision = authorizeUserUpdate(anna(), get(targetId), { fullName: "Changed" }, users);
    expect(decision.allowed).toBe(expected);
  });

  it("cannot change role, status or manager even of a direct report", () => {
    const olena = get("u-olena");
    for (const patch of [{ role: Role.Manager }, { status: "deactivated" as const }, { managerId: null }]) {
      const d = authorizeUserUpdate(anna(), olena, patch, users);
      expect(d.allowed).toBe(false);
    }
  });

  it("re-sending an unchanged role alongside a name edit is not a role change", () => {
    const olena = get("u-olena");
    const d = authorizeUserUpdate(anna(), olena, { fullName: "New", role: olena.role }, users);
    expect(d.allowed).toBe(true);
  });
});

describe("rules 3 & 4: self-lockout and last administrator", () => {
  it("IT cannot deactivate or change the role of their own account", () => {
    const ivan = get("u-ivan");
    for (const patch of [{ status: "deactivated" as const }, { role: Role.Manager }]) {
      const d = authorizeUserUpdate(ivan, ivan, patch, users);
      expect(d).toMatchObject({ allowed: false, denials: [{ code: "SELF_LOCKOUT" }] });
    }
  });

  it("IT may still edit their own name (only role/status are locked)", () => {
    const ivan = get("u-ivan");
    expect(authorizeUserUpdate(ivan, ivan, { fullName: "Ivan K." }, users).allowed).toBe(true);
  });

  it("demoting or deactivating the last active IT fails with LAST_ADMINISTRATOR", () => {
    const sofia = get("u-sofia");
    const withSofiaGone = users.map((u) => (u.id === "u-ivan" ? { ...u, status: "deactivated" as const } : u));
    for (const patch of [{ status: "deactivated" as const }, { role: Role.User }]) {
      const d = authorizeUserUpdate({ ...sofia, id: "u-ghost-admin" }, sofia, patch, withSofiaGone);
      expect(d).toMatchObject({ allowed: false, denials: [{ code: "LAST_ADMINISTRATOR" }] });
    }
  });

  it("the last IT acting on themselves gets BOTH reasons, last-admin first", () => {
    const ivan = get("u-ivan");
    const onlyIvan = users.map((u) => (u.id === "u-sofia" ? { ...u, status: "deactivated" as const } : u));
    const d = authorizeUserUpdate(ivan, ivan, { status: "deactivated" }, onlyIvan);
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.denials.map((x) => x.code)).toEqual(["LAST_ADMINISTRATOR", "SELF_LOCKOUT"]);
  });
});

describe("UI hint flags come from the same policy", () => {
  it("Anna gets edit-profile on reports and nothing else", () => {
    expect(allowedActionsOn(get("u-anna"), get("u-olena"))).toEqual({
      editProfile: true,
      changeRole: false,
      changeStatus: false,
      assignManager: false,
    });
    expect(allowedActionsOn(get("u-anna"), get("u-dmytro")).editProfile).toBe(false);
  });
});
