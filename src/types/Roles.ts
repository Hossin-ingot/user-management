export const Role = {
  IT: "IT",
  Manager: "manager",
  User: "user",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export type Scope = "all" | "directReports" | "none";

export interface RoleDefinition {
  label: string;
  landingPath: string;
  canHaveReports: boolean;
  can: {
    viewUsers: Scope;
    createUser: boolean;
    editProfile: Scope;
    changeRole: boolean;
    changeStatus: boolean;
    assignManager: boolean;
    viewContent: boolean;
  };
}

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  [Role.IT]: {
    label: "IT",
    landingPath: "/manage-users",
    canHaveReports: false,
    can: {
      viewUsers: "all",
      createUser: true,
      editProfile: "all",
      changeRole: true,
      changeStatus: true,
      assignManager: true,
      viewContent: false,
    },
  },
  [Role.Manager]: {
    label: "Manager",
    landingPath: "/content",
    canHaveReports: true,
    can: {
      viewUsers: "directReports",
      createUser: false,
      editProfile: "directReports",
      changeRole: false,
      changeStatus: false,
      assignManager: false,
      viewContent: true,
    },
  },
  [Role.User]: {
    label: "User",
    landingPath: "/content",
    canHaveReports: false,
    can: {
      viewUsers: "none",
      createUser: false,
      editProfile: "none",
      changeRole: false,
      changeStatus: false,
      assignManager: false,
      viewContent: true,
    },
  },
};

export const ROLES: readonly Role[] = Object.values(Role);