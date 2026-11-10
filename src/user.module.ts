import { Module } from "@nestjs/common";
import {ClientsModule, Transport} from '@nestjs/microservices'
import { join } from "path";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configuration from "./config/configuration.js";
import { MongooseModule } from "@nestjs/mongoose";
import { RedisModule } from "./redis/redis.module.js";
import { User, UserSchema } from "./schemas/user.schema.js";
import { AuthClient } from "./auth/auth-client.service.js"
import { GrpcBreaker } from "./grpc/grpc-breaker.service.js";
@Module({
 imports:[
    ClientsModule.registerAsync([
      {
        name: 'AUTH',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(import.meta.dirname, 'proto/auth.proto'),
            url: configService.getOrThrow<string>('grpc.authUrl'),
            loader: { keepCase: true },
          },
        }),
      },
      {
        // asks common-service to send emails (OTP code, ...)
        name: 'MAIL',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('rabbitmq.url')],
            queue: 'mail_events',
            persistent: true, // messages survive a broker restart
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
     ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('mongo.uri'),
      }),
    }),
    RedisModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
 ],
 controllers:[UserController],
 providers:[UserService,AuthClient,GrpcBreaker]
})

export class UserModule{}