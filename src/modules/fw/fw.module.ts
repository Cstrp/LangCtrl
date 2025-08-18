import { FileWatcherService } from './fw.service';
import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [ClsModule.forFeature()],
  providers: [FileWatcherService],
  exports: [FileWatcherService],
})
export class FileWatcherModule {}
