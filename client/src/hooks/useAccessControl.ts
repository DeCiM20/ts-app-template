import { Permissions, Role, useAuth } from "~/context/auth/context"

export const useAccessControl = (org: string, requiredRole: Role, requiredPermissions: Permissions[]) => {
  const { user } = useAuth()

  // Check if user is part of the organization
  const collaboration = user!.collaborations.find(collab => collab.organizationId === org)

  if (!collaboration) throw Error("ACCESS DENIED//://You are not a collaborator in this organization.")

  // Check role
  if (collaboration.role !== requiredRole) throw Error("ACCESS DENIED//://Your current role does not have the required permissions to access this resource.")

  // Check permissions
  const hasPermissions = requiredPermissions.every(perm => collaboration.permissions.includes(perm))
  if (!hasPermissions) throw Error("ACCESS DENIED//://You do not have the required permissions to access this resource. Ask the admin or the root user to grant you permission to access this resource!")

  return null
}
