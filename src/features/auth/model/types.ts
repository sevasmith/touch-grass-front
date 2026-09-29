export interface ActionResult {
  /** Field-level errors keyed by form field name (from client or backend) */
  fieldErrors?: Record<string, string[]>
  /** Generic form-level error message (e.g., "Invalid credentials", network errors) */
  formError?: string
}
