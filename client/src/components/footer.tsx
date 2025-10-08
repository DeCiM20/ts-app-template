import { cn } from "~/lib/utils"

export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t bg-muted/30 pt-12 pb-6 px-4", className)}>
      <div className="container mx-auto px-4 md:px-8 lg:px-12 xl:px-16">
        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Demo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
