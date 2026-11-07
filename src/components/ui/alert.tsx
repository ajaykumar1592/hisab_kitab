import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full border rounded-lg text-sm",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-foreground dark:border-destructive [&>button]:bg-destructive/30 [&>button]:hover:bg-destructive/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type AlertProps = React.ComponentPropsWithoutRef<"div"> & {
  variant?: "default" | "destructive"
}

const Alert = React.forwardRef<React.ElementRef<"div">, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant, className }), "rounded-lg p-4")}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  React.ElementRef<"h5">,
  React.ComponentPropsWithoutRef<"h5">
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-2 block font-medium text-sm not-italic", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm not-italic", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }