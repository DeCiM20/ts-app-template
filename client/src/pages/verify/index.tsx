import { BadgeCheck, CircleX, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { useAuth } from "~/context/auth/context"
import { usePost } from "~/hooks/useApi"
import { delay } from "~/lib/utils"

const ParamsSchema = z.object({
  code: z.string(),
  email: z.string().email(),
})

type StatusType = "pending" | "success" | "error"

const Verify = () => {
  const { success, data } = ParamsSchema.safeParse(useParams())

  const [status, setStatus] = useState<StatusType>("success")
  const [enabled, setEnabled] = useState(false)
  const ref = useRef(false)

  const { refetchFg } = useAuth()

  if (!success) {
    throw Error("MISSING PARAMS//://The code or email parameter is missing or invalid. Please check and try again.")
  }

  const verification = usePost(`/auth/verify/${data.code}/${data.email}`, {
    onError: () => {
      setStatus("error")
    },
    onSuccess: async () => {
      setStatus("success")
      await delay(3000)
      setEnabled(true)
      await refetchFg()
    },
    retry: 0,
  })

  useEffect(() => {
    if (!ref.current) {
      verification.mutate({})
      ref.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center -mt-12">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-8 text-center">
              {/* Animated Loader */}
              <div className="mb-6">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Verifying your account</h2>
                  <p className="text-muted-foreground">Please wait while we verify your credentials...</p>
                </div>
              </div>

              {/* Progress Animation */}
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Authenticating</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full animate-pulse w-3/5" />
                </div>
              </div>

              {/* Floating particles animation */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-400 rounded-full opacity-60 animate-ping"></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-400 rounded-full opacity-40 animate-ping" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-50 animate-ping" style={{ animationDelay: "2s" }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center -mt-12">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-8 text-center">
              {/* Animated Loader */}
              <div className="mb-6">
                <CircleX className="h-20 w-20 text-primary animate-bounce mx-auto mb-4" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Error</h2>
                  <p className="text-muted-foreground">There was an issue authenticating. Please ensure the link is valid and up to date, or try logging in again.</p>
                </div>
              </div>

              {/* Floating particles animation */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-400 rounded-full opacity-60 animate-ping"></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-red-400 rounded-full opacity-40 animate-ping" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-red-600 rounded-full opacity-50 animate-ping" style={{ animationDelay: "2s" }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center -mt-12">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-8 text-center">
            {/* Animated Loader */}
            <div className="mb-6">
              <BadgeCheck className="h-20 w-20 text-white-500 animate-pulse mx-auto mb-4" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Welcome to Demo!</h2>
                <p className="text-muted-foreground">Your account has been verified successfully. You're now ready to start building with our APIs.</p>
              </div>
            </div>

            <div className="text-center">
              <Button disabled={!enabled} className="w-full">
                <Link to="/dashboard" className="w-full h-full" replace>
                  Dashboard
                </Link>
              </Button>
              <div className="text-xs opacity-70 mt-2">You’ll be redirected to the dashboard automatically. If not, click the button above to go there manually.</div>
            </div>

            {/* Floating particles animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-red-400 rounded-full opacity-60 animate-ping"></div>
              <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-400 rounded-full opacity-40 animate-ping" style={{ animationDelay: "1s" }} />
              <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-50 animate-ping" style={{ animationDelay: "2s" }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Verify
