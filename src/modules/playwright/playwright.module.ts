import { PlaywrightService } from './playwright.service';
import { BullModule } from '@nestjs/bullmq';
import { FileWatcherService } from '../fw';
import { QUEUE_NAMES } from '@/constants';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.PLAYWRIGHT_QUEUE,
    }),
  ],
  providers: [PlaywrightService, FileWatcherService],
  exports: [PlaywrightService],
})
export class PlaywrightModule {}
