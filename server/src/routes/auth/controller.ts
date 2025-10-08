import { Request, Response } from "express"
import { z } from "zod"
import { zBodyParse } from "~/utils/z-parse"
import { ExpressError } from "~/middleware/error"
import { COOKIE_CONFIG, session } from "~/utils/session"
import { db } from "~/utils/db"
import { env } from "~/utils/env"

export const generate = async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email() })
  const { success, error, data: input } = zBodyParse(schema, req.body)
  if (!success || error) throw new ExpressError({ code: "BAD_REQUEST", message: "Invalid Inputs!!!", error: error })

  const exists = await db.user.findUnique({ where: { email: input.email }, select: { id: true } })
  if (!exists) await db.user.create({ data: { email: input.email } })

  const verification = await db.verification.findFirst({ where: { email: input.email } })
  if (verification) throw new ExpressError({ code: "UNAUTHORIZED", message: "Verification link already sent!!" })

  if (env.NODE_ENV === "development" && input.email === "root@gmail.com") {
    await db.verification.create({ data: { id: "randomuuid", email: input.email } })
  } else {
    await db.verification.create({ data: { email: input.email } })
  }

  return res.status(200).json({ success: true, message: "Code sent successfully!" })
}

export const verify = async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email(), code: z.string() })
  const { success, error, data: input } = zBodyParse(schema, req.params)
  if (!success || error) throw new ExpressError({ code: "BAD_REQUEST", message: "Invalid Inputs!!!", error: error })

  const verification = await db.verification.findFirst({ where: { email: input.email, id: input.code } })
  if (!verification) throw new ExpressError({ code: "UNAUTHORIZED", message: "Invalid credentials!!" })

  const user = await db.user.findFirst({ where: { email: input.email }, include: { collaborations: true, organizations: true, subscriptions: true } })
  if (!user) throw new ExpressError({ code: "UNAUTHORIZED", message: "User not found!" })

  const { accessToken, refreshToken } = await session.create({...user, subscription: user.subscriptions[0]})

  await db.verification.delete({ where: { id: verification.id } })

  res.cookie("Access-Token", accessToken, COOKIE_CONFIG.access)
  res.cookie("Refresh-Token", refreshToken, COOKIE_CONFIG.refresh)

  return res.status(200).json(user)
}

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies["Refresh-Token"]
  if (!token) throw new ExpressError({ code: "BAD_REQUEST", message: "Refresh token missing!!" })

  const { accessToken, refreshToken } = await session.refresh(token)

  res.cookie("Access-Token", accessToken, { ...COOKIE_CONFIG.access, maxAge: accessToken ? COOKIE_CONFIG.access.maxAge : 1 })
  res.cookie("Refresh-Token", refreshToken, { ...COOKIE_CONFIG.refresh, maxAge: refreshToken ? COOKIE_CONFIG.refresh.maxAge : 1 })

  if (!accessToken || !refreshToken) return res.status(403).json({ success: false, message: "Invalid request!" })

  return res.status(200).json({ success: true, message: "Token refreshed successfully!!" })
}

export const signOut = async (req: Request, res: Response) => {
  const token = req.cookies["Refresh-Token"]
  if (!token) throw new ExpressError({ code: "FORBIDDEN", message: "Refresh token missing!!" })

  const { accessToken, refreshToken } = await session.destroy(token)

  res.cookie("Access-Token", accessToken, { ...COOKIE_CONFIG.access, maxAge: 1 })
  res.cookie("Refresh-Token", refreshToken, { ...COOKIE_CONFIG.refresh, maxAge: 1 })

  return res.status(200).json({ success: true, message: "Logged out successfully!!" })
}

export const profile = async (req: Request, res: Response) => {
  const user = req.user
  if (!user) throw new ExpressError({ code: "NOT_FOUND", message: "User not found!" })

  return res.status(200).json(user)
}
