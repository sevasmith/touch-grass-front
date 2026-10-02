import { AuthTextField, type AuthTextFieldProps } from "./AuthTextField"

type EmailFieldProps = Omit<AuthTextFieldProps, "label" | "type"> & {
  label?: string
}

export function EmailField({ label = "Email", ...props }: EmailFieldProps) {
  return (
    <AuthTextField
      label={label}
      type="email"
      autoComplete="email"
      placeholder="Enter your email"
      {...props}
    />
  )
}
