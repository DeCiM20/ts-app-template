import jwt from "jsonwebtoken"
import { env } from "~/utils/env"
import rc from "~/middleware/redis"
import { v4 as uuid } from "uuid"
import { Collaborator, Organization, Subscription, User } from "@prisma/client"
import { db } from "./db"
import { SessionUserType } from "~/@types/express"

const ACCESS_TOKEN_EXPIRY = 24 * 60 * 60 // 1 Days in seconds
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 // 30 Days in seconds

type CookieConfigType = {
  sameSite: boolean | "strict" | "lax" | "none" | undefined
  maxAge: number
  httpOnly: boolean
  secure: boolean
  path: string
}

interface CookieConfig {
  access: CookieConfigType
  refresh: CookieConfigType
}

export const COOKIE_CONFIG: CookieConfig = {
  access: {
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_EXPIRY * 1000, // In milliseconds
    httpOnly: false,
    secure: false,
    path: "/api",
  },
  refresh: {
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_EXPIRY * 1000, // In milliseconds
    httpOnly: false,
    secure: false,
    path: "/api/auth/refresh",
  },
}

interface TokenType {
  sid: string
}

interface SessionType {
  sid: string
  user: SessionUserType
  accessToken: string
  refreshToken: string
  expiresAt: number
}

class SessionManager {
  async read(token: string): Promise<SessionType> {
    return new Promise((res, rej) => {
      if (!token) return rej("Expired")
      jwt.verify(token, env.JWT_ACCESS_SECRET, async function (err, payload) {
        if (err) {
          if (err.name === "TokenExpiredError") return rej("Expired")
          return rej("Invalid")
        }

        const decoded = payload as TokenType
        const sid = decoded.sid
        const _session = await rc.get(`sess:${sid}`)
        if (!_session) return rej("Invalid")
        const sp = JSON.parse(_session) as SessionType
        return res(sp)
      })
    })
  }

  async create(user: SessionUserType) {
    const sid = uuid()
    const payload: TokenType = { sid }
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })

    const sp: SessionType = { sid, user, accessToken, refreshToken, expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY } // session payload

    await rc.set(`sess:${sid}`, JSON.stringify(sp), { EX: REFRESH_TOKEN_EXPIRY })
    return { accessToken, refreshToken }
  }

  async update(sid: string) {
    const _session = await rc.get(`sess:${sid}`)
    if (!_session) throw Error("Session not found")

    const data = JSON.parse(_session) as SessionType
    const user = await db.user.findUnique({ where: { id: data.user.id }, include: { collaborations: true, organizations: true, subscriptions: true } })
    if (!user) throw Error("User not found!")
    data.user = user

    await rc.set(`sess:${sid}`, JSON.stringify(data), { KEEPTTL: true })
  }

  async refresh(ref: string) {
    const decoded = jwt.verify(ref, env.JWT_REFRESH_SECRET) as TokenType
    const _session = await rc.get(decoded.sid)

    if (!_session) throw new Error("No active session found!")
    const payload = JSON.parse(_session) as SessionType

    if (payload.refreshToken !== ref) {
      await rc.del(`sess:${decoded.sid}`) // token mismatch - delete session
      return { accessToken: "", refreshToken: "" }
    }

    const _accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
    const _refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })

    payload.accessToken = _accessToken
    payload.refreshToken = _refreshToken
    await rc.set(`sess:${decoded.sid}`, JSON.stringify(payload), { EX: REFRESH_TOKEN_EXPIRY })

    return { accessToken: _accessToken, refreshToken: _refreshToken }
  }

  async destroy(token: string) {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenType
    const sid = decoded.sid
    await rc.del(`sess:${sid}`)
    return { accessToken: "", refreshToken: "" }
  }
}

export const session = new SessionManager()
