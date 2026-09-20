import { ApiError } from '../types/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type QueryParams = Record<string, string | number | boolean | undefined>

type RequestOptions<TBody = unknown> = {
  method?: HttpMethod
  params?: QueryParams
  headers?: HeadersInit
  body?: TBody
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!apiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL environment variable.')
}

const buildUrl = (path: string, params?: QueryParams) => {
  const baseUrl = apiBaseUrl.replace(/\/+$/, '')
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

  if (hasBody && !(body instanceof FormData)) {
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
      getErrorMessage(payload, response.statusText || 'Request failed'),
      payload,
    )
  }

  return (await parseResponse(response)) as TResponse
}

export const apiClient = {
  get<TResponse>(path: string, params?: QueryParams) {
    return request<TResponse>(path, { method: 'GET', params })
  },
  post<TResponse>(path: string, body?: unknown, params?: QueryParams) {
    return request<TResponse>(path, { method: 'POST', params, body })
  },
  put<TResponse>(path: string, body?: unknown, params?: QueryParams) {
    return request<TResponse>(path, { method: 'PUT', params, body })
  },
  patch<TResponse>(path: string, body?: unknown, params?: QueryParams) {
    return request<TResponse>(path, { method: 'PATCH', params, body })
  },
  delete<TResponse>(path: string, params?: QueryParams) {
    return request<TResponse>(path, { method: 'DELETE', params })
  },
}

export default apiClient
