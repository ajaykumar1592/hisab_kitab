import * as React from "react"
import {
  Root as SwitchRoot,
  SwitchThumb,
} from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchRoot>,
  React.ComponentPropsWithoutRef<typeof SwitchRoot>
>(({ className, ...props }, ref) => (
  <SwitchRoot
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border-2 border-transparent",
      "transition-colors focus-visible:focus:outline-none focus-visible:ring-2",
      "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
      "disabled:opacity-50 data-[state]:checked:bg-primary",
      className
    )}
    {...props}
  >
    <SwitchThumb className={cn(
      "pointer-events-none flex h-5 w-5 items-center justify-center",
      "transition-transform data-[state]:checked:translate-x-5",
      "bg-background shadow-lg ring-0"
    )} />
  </SwitchRoot>
))
Switch.displayName = "Switch"

export { Switch }