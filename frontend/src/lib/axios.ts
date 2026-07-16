import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';

export const api = axios.create({
  baseURL,
});

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return !error.response && Boolean(error.code === 'ERR_NETWORK' || error.message === 'Network Error')
}
