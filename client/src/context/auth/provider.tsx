import { useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { ReactNode } from "react"
import { toast } from "sonner"
import { useGet, usePost } from "~/hooks/useApi"
import Loading from "~/pages/_static/loading"
import { AuthContext, User } from "./context"

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const client = useQueryClient()

  const { data: user, isLoading, refetch: refetchBg } = useGet<User>(["profile", "current-user"], "/auth/profile", {
    retry: (fc, error) => {
      // if it's an AxiosError with a
      //  401 response, do NOT retry:
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false
      }
      // otherwise retry up to 2 times:
      return fc < 0
    },
  })

  const refetchFg = async () => {
    await client.resetQueries({
      queryKey: ["profile", "current-user"],
      exact: true,
    })
  }

  const mutation = usePost("/auth/sign-out", {
    onSuccess: async () => {
      toast.success("Logged out successfully")
      await refetchFg()
    },
    onError: () => toast.error("Failed to log out"),
  })

  const logOut = () => mutation.mutate(undefined)

  if (isLoading) return <Loading />

  return <AuthContext.Provider value={{ user, refetchBg, refetchFg, logOut }}>{children}</AuthContext.Provider>
}
