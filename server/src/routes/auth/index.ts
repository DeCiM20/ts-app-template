import express, { Request, Response } from "express"
import { generate, verify, signOut, refresh, profile } from "./controller"
import VerifyAccess from "~/middleware/auth"
import { Role } from "@prisma/client"
import { Resource } from "~/utils/permissions"

const router = express.Router()

router.post("/request-verification-link", generate)
router.post("/verify/:code/:email", verify)
router.post("/refresh", VerifyAccess.refresh, refresh)
router.post("/sign-out", VerifyAccess.auth, signOut)

router.get("/profile", VerifyAccess.auth, profile)
router.get("/ping", VerifyAccess.auth, VerifyAccess.permissions(Resource.projects, Role.project_admin), VerifyAccess.tier("organizations"), (_req: Request, res: Response) => res.status(200).json({ success: true }))

export default router
