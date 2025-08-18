import { OllamaInstallerService } from './services/ollama-installer.service';
import { ENV_VARS, ENV_VARS_DEFAULTS, QUEUE_NAMES } from '@/constants';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { session } from 'telegraf';

import { GreeterWizard } from './wizards/greeter.wizard';
import { HelperWizard } from './wizards/helper.wizard';
import { ReportWizard } from './wizards/report.wizard';
import { TelegramService } from './telegram.service';
import { TunerWizard } from './wizards/tune.wizards';

@Module({
  imports: [
    HttpModule,
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        token: cfg.get<string>(
          ENV_VARS.TELEGRAM_BOT_TOKEN,
          String(ENV_VARS_DEFAULTS[ENV_VARS.TELEGRAM_BOT_TOKEN])
        ),
        middlewares: [session()],
        include: [TelegramModule],
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.TELEGRAM_QUEUE,
    }),
  ],
  providers: [
    OllamaInstallerService,
    TelegramService,
    GreeterWizard,
    HelperWizard,
    TunerWizard,
    ReportWizard,
  ],
  exports: [TelegramService, OllamaInstallerService],
})
export class TelegramModule {}
