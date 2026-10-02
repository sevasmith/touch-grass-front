import { useId, type ComponentProps, type ReactNode } from "react"

import { cn } from "@/shared/lib/utils"
import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

export interface AuthTextFieldProps extends ComponentProps<"input"> {
  label: string
  error?: string
  /** Rendered on the label row, right-aligned (e.g. "Forgot password?"). */
  labelAside?: ReactNode
}

/** Labelled input styled per Figma 1:2, with an accessible inline error. */
export function AuthTextField({
  label,
  error,
  labelAside,
  id,
  className,
  ...inputProps
}: AuthTextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <Field data-invalid={error ? true : undefined} className="gap-1">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel
          htmlFor={inputId}
          className="text-xs leading-3 font-semibold tracking-[1.2px] text-muted-foreground"
        >
          {label}
        </FieldLabel>
        {labelAside}
      </div>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 rounded-sm bg-input-background px-4 text-base placeholder:text-placeholder md:text-base",
          className
        )}
        {...inputProps}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  )
}
