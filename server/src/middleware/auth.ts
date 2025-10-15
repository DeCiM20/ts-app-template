import { NextFunction, Request, Response } from "express"
import { ExpressError } from "./error"
import jwt from "jsonwebtoken"
import { env } from "~/utils/env"
import { SessionUserType } from "~/@types/express"
import { session } from "~/utils/session"
import { Role } from "@prisma/client"
import { db } from "~/utils/db"
import { TIER_LIMITS, ResourceKey, PermissionToken, checkPermissions } from "~/utils/permissions"
import ac from "~/utils/access-control"

class VerifyAccess {
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

  permissions(type: ResourceKey, role: Role, permissions: PermissionToken[] = []) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user
      if (!user) throw new ExpressError({ code: "UNAUTHORIZED", message: "Unauthorized access - Log in to access the resource!!" })

      const resource: string | undefined = req.body.id ?? req.params.id ?? req.query.id
      if (!resource) throw new ExpressError({ code: "BAD_REQUEST", message: "Missinng resource id!" })

      const built = await ac.buildScopeCandidatesLS(type, resource)
      if (!built) throw new ExpressError({ code: "BAD_REQUEST", message: `Resource not found for type='${type}' id='${resource}'` })
      const { candidates, orgId } = built

      const owner = await ac.isOrgOwner(user.id, orgId)
      if (owner) return next()

      // Otherwise, fetch memberships and compute effective permissions as before
      const memberships = await ac.fetchMembershipsForScopes(user.id, candidates)
      if (memberships.length === 0) throw new ExpressError({ code: "FORBIDDEN", message: "No collaboration found!" })

      const { role: effectiveRole, permissions: effectivePerms } = ac.computeEffectiveAccess(memberships)

      const hasRole = ac.roleSatisfies(role, effectiveRole)
      if (!hasRole) throw new ExpressError({ code: "FORBIDDEN", message: "Insufficient permissions!" })

      const hasPermissions = checkPermissions(effectivePerms, permissions)
      if (!hasPermissions) throw new ExpressError({ code: "FORBIDDEN", message: "Insufficient permissions!" })

      return next()
    }
  }

  tier(resource: keyof typeof TIER_LIMITS.free) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const user = req.user
      if (!user) throw new ExpressError({ code: "UNAUTHORIZED", message: "Unauthorized access - Log in to access the resource!!" })

      if (resource === "organizations") {
        const count = await db.organization.count({ where: { ownerId: user.id } })
        const allowed = TIER_LIMITS[user.subscription ? user.subscription.plan : "free"].organizations
        if (count >= allowed) throw new ExpressError({ code: "FORBIDDEN", message: "Limit Exceeded!" })
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
