"use client"

import { useState, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
}

export function PasswordField({
  id,
  label,
  className,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm",
          className
        )}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-[1.4rem] right-1"
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}
