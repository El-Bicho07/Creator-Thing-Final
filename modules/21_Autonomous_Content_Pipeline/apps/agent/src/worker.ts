
import fastify from 'fastify';

const server = fastify();

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

export const startWorker = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log('Worker listening on port 3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
