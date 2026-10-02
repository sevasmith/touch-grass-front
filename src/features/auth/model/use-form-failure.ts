"use client"

import { useState } from "react"
import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import type { AuthErrorCode } from "./auth-error"

interface Failure {
  error: AuthErrorCode
  fieldErrors?: Partial<Record<string, string>>
}

/**
 * Routes an action failure into a form: errors for known fields go onto those fields, anything
 * else becomes the form-level alert code.
 */
export function useFormFailure<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[]
) {
  const [formError, setFormError] = useState<AuthErrorCode | null>(null)

  function onFailure({ error, fieldErrors = {} }: Failure) {
    const onFields = fields.filter((field) => fieldErrors[field] !== undefined)
    setFormError(onFields.length > 0 ? null : error)
    for (const field of onFields)
      setError(field, { message: fieldErrors[field] })
  }

  return { formError, onFailure, clearFormError: () => setFormError(null) }
}
