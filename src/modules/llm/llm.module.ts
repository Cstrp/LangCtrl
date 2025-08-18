import { BullModule } from '@nestjs/bullmq';
import { LLMService } from './llm.service';
import { FileWatcherService } from '../fw';
import { QUEUE_NAMES } from '@/constants';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.LLM_QUEUE,
    }),
  ],
  providers: [LLMService, FileWatcherService],
  exports: [LLMService],
})
export class LLMModule {}
