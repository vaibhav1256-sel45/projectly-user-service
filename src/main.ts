import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(
        import.meta.dirname,
        './proto/user.proto',
      ),
      url: app.get(ConfigService).getOrThrow<string>('grpc.userUrl'),
      loader: { keepCase: true },
    },
  });


  await app.startAllMicroservices();
  const configService = app.get(ConfigService);
  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('User API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
   app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });
  // Health check: answered by the HTTP adapter itself, so no auth guard or response wrapper is involved.
  app.getHttpAdapter().get('/health', (_req: any, res: any) =>
    res.status(200).json({ status: 'ok', service: 'user-service', uptime: Math.round(process.uptime()) }),
  );

  // Graceful shutdown: on SIGTERM / SIGINT the app stops taking requests, closes the gRPC and
  // RabbitMQ listeners, and lets the database / Redis connections close before the process exits.
  app.enableShutdownHooks();

  await app.listen(configService.getOrThrow<number>('port'));
}
await bootstrap();
