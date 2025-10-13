import { NextFunction, Request, Response } from "express"
import { ExpressError } from "./error"
import jwt from "jsonwebtoken"
import { env } from "~/utils/env"
import { SessionUserType } from "~/@types/express"
import { session } from "~/utils/session"
import { Role } from "@prisma/client"
import { db } from "~/utils/db"
import { EntityType, LEVELS, LIMITS, PermissionFor } from "~/utils/constants"

class VerifyAccess {
  private roleSatisfies(initial: Role, required: Role) {
    if (initial === required) return true
    if (initial === Role.ADMIN && required === Role.MEMBER) return true
    return false
  }

  private hasRequiredPermissions(initial: string[] | null | undefined, required: string[]) {
    if (!initial) return false
    return required.every(p => initial.includes(p))
  }

  private async resolvePartsFromRequest(req: Request) {
    // prefer explicit fields if both provided
    const org: string | undefined = req.body.organization ?? req.params.organization ?? req.query.organization
    const proj: string | undefined = req.body.project ?? req.params.project ?? req.query.project

    // If both present, return directly
    if (org && proj) return [String(org), String(proj)]

    // If only project provided, resolve its organization on server
    if (proj && !org) {
      const project = await db.project.findUnique({ where: { id: String(proj) }, select: { organizationId: true } })
      if (!project) throw new ExpressError({ code: "NOT_FOUND", message: "Project not found" })
      return [project.organizationId, String(proj)]
    }

    // If only org provided, return that
    if (org && !proj) return [String(org)]

    return [] // no usable ids
  }

  /** build ancestors but limit to maxParts (1-based). parts = ['org','proj','task'] */
  private buildAncestorsLimited(parts: string[], maxParts: number) {
    const out: string[][] = []
    // clamp maxParts to parts.length
    const max = Math.min(parts.length, maxParts)
    for (let i = max; i >= 1; i--) {
      out.push(parts.slice(0, i))
    }
    return out // nearest-first
  }

  /** join helper for map keys */
  private keyForParts(parts: string[]) {
    return parts.join("/")
  }

  async auth(req: Request, _res: Response, next: NextFunction) {
    try {
      const token = req.cookies["Access-Token"]
      const payload = await session.read(token)
      req.user = payload.user as SessionUserType
      req.sid = payload.sid
      next()
    } catch (e) {
      console.error(e)
      if (e === "Expired") throw new ExpressError({ code: "SESSION_EXPIRED", message: "Session expired - refresh the token to continue!" })
      throw new ExpressError({ code: "UNAUTHORIZED", message: "Unauthorized access - Log in to access the resource!!" })
    }
  }

  permissions<T extends EntityType>(type: T, role: Role, permissions: PermissionFor<T>[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user
      if (!user) throw new ExpressError({ code: "UNAUTHORIZED", message: "Unauthorized access - Log in to access the resource!!" })

      const requiredLevel: number = LEVELS.indexOf(type)

      const parts = await this.resolvePartsFromRequest(req)
      if (parts.length === 0) throw new ExpressError({ code: "BAD_REQUEST", message: "Entity ID(s) missing!!" })

      const orgId = parts[0] // first part is org
      if (orgId) {
        const org = await db.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } })
        if (org && org.ownerId === user.id) {
          return next() // org owner bypass
        }
      }

      // Build allowed ancestors but limited to the requested level (do not check deeper scopes)
      // Example: if parts = ['org','proj','task'] and requiredLevel = 1 (org), buildAncestorsLimited returns [['org']]
      const ancestors = this.buildAncestorsLimited(parts, requiredLevel) // nearest-first but truncated
      if (ancestors.length === 0) throw new ExpressError({ code: "FORBIDDEN", message: "You don't have permission to access this resource!!" })

      // Build Prisma OR conditions for exact array equality on scope
      const orc = ancestors.map(arr => ({ scope: { equals: arr } }))

      // needs top level/upper level check for access (If we ask for project level access then someone with org level should be able to access)
      const collaborations = await db.collaboration.findMany({ where: { userId: user.id, OR: orc }, select: { scope: true, role: true, permissions: true } })
      if (collaborations.length === 0) throw new ExpressError({ code: "FORBIDDEN", message: "You don't have permission to access this resource!!" })

      // Create a lookup map keyed by scope string for fast access

      const collabMap = new Map<string, { role: Role; permissions: string[] }>()
      for (const c of collaborations) {
        collabMap.set(this.keyForParts(c.scope), { role: c.role, permissions: c.permissions ?? [] })
      }

      // Evaluate nearest-first: the first ancestor that satisfies role+permissions grants access.
      for (const ancParts of ancestors) {
        const k = this.keyForParts(ancParts)
        const coll = collabMap.get(k)
        if (!coll) continue // no collaboration at this ancestor -> check parent

        // role precedence check (ADMIN >= MEMBER)
        if (!this.roleSatisfies(coll.role, role)) {
          // insufficient role at this ancestor; continue upward (org may grant)
          continue
        }

        // permission check (all requiredPermissions must be present)
        // insufficient permissions at this ancestor; continue upward
        if (!this.hasRequiredPermissions(coll.permissions, permissions)) continue
        // satisfied at this ancestor -> allow
        return next()
      }

      // final deny
      throw new ExpressError({ code: "FORBIDDEN", message: "Not enough permissions to access this resource!!" })
    }
  }

  tier(resource: keyof typeof LIMITS.FREE) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user
      if (!user) throw new ExpressError({ code: "UNAUTHORIZED", message: "Unauthorized access - Log in to access the resource!!" })

      if (resource === "organizations") {
        const count = await db.organization.count({ where: { ownerId: user.id } })
        if (count >= LIMITS[user.subscription ? user.subscription.plan : "FREE"].organizations) throw new ExpressError({ code: "FORBIDDEN", message: "Limit Exceeded!" })
      }

      next()
    }
  }

  async refresh(req: Request, _res: Response, next: NextFunction) {
    const token = req.cookies["Refresh-Token"]
    if (!token) throw new ExpressError({ code: "BAD_REQUEST", message: "Refresh token missing!!" })

    jwt.verify(token as string, env.JWT_REFRESH_SECRET, function (err, user) {
      if (err) throw new ExpressError({ code: "BAD_REQUEST", message: "Invalid refresh token!!" })
      req.user = user as SessionUserType
      next()
    })
  }
}

export default new VerifyAccess()
