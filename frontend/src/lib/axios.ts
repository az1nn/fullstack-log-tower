import axios from 'axios';
import { context, propagation, recordException } from './otel';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';

export const api = axios.create({
  baseURL,
});

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return !error.response && Boolean(error.code === 'ERR_NETWORK' || error.message === 'Network Error')
}

let lastRequestId: string | undefined;

export function getLastRequestId(): string | undefined {
  return lastRequestId;
}

api.interceptors.request.use((config) => {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  Object.entries(carrier).forEach(([key, value]) => {
    config.headers.set(key, value);
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    const requestId = response.headers['x-request-id'];
    if (typeof requestId === 'string') {
      lastRequestId = requestId;
    }
    return response;
  },
  (error) => {
    const requestId = error?.response?.headers?.['x-request-id'];
    if (typeof requestId === 'string') {
      lastRequestId = requestId;
    }
    recordException(error);
    return Promise.reject(error);
  },
);
