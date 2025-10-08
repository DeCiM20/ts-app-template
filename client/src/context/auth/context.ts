import { createContext, useContext } from "react"
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query"

export type Permissions = "MANAGE_ORGANIZATION" | "MANAGE_BILLING" | "MANAGE_PROJECTS" | "MANAGE_USERS" | "VIEW_ANALYTICS" | "VIEW_PROJECTS" | "VIEW_USERS"

export interface User {
  id: string
  email: string
  organizations: {
    name: string
    id: string
    createdAt: Date
    updatedAt: Date
    description: string | null
    ownerId: string
  }[]
  collaborations: {
    id: string
    createdAt: Date
    updatedAt: Date
    role: "MEMBER" | "ADMIN"
    permissions: Permissions[]
    userId: string
    organizationId: string
  }[]
  createdAt: Date
  updatedAt: Date
}

interface AuthContextType {
  user: User | null | undefined
  refetchBg: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<User, Error>>
  refetchFg: () => Promise<void>
  logOut: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
