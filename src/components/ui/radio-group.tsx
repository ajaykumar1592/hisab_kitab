import * as React from "react"
import {
  Root as RadioGroupRoot,
  Item as RadioGroupItemPrimitive,
} from "@radix-ui/react-radio-group"
import { cn } from "@/lib/utils"

type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroupRoot>
type RadioGroupItemProps = React.ComponentPropsWithoutRef<typeof RadioGroupItemPrimitive>

const radioGroupVariants = {
  default: "flex flex-col space-y-1",
}

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupRoot>,
  RadioGroupProps
>(({ className, ...props }, ref) => (
  <RadioGroupRoot
    ref={ref}
    className={cn(radioGroupVariants.default, className)}
    {...props}
  />
))
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupItemPrimitive>,
  RadioGroupItemProps
>(({ className, ...props }, ref) => (
  <RadioGroupItemPrimitive
    ref={ref}
    className={cn(
      "flex items-center space-x-3 font-medium leading-none peer",
      "peer-data-[state]:checked:peer-aria-checked:text-primary",
      "peer-aria-checked:ring-2 peer-aria-checked:ring-ring peer-aria-checked:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
export type { RadioGroupProps, RadioGroupItemProps }