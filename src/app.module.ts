import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENV_VARS, ENV_VARS_DEFAULTS } from '@/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';

import {
  TelegramModule,
  PlaywrightModule,
  FileWatcherModule,
  LLMModule,
} from '@/modules';

@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>(
            ENV_VARS.BULLMQ_HOST,
            String(ENV_VARS_DEFAULTS[ENV_VARS.BULLMQ_HOST])
          ),
          port: cfg.get<number>(
            ENV_VARS.BULLMQ_PORT,
            Number(ENV_VARS_DEFAULTS[ENV_VARS.BULLMQ_PORT])
          ),
        },
        defaultJobOptions: {
          timestamp: Date.now(),
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    FileWatcherModule,
    PlaywrightModule,
    TelegramModule,
    LLMModule,
  ],
})
export class AppModule {
  constructor() {}
}
