import { Collaborator, User } from "@prisma/client"

export {} // this makes the file a module

export type SessionUserType = User & { collaborations: Collaborator[] }

declare global {
  namespace Express {
    interface Request {
      user?: SessionUserType
    }
  }
}
