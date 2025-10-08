import { NextFunction, Request, Response } from "express"
import { ExpressError } from "./error"
import jwt from "jsonwebtoken"
import { env } from "~/utils/env"
import { SessionUserType } from "~/@types/express"
import { session } from "~/utils/session"
import { Permission, Role } from "@prisma/client"
import { db } from "~/utils/db"
import { LIMITS } from "~/utils/constants"

const verifyAuth = async (req: Request, _res: Response, next: NextFunction) => {
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

const verifyPermissions = (role: Role, permissions: Permission[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) throw new ExpressError({ code: "UNAUTHORIZED", message: "Unauthorized access - Log in to access the resource!!" })

    const org = req.body.org || req.params.org
    if (!org) throw new ExpressError({ code: "BAD_REQUEST", message: "Organization ID missing!!" })

    const collaborator = user.collaborations.find(c => c.organizationId === org)
    if (!collaborator) throw new ExpressError({ code: "FORBIDDEN", message: "You don't have permission to access this resource!!" })

    if (collaborator.role !== role) throw new ExpressError({ code: "FORBIDDEN", message: `You must be a ${role} to access this resource!!` })

    const hasPermissions = permissions.every(p => collaborator.permissions.includes(p))
    if (!hasPermissions) throw new ExpressError({ code: "FORBIDDEN", message: "Not enough permissions to access this resource!!" })

    next()
  }
}

const verifyTierLimit = (resource: keyof typeof LIMITS.FREE) => {
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

const verifyRefresh = async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies["Refresh-Token"]
  if (!token) throw new ExpressError({ code: "BAD_REQUEST", message: "Refresh token missing!!" })

  jwt.verify(token as string, env.JWT_REFRESH_SECRET, function (err, user) {
    if (err) throw new ExpressError({ code: "BAD_REQUEST", message: "Invalid refresh token!!" })
    req.user = user as SessionUserType
    next()
  })
}

export { verifyAuth, verifyPermissions, verifyTierLimit, verifyRefresh }
