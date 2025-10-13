export enum EntityType {
  ORGANIZATION = "ORGANIZATION",
  PROJECT = "PROJECT",
}
export const LIMITS = { FREE: { organizations: 5, calls: 10_000 }, PRO: { organizations: 10, calls: 100_000 }, ENTERPRISE: { organizations: 1000, calls: 10_00_000 } } as const

// Permissions scoped per entity type
export const EntityPermissions = {
  [EntityType.ORGANIZATION]: ["read:organization", "write:organization", "write:projects", "write:users", "read:analytics", "read:projects", "read:users"] as const,
  [EntityType.PROJECT]: ["write:project", "read:project"] as const,
} as const

export const LEVELS = Object.keys(EntityPermissions)

type PermissionsMap = typeof EntityPermissions

// PermissionFor<T> is the union of literal strings for the entity T
export type PermissionFor<T extends EntityType> = T extends keyof PermissionsMap ? PermissionsMap[T][number] : never
