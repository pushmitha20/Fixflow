import { ApiError } from '../../types/api'

export type UserField = 'name' | 'email' | 'role'

export type UserFieldErrors = Partial<Record<UserField, string>>

export type DescribedUserError = {
  status: number | null
  message: string
  fieldErrors: UserFieldErrors
}

export const DUPLICATE_EMAIL_MESSAGE = 'A user with this email already exists.'
export const MISSING_USER_MESSAGE = 'This user no longer exists. It may have been deleted.'
export const SERVICE_UNAVAILABLE_MESSAGE = 'User service is currently unavailable.'
export const NETWORK_ERROR_MESSAGE = 'Could not reach the FixFlow gateway. Check the connection and try again.'

const USER_FIELDS: UserField[] = ['name', 'email', 'role']

type ValidationIssue = {
  loc?: unknown[]
  msg?: string
}

// FastAPI 422 bodies list issues as { loc: ['body', field], msg }.
const readValidationIssues = (details: unknown): UserFieldErrors => {
  const issues = (details as { detail?: unknown } | null)?.detail

  if (!Array.isArray(issues)) {
    return {}
  }

  return (issues as ValidationIssue[]).reduce<UserFieldErrors>((fieldErrors, issue) => {
    const field = issue.loc?.[issue.loc.length - 1]

    if (typeof field === 'string' && USER_FIELDS.includes(field as UserField) && issue.msg) {
      fieldErrors[field as UserField] ??= issue.msg
    }

    return fieldErrors
  }, {})
}

export const describeUserError = (error: unknown, fallback: string): DescribedUserError => {
  if (!(error instanceof ApiError)) {
    return { status: null, message: NETWORK_ERROR_MESSAGE, fieldErrors: {} }
  }

  switch (error.status) {
    case 409:
      return {
        status: 409,
        message: DUPLICATE_EMAIL_MESSAGE,
        fieldErrors: { email: DUPLICATE_EMAIL_MESSAGE },
      }
    case 422: {
      const fieldErrors = readValidationIssues(error.details)
      return {
        status: 422,
        message:
          Object.keys(fieldErrors).length > 0
            ? 'Some fields need attention.'
            : 'The user service rejected this input.',
        fieldErrors,
      }
    }
    case 404:
      return { status: 404, message: MISSING_USER_MESSAGE, fieldErrors: {} }
    case 503:
      return { status: 503, message: SERVICE_UNAVAILABLE_MESSAGE, fieldErrors: {} }
    default:
      return { status: error.status, message: fallback, fieldErrors: {} }
  }
}
