import { app } from './app.js';
import { config } from './config/index.js';
import { connectDB, prisma } from './db/prisma.js';

async function bootstrap() {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  Ooting CRM Backend running on http://localhost:${config.port}`);
    console.log(`  Health Check: http://localhost:${config.port}/api/health`);
    console.log(`====================================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully terminating Ooting CRM server...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database connection closed. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
