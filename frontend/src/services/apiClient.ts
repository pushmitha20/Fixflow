import { ApiError } from '../types/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export type ApiClientOptions = {
  params?: QueryParams
  headers?: HeadersInit
}

type RequestOptions<TBody = unknown> = ApiClientOptions & {
  method?: HttpMethod
  body?: TBody
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'

const buildUrl = (path: string, params?: QueryParams) => {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${baseUrl}${cleanPath}`)

  if (!params) {
    return url
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    url.searchParams.set(key, String(value))
  })

  return url
}

const parseResponse = async (response: Response) => {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()

  if (!text) {
    return null
  }

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (typeof payload === 'object' && payload !== null) {
    const value = payload as Record<string, unknown>

    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message
    }

    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error
    }

    if (typeof value.detail === 'string' && value.detail.trim()) {
      return value.detail
    }
  }

  return fallback
}

export async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { method = 'GET', params, headers, body } = options
  const hasBody = body !== undefined && body !== null && method !== 'GET'
  const requestHeaders = new Headers(headers ?? undefined)

  if (hasBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = await parseResponse(response)
    throw new ApiError(
      response.status,
      response.statusText,
      getErrorMessage(payload, response.statusText || 'Request failed'),
      payload,
    )
  }

  return (await parseResponse(response)) as TResponse
}

export const apiClient = {
  get<TResponse>(path: string, options: ApiClientOptions = {}) {
    return request<TResponse>(path, { ...options, method: 'GET' })
  },
  post<TResponse>(path: string, body?: unknown, options: ApiClientOptions = {}) {
    return request<TResponse>(path, { ...options, method: 'POST', body })
  },
  put<TResponse>(path: string, body?: unknown, options: ApiClientOptions = {}) {
    return request<TResponse>(path, { ...options, method: 'PUT', body })
  },
  patch<TResponse>(path: string, body?: unknown, options: ApiClientOptions = {}) {
    return request<TResponse>(path, { ...options, method: 'PATCH', body })
  },
  delete<TResponse>(path: string, options: ApiClientOptions = {}) {
    return request<TResponse>(path, { ...options, method: 'DELETE' })
  },
}

export default apiClient
