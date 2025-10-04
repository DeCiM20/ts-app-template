import { PrismaClient } from "@prisma/client"
import { env } from "./env"

const isDev = env.NODE_ENV === "development"

const createPrismaClient = () => {
  const client = new PrismaClient({ log: isDev ? ["error", "warn"] : ["error"] })

  return client
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (isDev) globalForPrisma.prisma = db
