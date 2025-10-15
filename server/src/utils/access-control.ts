import { Role } from "@prisma/client"
import { ROLE_DEFAULT_PERMISSIONS, PERMISSIONS, ROLE_HIERARCHY, ResourceKey, checkPermissions } from "~/utils/permissions"
import { db } from "./db"

type MembershipRow = { scope: string; role: Role; permissions: string[] }
type EffectiveAccess = { role: Role | null; permissions: string[]; matchedScope: string | null }

class AccessControl {
  private fragment(kind: string, id: string) {
    return `${kind}:${String(id)}`
  }

  async buildScopeCandidatesLS(type: ResourceKey, id: string): Promise<{ candidates: string[]; orgId: string } | null> {
    if (type === "tasks") {
      // fetch task with its project (single DB call)
      const task = await db.task.findUnique({ where: { id }, include: { project: { select: { id: true, organizationId: true } } } })
      if (!task || !task.project) return null
      const orgId = task.project.organizationId
      const orgScope = this.fragment("organization", orgId)
      const projectScope = `${orgScope}/${this.fragment("project", task.project.id)}`
      const taskScope = `${projectScope}/${this.fragment("task", task.id)}`
      return { candidates: [orgScope, projectScope, taskScope], orgId }
    }

    if (type === "projects") {
      const project = await db.project.findUnique({ where: { id }, select: { id: true, organizationId: true } })
      if (!project) return null
      const orgId = project.organizationId
      const orgScope = this.fragment("organization", orgId)
      const projectScope = `${orgScope}/${this.fragment("project", project.id)}`
      return { candidates: [orgScope, projectScope], orgId }
    }

    if (type === "organizations") {
      const org = await db.organization.findUnique({ where: { id }, select: { id: true } })
      if (!org) return null
      const orgScope = this.fragment("organization", org.id)
      return { candidates: [orgScope], orgId: org.id }
    }

    // If you need other resource types (invitations, collaborations, subscriptions, users),
    // implement their scoping logic here.
    return null
  }

  // Fetch memberships for the candidate scopes in a single query, return ordered by candidates (least -> most specific)
  async fetchMembershipsForScopes(userId: string, candidateScopes: string[]): Promise<MembershipRow[]> {
    if (!candidateScopes || candidateScopes.length === 0) return []
    const rows = await db.collaboration.findMany({ where: { userId, scope: { in: candidateScopes } }, select: { scope: true, role: true, permissions: true } })
    const byScope = new Map(rows.map(r => [r.scope, r]))
    // preserve candidate order, filter missing
    return candidateScopes.map(s => byScope.get(s)).filter(Boolean) as MembershipRow[]
  }

  // Combines memberships -> effective access (highest role wins, permissions unioned)
  computeEffectiveAccess(memberships: MembershipRow[]): EffectiveAccess {
    if (!memberships || memberships.length === 0) return { role: null, permissions: [], matchedScope: null }

    let highestRole: Role | null = null
    let highestVal = 0
    const permSet = new Set<string>()

    for (const m of memberships) {
      const defaults = ROLE_DEFAULT_PERMISSIONS[m.role] ?? []
      // if role default has wildcard -> immediate admin-like access
      if (defaults.includes(PERMISSIONS.all)) {
        return { role: m.role, permissions: [PERMISSIONS.all], matchedScope: m.scope }
      }
      for (const p of defaults) permSet.add(p)
      for (const p of m.permissions || []) permSet.add(p)

      const v = ROLE_HIERARCHY[m.role] ?? 0
      if (v > highestVal) {
        highestVal = v
        highestRole = m.role
      }
    }

    const matchedScope = memberships[memberships.length - 1].scope // most specific found
    return { role: highestRole, permissions: Array.from(permSet), matchedScope }
  }

  roleSatisfies(requiredRole: Role | string, foundRole: Role | string | null) {
    if (!foundRole) return false
    const foundVal = ROLE_HIERARCHY[String(foundRole)] ?? 0
    const requiredVal = ROLE_HIERARCHY[String(requiredRole)] ?? 0
    return foundVal >= requiredVal
  }

  /**
   * Returns true if userId is the owner of the organization identified by orgId.
   * Assumes Organization.ownerId exists in your schema.
   */
  async isOrgOwner(userId: string, orgId: string) {
    const org = await db.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } })
    if (!org) return false
    return org.ownerId === userId
  }

  private buildScopeAncestors(scope: string): string[] {
    if (!scope) return []
    const parts = scope.split("/")
    const out: string[] = []
    for (let i = 0; i < parts.length; i++) {
      out.push(parts.slice(0, i + 1).join("/"))
    }
    return out
  }

  async canCreateCollaboration(requesterId: string, targetUserId: string, scope: string): Promise<string | null> {
    // 1) Build candidate scopes (least -> most specific)
    const ancestors = this.buildScopeAncestors(scope)
    if (ancestors.length === 0) return "Invalid scope!"

    // 2) authorize requester by checking their memberships on the ancestor chain
    const requesterMemberships = await this.fetchMembershipsForScopes(requesterId, ancestors)
    const requesterEff = this.computeEffectiveAccess(requesterMemberships)
    const isAdmin = requesterEff.role ? (ROLE_HIERARCHY[String(requesterEff.role)] ?? 0) >= (ROLE_HIERARCHY["admin"] ?? 0) : false
    const hasManageUsers = checkPermissions(requesterEff.permissions, [PERMISSIONS.manage_users])
    if (!isAdmin && !hasManageUsers) return "Caller lacks admin previliges!"

    // extract org from scope
    const scorg = scope.split("/")[0]

    // 3) Check for ANY existing collaboration for targetUserId:
    //    - exact (scope)
    //    - ancestor (any element of ancestors)
    //    - descendant (scope OR startsWith scope + "/")
    //
    // We'll perform a single DB query that returns any matches:
    const rows = await db.collaboration.findMany({ where: { userId: targetUserId, scope: { startsWith: scorg } }, select: { scope: true }, take: 1 })

    if (rows.length > 0) {
      // Conflict found (exact / ancestor / descendant) — do not create
      return "Collaboration found!"
    }

    // No conflict found and requester authorized => safe to create
    return null
  }

  async updateCollaborationAccess(requesterId: string, targetUserId: string, scope: string, patch: { role?: Role; permissions?: string[] }, options?: { allowCreateIfMissing?: boolean }) {
    if (!patch || (patch.role === undefined && patch.permissions === undefined)) {
      return "Noting to delete!"
    }

    // 1) build ancestors to authorize the requester (same as creation)
    const ancestors = this.buildScopeAncestors(scope)
    if (ancestors.length === 0) return "Invalid scope!"

    const requesterMemberships = await this.fetchMembershipsForScopes(requesterId, ancestors)
    const requesterEff = this.computeEffectiveAccess(requesterMemberships)
    const isAdmin = requesterEff.role ? (ROLE_HIERARCHY[String(requesterEff.role)] ?? 0) >= (ROLE_HIERARCHY["admin"] ?? 0) : false
    const hasManageUsers = checkPermissions(requesterEff.permissions, [PERMISSIONS.manage_users])
    if (!isAdmin && !hasManageUsers) return "Caller lacks admin previliges!"

    // 2) Try to find an existing collaboration at the exact scope for the target user
    // Assumes you have a unique([userId, scope]) constraint — otherwise use findFirst
    const existing = await db.collaboration.findUnique({ where: { userId_scope: { userId: targetUserId, scope } } }).catch(() => null) // in case unique constraint name differs, fallback to findFirst

    let collab = existing ?? null

    if (!collab) {
      // not found
      if (!options?.allowCreateIfMissing) return "Collaboration not found at exact scope"

      // If allowing create, ensure there are NO ancestor/descendant/exact conflicts.
      const safe = await this.canCreateCollaboration(requesterId, targetUserId, scope)
      if (!safe) return "Cannot create - conflicting collaboration exists (ancestor/descendant/exact)"

      // create the collaboration
      collab = await db.collaboration.create({ data: { userId: targetUserId, scope, role: patch.role ?? "member", permissions: patch.permissions ?? [] } })
      return collab
    }

    // 3) Update the existing collaboration (exact scope)
    await db.collaboration.update({
      where: { id: collab.id },
      data: {
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        ...(patch.permissions !== undefined ? { permissions: patch.permissions } : {}),
        updatedAt: new Date(),
      },
    })

    return null
  }
}

export default new AccessControl()
