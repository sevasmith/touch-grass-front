"use server"

import { redirect } from "next/navigation"

import { SessionResponseSchema } from "@/entities/auth"
import { ApiError, apiFetch } from "@/shared/api/client"
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "@/shared/api/session"
import { ROUTES } from "@/shared/config/routes"

import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from "../model/schemas"
import type { ActionResult } from "../model/types"

const GENERIC_ERROR = "Service unavailable. Please try again later."

function formErrorFromApi(error: ApiError, fallback: string): string {
  return typeof error.body.message === "string" && error.body.message.length > 0
    ? error.body.message
    : fallback
}

export async function login(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  let session: { token: string; user: { emailVerified: boolean } }
  try {
    const raw = await apiFetch<unknown>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
    const result = SessionResponseSchema.safeParse(raw)
    if (!result.success) throw new ApiError(500, { message: GENERIC_ERROR })
    session = result.data
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 400 && error.status < 500) {
        return {
          formError: formErrorFromApi(error, "Invalid email or password"),
        }
      }
      return { formError: GENERIC_ERROR }
    }
    return { formError: GENERIC_ERROR }
  }

  await setSessionToken(session.token)

  if (!session.user.emailVerified) {
    redirect(ROUTES.checkEmail)
  }
  redirect(ROUTES.dashboard)
}

export async function register(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  let session: { token: string }
  try {
    const raw = await apiFetch<unknown>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
    const result = SessionResponseSchema.safeParse(raw)
    if (!result.success) throw new ApiError(500, { message: GENERIC_ERROR })
    session = result.data
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 400 && error.status < 500) {
        if (error.body.fieldErrors) {
          return { fieldErrors: error.body.fieldErrors }
        }
        return {
          formError: formErrorFromApi(
            error,
            "Unable to create account. Please try again."
          ),
        }
      }
      return { formError: GENERIC_ERROR }
    }
    return { formError: GENERIC_ERROR }
  }

  await setSessionToken(session.token)
  redirect(ROUTES.checkEmail)
}

export async function logout(): Promise<never> {
  const token = await getSessionToken()
  if (token) {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Fire-and-forget: still clear the local session cookie on failure.
    }
  }
  await clearSessionToken()
  redirect(ROUTES.login)
}

export async function forgotPassword(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return { formError: GENERIC_ERROR }
    }
    return { formError: GENERIC_ERROR }
  }

  redirect(`${ROUTES.forgotPassword}?sent=true`)
}

export async function resetPassword(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined> {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    token: formData.get("token"),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  let session: { token: string }
  try {
    const raw = await apiFetch<unknown>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
    const result = SessionResponseSchema.safeParse(raw)
    if (!result.success) throw new ApiError(500, { message: GENERIC_ERROR })
    session = result.data
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 400 && error.status < 500) {
        return {
          formError: formErrorFromApi(
            error,
            "This link has expired or has already been used."
          ),
        }
      }
      return { formError: GENERIC_ERROR }
    }
    return { formError: GENERIC_ERROR }
  }

  await setSessionToken(session.token)
  redirect(ROUTES.dashboard)
}

export async function verifyEmail(
  token: string
): Promise<ActionResult | undefined> {
  let success = true
  try {
    await apiFetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
  } catch {
    success = false
  }

  if (success) {
    redirect(ROUTES.dashboard)
  }
  redirect(`${ROUTES.checkEmail}?error=expired`)
}

export async function resendVerificationEmail(
  _prevState: ActionResult | undefined,
  _formData: FormData
): Promise<ActionResult | undefined> {
  // `prevState`/`formData` are part of the Server Action contract but unused here.
  void _prevState
  void _formData

  const token = await getSessionToken()
  if (!token) {
    return { formError: "Your session has expired. Please log in again." }
  }

  try {
    await apiFetch("/api/auth/resend-verification", { method: "POST" })
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return { formError: "Please wait before requesting another email." }
      }
      return { formError: GENERIC_ERROR }
    }
    return { formError: GENERIC_ERROR }
  }

  return {}
}
