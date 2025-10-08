import express, { Request, Response } from "express"
import { generate, verify, signOut, refresh, profile } from "./controller"
import { verifyAuth, verifyPermissions, verifyRefresh, verifyTierLimit } from "~/middleware/auth"
import { Permission, Role } from "@prisma/client"

const router = express.Router()

router.post("/request-verification-link", generate)
router.post("/verify/:code/:email", verify)
router.post("/refresh", verifyRefresh, refresh)
router.post("/sign-out", verifyAuth, signOut)

router.get("/profile", verifyAuth, profile)
router.get("/ping", verifyAuth, verifyPermissions(Role.ADMIN, [Permission.MANAGE_PROJECTS, Permission.MANAGE_USERS]), verifyTierLimit("organizations"), (_req: Request, res: Response) => res.status(200).json({ success: true }))

export default router
