/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { useQuery, useMutation, type QueryKey, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query"

const axiosInstance = axios.create({
  baseURL: typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL ? process.env.VITE_BACKEND_URL : "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

let isRefreshing = false

interface QueueItem {
  resolve: (value?: any) => void
  reject: (error?: any) => void
}

let failedQueue: QueueItem[] = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

// Response interceptor to handle 419 status
axiosInstance.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Check if error is 419 and we haven't already tried to refresh
    if (error.response?.status === 419 && !originalRequest._retry) {
      originalRequest._retry = true
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {failedQueue.push({ resolve, reject })}).then(() => axiosInstance(originalRequest)).catch(err => Promise.reject(err))
      }

      isRefreshing = true
      try {
        // Call refresh endpoint
        await axiosInstance.post("/refresh")
        // Process queue of pending requests
        processQueue(null)
        // Retry the original request
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // If refresh fails, reject all queued requests
        processQueue(refreshError as AxiosError)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

/**
 * GET query hook
 * @param key React Query cache key
 * @param url Relative endpoint
 * @param options React Query options
 */
function useGet<TData>(key: QueryKey, url: string, options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryKey" | "queryFn">) {
  return useQuery<TData>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await axiosInstance.get<TData>(url)
      return data
    },
    ...options,
  })
}

/**
 * POST mutation hook
 * @param url Relative endpoint
 * @param options React Query options
 */
function usePost<TData, TVariables>(url: string, options?: Omit<UseMutationOptions<TData, unknown, TVariables>, "mutationKey" | "mutationFn">) {
  return useMutation<TData, unknown, TVariables>({
    mutationFn: async (payload: TVariables) => {
      const { data } = await axiosInstance.post<TData>(url, payload)
      return data
    },
    retry: 0,
    ...options,
  })
}

/**
 * PUT mutation hook
 * @param url Relative endpoint
 * @param options React Query options
 */
function usePut<TData, TVariables>(url: string, options?: Omit<UseMutationOptions<TData, unknown, TVariables>, "mutationKey" | "mutationFn">) {
  return useMutation<TData, unknown, TVariables>({
    mutationFn: async (payload: TVariables) => {
      const { data } = await axiosInstance.put<TData>(url, payload)
      return data
    },
    retry: 0,
    ...options,
  })
}

/**
 * DELETE mutation hook
 * @param url Relative endpoint
 * @param options React Query options
 */
function useDelete<TData, TVariables = void>(url: string, options?: Omit<UseMutationOptions<TData, unknown, TVariables>, "mutationKey" | "mutationFn">) {
  return useMutation<TData, unknown, TVariables>({
    mutationFn: async (payload: TVariables) => {
      const { data } = await axiosInstance.delete<TData>(url, {
        data: payload,
      })
      return data
    },
    retry: 0,
    ...options,
  })
}

export { useGet, usePost, usePut, useDelete }
