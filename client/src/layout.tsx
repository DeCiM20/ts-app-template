import { Link, Outlet, useLocation } from "react-router-dom"
import { Button } from "~/components/ui/button"
import { ArrowRight, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet"
import { ModeToggle } from "~/components/mode-toggle"
import { useAuth } from "~/context/auth/context"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar"
import { AppSidebar } from "~/components/sidebar"
import { Suspense } from "react"
import Loading from "./pages/_static/loading"
import Footer from "./components/footer"
import { Separator } from "./components/ui/separator"

const PUBLIC_ROUTES = ["/"]

function Layout() {
  const location = useLocation()
  const path = location.pathname

  const { user } = useAuth()

  // Navbar for authenticated users (dashboard, profile, etc.)
  if (!PUBLIC_ROUTES.includes(path) && user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 md:hidden" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 md:hidden" />
              <span className="font-bold text-lg capitalize">{path.split("/")[1]}</span>
            </div>
          </header>
          <main className="p-4">
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex justify-center">
        <div className="container px-4 md:px-8 lg:px-12 xl:px-16 flex h-16 items-center justify-between">
          <Link to="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-bold text-xl">Demo</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-12">
            <Link to="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link to="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link to="#docs" className="text-sm font-medium hover:text-primary transition-colors">
              Docs
            </Link>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <ModeToggle />
            <Link to="/dashboard">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-6">
              <div className="flex flex-col space-y-4 mt-4">
                <div className="flex items-center space-x-2 pb-4 border-b">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">D</span>
                  </div>
                  <span className="font-bold text-xl">Demo</span>
                </div>

                <nav className="flex flex-col space-y-4">
                  <Link to="#features" className="text-lg font-medium transition-colors py-2">
                    Features
                  </Link>
                  <Link to="#pricing" className="text-lg font-medium transition-colors py-2">
                    Pricing
                  </Link>
                  <Link to="#docs" className="text-lg font-medium transition-colors py-2">
                    Documentation
                  </Link>
                </nav>

                <div className="flex flex-col space-y-3 pt-4 border-t">
                  <Link to="/auth/signin">
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button className="w-full">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex flex-col container mx-auto px-4 md:px-8 lg:px-12 xl:px-16 w-full h-full my-12">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer className="mt-auto" />
    </div>
  )
}

export default Layout
