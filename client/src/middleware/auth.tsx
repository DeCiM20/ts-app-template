import { useLocation, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "~/context/auth/context"

const AUTH_ROUTES = ["auth", "verify"]

const Auth = () => {
  const { user } = useAuth()
  const location = useLocation()

  const redirectTo = () => {
    const isAuthRoute = AUTH_ROUTES.includes(location.pathname.split("/")[1])
    if (!user) {
      if (!isAuthRoute) {
        return "/auth" // Redirect to auth if no user
      }
      return null
    }

    if (isAuthRoute) {
      return "/dashboard" // Redirect to dashboard if on /auth
    }

    // if (user.status === "pending" && location.pathname !== "/complete-profile") {
    //   return "/complete-profile" // Redirect to complete profile page if status is pending
    // }

    // if (user.status === "complete" && location.pathname === "/complete-profile") {
    //   return "/dashboard" // Redirect to dashboard if status is complete and on complete profile page
    // }

    return null
  }

  const redirectPath = redirectTo()

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}

export default Auth
