import axios from 'axios';

export const api = axios.create({
  // URL base do nosso backend Fastify
  baseURL: 'http://localhost:3333/api',
});

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  return !error.response && Boolean(error.code === 'ERR_NETWORK' || error.message === 'Network Error')
}
