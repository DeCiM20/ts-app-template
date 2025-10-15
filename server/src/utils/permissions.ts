import { Role } from "@prisma/client"

export const TIER_LIMITS = { free: { organizations: 5, calls: 10_000 }, pro: { organizations: 10, calls: 100_000 }, enterprise: { organizations: 1000, calls: 10_00_000 } } as const

export type Permission = string

export const Action = { read: "read", write: "write", create: "create", delete: "delete", manage: "manage" } as const

export type ActionKey = keyof typeof Action

export const Resource = { tasks: "tasks", projects: "projects", organizations: "organizations", invitations: "invitations", collaborations: "collaborations", subscriptions: "subscriptions", users: "users" } as const

export type ResourceKey = keyof typeof Resource

/** Build a canonical permission token "action:resource" (lowercase) */
export const makePermission = (action: ActionKey | string, resource: ResourceKey | string): Permission => `${action}:${resource}`

export const PERMISSIONS = {
  // tasks
  read_tasks: makePermission(Action.read, Resource.tasks),
  write_tasks: makePermission(Action.write, Resource.tasks),
  create_tasks: makePermission(Action.create, Resource.tasks),
  delete_tasks: makePermission(Action.delete, Resource.tasks),

  // projects
  read_projects: makePermission(Action.read, Resource.projects),
  write_projects: makePermission(Action.write, Resource.projects),
  create_projects: makePermission(Action.create, Resource.projects),
  delete_projects: makePermission(Action.delete, Resource.projects),

  // organizations
  read_organizations: makePermission(Action.read, Resource.organizations),
  write_organizations: makePermission(Action.write, Resource.organizations),
  manage_organizations: makePermission(Action.manage, Resource.organizations),

  // invitations & collaborations
  manage_invitations: makePermission(Action.manage, Resource.invitations),
  manage_collaborations: makePermission(Action.manage, Resource.collaborations),

  // subscriptions & users
  manage_subscriptions: makePermission(Action.manage, Resource.subscriptions),
  manage_users: makePermission(Action.manage, Resource.users),

  // wildcard (admin convenience to mean "all permissions")
  all: "*",
} as const

export type PermissionToken = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const PERMISSION_LIST: Permission[] = Object.values(PERMISSIONS) as Permission[]

export const PERMISSIONS_BY_RESOURCE: Record<ResourceKey, Permission[]> = {
  [Resource.tasks]: [PERMISSIONS.read_tasks, PERMISSIONS.write_tasks, PERMISSIONS.create_tasks, PERMISSIONS.delete_tasks],
  [Resource.projects]: [PERMISSIONS.read_projects, PERMISSIONS.write_projects, PERMISSIONS.create_projects, PERMISSIONS.delete_projects],
  [Resource.organizations]: [PERMISSIONS.read_organizations, PERMISSIONS.write_organizations, PERMISSIONS.manage_organizations],
  [Resource.invitations]: [PERMISSIONS.manage_invitations],
  [Resource.collaborations]: [PERMISSIONS.manage_collaborations],
  [Resource.subscriptions]: [PERMISSIONS.manage_subscriptions],
  [Resource.users]: [PERMISSIONS.manage_users],
}

/**
 * Role -> default permissions mapping.
 * Keep in code for discoverability, or swap to a DB table + cache if you want runtime edit.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.admin]: [PERMISSIONS.all], // wildcard for admin
  [Role.project_admin]: [...PERMISSIONS_BY_RESOURCE.tasks, ...PERMISSIONS_BY_RESOURCE.projects],
  [Role.member]: [PERMISSIONS.read_tasks, PERMISSIONS.read_projects, PERMISSIONS.read_organizations],
}

/** Validate a permission token exists in the central list (or is wildcard "*") */
export function isValidPermission(p: string): boolean {
  if (p === PERMISSIONS.all) return true
  return PERMISSION_LIST.includes(p as Permission)
}

export function checkPermissions(effectivePerms: Permission[], requiredPerms: Permission[] = []): boolean {
  if (!requiredPerms || requiredPerms.length === 0) return true
  if (!effectivePerms || effectivePerms.length === 0) return false
  if (effectivePerms.includes(PERMISSIONS.all)) return true
  const s = new Set(effectivePerms)
  return requiredPerms.every(rp => s.has(rp))
}

export const ROLE_HIERARCHY: Record<string, number> = { member: 1, project_admin: 2, admin: 3 }
