import { FileWatcherService } from '../fw';
import { Subscription } from 'rxjs';

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(PlaywrightService.name);

  private configSubscription?: Subscription;

  constructor(private readonly fileWatcherService: FileWatcherService) {}

  public async onModuleInit() {
    await this.fileWatcherService.waitUntilReady();

    this.configSubscription = this.fileWatcherService
      .onBrowserConfigChange()
      .subscribe(config => {
        this.logger.log('Browser configuration changed, reinitializing...');
      });
  }

  public onModuleDestroy() {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
  }
}
