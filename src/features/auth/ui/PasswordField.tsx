import { AuthTextField, type AuthTextFieldProps } from "./AuthTextField"

type PasswordFieldProps = Omit<
  AuthTextFieldProps,
  "label" | "type" | "autoComplete"
> & {
  label?: string
  autoComplete: "current-password" | "new-password"
}

export function PasswordField({
  label = "Password",
  ...props
}: PasswordFieldProps) {
  return (
    <AuthTextField
      label={label}
      type="password"
      placeholder="Enter your password"
      {...props}
    />
  )
}
