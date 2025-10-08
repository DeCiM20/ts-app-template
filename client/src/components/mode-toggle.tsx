import { Moon, Sun } from "lucide-react"
import { useTheme } from "~/components/theme-provider"
import { Button } from "~/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => (theme === "dark" ? setTheme("light") : setTheme("dark"))}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 duration-500 ease-in-out dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
