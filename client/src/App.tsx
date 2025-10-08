import { ThemeProvider } from "~/components/theme-provider"
import { RouterProvider } from "react-router-dom"
import router from "./router"
import { AuthProvider } from "./context/auth/provider"

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="nft-marketplace-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
