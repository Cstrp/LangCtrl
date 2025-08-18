import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfig, LLMConfig, BrowserConfig } from '../../types';
import { Observable, Subject } from 'rxjs';
import { CONFIG_PATH } from '../telegram';
import { ClsService } from 'nestjs-cls';
import * as chokidar from 'chokidar';
import { map } from 'rxjs/operators';
import * as fs from 'fs/promises';

@Injectable()
export class FileWatcherService implements OnModuleInit {
  private readonly logger = new Logger(FileWatcherService.name);

  private readonly filePath = CONFIG_PATH;

  private readonly defaultConfig: AppConfig = {
    provider: 'ollama',
    model: 'deepseek-r1:1.5b',
    baseUrl: 'http://localhost:11434',
    browserName: 'chromium',
    enableStealth: true,
    headless: true,
    slowMo: 500,
    viewportWidth: 1280,
    viewportHeight: 720,
    recordVideo: false,
    ignoreHTTPSErrors: true,
  };

  private data: AppConfig = this.defaultConfig;
  private dataSubject = new Subject<AppConfig>();
  private isReady = false;
  private readyPromise?: Promise<void>;
  private readyResolve?: () => void;

  constructor(private readonly cls: ClsService) {}

  public async onModuleInit(): Promise<void> {
    await this.startWatching();

    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve;
    });
  }

  public async waitUntilReady(): Promise<void> {
    if (this.isReady) {
      return;
    }
    return this.readyPromise;
  }

  public getData(): AppConfig {
    try {
      return this.cls.get('fileData') || this.data;
    } catch {
      return this.data;
    }
  }

  public getLLMConfig(): LLMConfig {
    const data = this.getData();
    return {
      provider: data.provider,
      model: data.model,
      apiKey: data.apiKey,
      baseUrl: data.baseUrl,
    };
  }

  public getBrowserConfig(): BrowserConfig {
    const data = this.getData();
    return {
      browserName: data.browserName,
      enableStealth: data.enableStealth,
      headless: data.headless,
      slowMo: data.slowMo,
      viewportWidth: data.viewportWidth,
      viewportHeight: data.viewportHeight,
      recordVideo: data.recordVideo,
      ignoreHTTPSErrors: data.ignoreHTTPSErrors,
    };
  }

  public onDataChange(): Observable<AppConfig> {
    return this.dataSubject.asObservable();
  }

  public onLLMConfigChange(): Observable<LLMConfig> {
    return this.dataSubject.asObservable().pipe(
      map(data => ({
        provider: data.provider,
        model: data.model,
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
      }))
    );
  }

  public onBrowserConfigChange(): Observable<BrowserConfig> {
    return this.dataSubject.asObservable().pipe(
      map(data => ({
        browserName: data.browserName,
        enableStealth: data.enableStealth,
        headless: data.headless,
        slowMo: data.slowMo,
        viewportWidth: data.viewportWidth,
        viewportHeight: data.viewportHeight,
        recordVideo: data.recordVideo,
        ignoreHTTPSErrors: data.ignoreHTTPSErrors,
      }))
    );
  }

  private async startWatching(): Promise<void> {
    this.logger.log(
      `Starting file watcher for / ${this.filePath.split('/').pop()} /`
    );

    await this.loadFile();

    chokidar.watch(this.filePath, { persistent: true }).on('change', () => {
      this.logger.debug(`File changed: ${this.filePath}`);

      this.loadFile()
        .then(() => {
          this.dataSubject.next(this.data);
        })
        .catch(error => {
          this.logger.error(`Error loading file on change: ${error.message}`);
        });
    });
  }

  private async loadFile(): Promise<void> {
    try {
      this.logger.log(`Loading config file from: ${this.filePath}`);
      const content = await fs.readFile(this.filePath, 'utf-8');

      this.data = { ...this.defaultConfig, ...JSON.parse(content) };

      this.logger.log(
        `File data loaded successfully. Model: ${this.data.model}, Provider: ${this.data.provider}`
      );

      this.cls.run(() => {
        this.cls.set('fileData', this.data);
      });

      if (!this.isReady) {
        this.isReady = true;
        this.readyResolve?.();
      }
    } catch (error) {
      this.logger.error(`Error loading file: ${error.message}`);

      this.data = this.defaultConfig;

      this.cls.run(() => {
        this.cls.set('fileData', this.data);
      });

      if (!this.isReady) {
        this.isReady = true;
        this.readyResolve?.();
      }
    }
  }
}
