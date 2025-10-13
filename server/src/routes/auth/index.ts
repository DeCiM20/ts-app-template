import express, { Request, Response } from "express"
import { generate, verify, signOut, refresh, profile } from "./controller"
import VerifyAccess from "~/middleware/access"
import { Role } from "@prisma/client"
import { EntityType } from "~/utils/constants"

const router = express.Router()

router.post("/request-verification-link", generate)
router.post("/verify/:code/:email", verify)
router.post("/refresh", VerifyAccess.refresh, refresh)
router.post("/sign-out", VerifyAccess.auth, signOut)

router.get("/profile", VerifyAccess.auth, profile)
router.get("/ping", VerifyAccess.auth, VerifyAccess.permissions(EntityType.PROJECT, Role.ADMIN, ["read:project", "write:project"]), VerifyAccess.tier("organizations"), (_req: Request, res: Response) => res.status(200).json({ success: true }))

export default router
