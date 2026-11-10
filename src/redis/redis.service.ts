import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {Redis} from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  constructor(private readonly configService:ConfigService){}

  async onModuleInit(): Promise<void> {
    this.client = new Redis(
      this.configService.get<string>('redis.url') ??
        'redis://localhost:6379',
    );

    this.client.on('connect', () => {
      console.log('[RedisService] Connected to Redis');
    });

    this.client.on('error', (err) => {
      console.error('[RedisService] Redis Error:', err);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
