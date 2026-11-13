import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({
  logger: true,
  bodyLimit: 1024 * 1024,
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

await app.register(cors, {
  origin(origin, callback) {
    // No browser origin is expected for health checks and server-to-server calls.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'), false);
  },
  credentials: true,
});

app.get('/health', async () => ({
  status: 'ok',
  service: 'syntax-ide-api',
  version: '0.1.0',
}));

app.get('/api/v1/status', async () => ({
  name: 'SYNTAX IDE API',
  status: 'ready',
  capabilities: {
    authentication: 'not-configured',
    projects: 'not-configured',
    workspaces: 'not-configured',
    ai: 'not-configured',
    databaseConnectors: 'not-configured',
  },
}));

app.setNotFoundHandler(async (_request, reply) => {
  return reply.code(404).send({ error: 'Route not found' });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error({ err: error }, 'Request failed');
  return reply.code(500).send({ error: 'Internal server error' });
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
