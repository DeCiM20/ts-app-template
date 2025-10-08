import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "~/components/ui/button"

const Error = ({ type, err }: { type: "caught" | "uncaught"; err?: Error }) => {
  if (type === "caught" && err) {
    const [message, error] = err.message.split("//://")

    return (
      <div className="h-screen flex justify-center items-center container mx-auto px-4 md:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col items-center justify-center -mt-28 md:-mt-40">
          <div className="text-center max-w-2xl">
            <div className="mb-2">
              <AlertTriangle className="size-28 lg:size-40 text-primary mx-auto mb-4" />
              <h1 className="text-2xl lg:text-5xl font-bold mb-2 opacity-90">{message}</h1>
              <div className="text-gray-400 text-xs md:text-sm mb-4">{error}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link to="/">
                <Button variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    return (
      <div className="h-screen flex justify-center items-center container mx-auto px-4 md:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col items-center justify-center -mt-28 md:-mt-40">
          <div className="text-center max-w-2xl">
            <div className="mb-2">
              <AlertTriangle className="size-28 lg:size-40 text-white mx-auto mb-4" />
              <h1 className="text-2xl lg:text-5xl font-bold mb-2 opacity-90">SOMETHING WENT WRONG</h1>
              <div className="text-gray-400 text-xs md:text-sm mb-4">We've encountered a critical error with the application.</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link to="/">
                <Button variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Error
