import axios from 'axios';

export const api = axios.create({
  // URL base do nosso backend Fastify
  baseURL: 'http://localhost:3333/api',
});
