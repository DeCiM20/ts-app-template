import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom"
import { lazy } from "react"
import NotFound from "./pages/_static/not-found"
import Layout from "./layout"
import { ErrorBoundary } from "./components/error-boundary"
import AuthBoundary from "./middleware/auth"

const Auth = lazy(() => import("./pages/auth"))
const Verify = lazy(() => import("./pages/verify"))
const Dashboard = lazy(() => import("./pages/dashboard"))

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<ErrorBoundary />}>
      <Route element={<AuthBoundary />}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/verify/:code/:email" element={<Verify />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Route>
  )
)

export default router
