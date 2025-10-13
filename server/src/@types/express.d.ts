import { Subscription, User } from "@prisma/client"

export {} // this makes the file a module

export type SessionUserType = User & { subscription?: Subscription }

declare global {
  namespace Express {
    interface Request {
      sid: string
      user?: SessionUserType
    }
  }
}
