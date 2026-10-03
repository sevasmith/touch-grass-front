/** The backend refuses a resend within 60 s of the previous code. */
export const RESEND_COOLDOWN_MS = 60_000

/** Wrong guesses allowed per code before it dies. */
export const VERIFICATION_MAX_ATTEMPTS = 5
