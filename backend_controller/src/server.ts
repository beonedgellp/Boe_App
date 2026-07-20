import app from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, config.host, () => {
  console.log(`BeOnEdge backend listening on http://${config.host}:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port already in use: http://${config.host}:${config.port}`);
    console.error('Stop the existing process or set PORT to a different value.');
    process.exit(1);
  }
  throw error;
});

export default server;
