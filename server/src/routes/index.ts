import express, { Request, Response } from "express"
import Auth from "./auth"

const router = express.Router()

router.use("/auth", Auth)

router.get("/ping", (_req: Request, res: Response) => res.status(200).json({ success: true }))

export default router
