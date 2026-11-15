import { getAuthSession, type AuthSessionUser } from "@/lib/auth"
import { hasAnyPermission, hasPermission, isOwner, type Permission, PERMISSION_DEFINITIONS } from "@/lib/permissions"

export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PermissionError"
  }
}

export interface AuthorizedUser extends AuthSessionUser {
  organizationId: string
}

/** Requires a signed-in dealership user. */
export async function requireUser(): Promise<AuthorizedUser> {
  const session = await getAuthSession()
  const user = session?.user
  if (!user?.organizationId) {
    throw new PermissionError("Unauthorized. Please log in to your dealership portal.")
  }
  return user as AuthorizedUser
}

/** Requires a signed-in user holding `permission` (owners always pass). */
export async function requirePermission(permission: Permission): Promise<AuthorizedUser> {
  const user = await requireUser()
  if (!hasPermission(user, permission)) {
    throw new PermissionError(`You do not have permission to ${PERMISSION_DEFINITIONS[permission].label.toLowerCase()}.`)
  }
  return user
}

/** Requires a signed-in user holding at least one of `permissions` (owners always pass). */
export async function requireAnyPermission(...permissions: Permission[]): Promise<AuthorizedUser> {
  const user = await requireUser()
  if (!hasAnyPermission(user, permissions)) {
    const names = permissions.map((p) => PERMISSION_DEFINITIONS[p].label.toLowerCase()).join(" or ")
    throw new PermissionError(`You do not have permission (${names}).`)
  }
  return user
}

/** Requires the dealership owner (OrgAdmin) or platform SuperAdmin. */
export async function requireOwner(): Promise<AuthorizedUser> {
  const user = await requireUser()
  if (!isOwner(user)) {
    throw new PermissionError("Only the dealership owner can do this.")
  }
  return user
}
