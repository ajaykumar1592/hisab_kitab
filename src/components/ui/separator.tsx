import * as React from "react"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<"hr">,
  React.ComponentPropsWithoutRef<"hr"> & {
    orientation?: "horizontal" | "vertical"
    decorative?: boolean
  }
>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "shrink-0 bg-gray-200 border-0",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      aria-orientation={orientation}
      aria-hidden={decorative}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }