import * as React from "react"
import {
  Root as Slot,
} from "@radix-ui/react-slot"
import { Controller, ControllerProps, FieldPath, FieldValues, UseFormProps, useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

type FormProviderProps = UseFormProps<FieldValues> & React.RefAttributes<HTMLFormElement>

const Form = React.forwardRef<HTMLFormElement, FormProviderProps>(
  ({ ...props }, ref) => (
    <Slot {...props} ref={ref} />
  )
)
Form.displayName = "Form"

const FormField = <TFieldValues extends FieldValues = FieldValues>(
  { ...props }: ControllerProps<TFieldValues>
) => {
  return <Controller {...props} />
}

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
)
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <Label ref={ref} className={cn("", className)} {...props} />
  )
)
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
)
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props} />
  )
)
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-red-600", className)}
      {...props}
    >
      {children}
    </p>
  )
)
FormMessage.displayName = "FormMessage"

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}