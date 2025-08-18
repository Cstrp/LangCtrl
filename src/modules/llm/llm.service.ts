import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { FileWatcherService } from '../fw';
import { LLMConfig } from '../../types';
import { Subscription } from 'rxjs';
import { LLM } from './interfaces';

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class LLMService implements LLM, OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(LLMService.name);

  private model?: ChatOpenAI | ChatGoogleGenerativeAI | ChatOllama;
  private configSubscription?: Subscription;

  constructor(private readonly fileWatcherService: FileWatcherService) {}

  public async onModuleInit() {
    await this.fileWatcherService.waitUntilReady();

    this.initializeModel();

    this.configSubscription = this.fileWatcherService
      .onLLMConfigChange()
      .subscribe(config => {
        this.logger.log('LLM configuration changed, reinitializing model...');

        this.initializeModel(config);
      });
  }

  public onModuleDestroy() {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
  }

  private initializeModel(config?: LLMConfig): void {
    const cfg = config || this.fileWatcherService.getLLMConfig();

    this.logger.debug(`Initializing model with config: ${JSON.stringify(cfg)}`);

    try {
      switch (cfg.provider) {
        case 'openai':
          if (!cfg.apiKey) {
            throw new Error('OpenAI API key is required');
          }

          this.model = new ChatOpenAI({
            apiKey: cfg.apiKey,
            model: cfg.model,
          });
          break;
        case 'google':
          if (!cfg.apiKey) {
            throw new Error('Google API key is required');
          }

          this.model = new ChatGoogleGenerativeAI({
            apiKey: cfg.apiKey,
            model: cfg.model,
          });
          break;
        case 'ollama':
          this.model = new ChatOllama({
            model: cfg.model,
            baseUrl: cfg.baseUrl || 'http://localhost:11434',
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${cfg.provider as string}`);
      }

      this.logger.debug(
        `Model initialized successfully with provider: ${cfg.provider}, model: ${cfg.model}`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize model: ${error.message}`);
      throw error;
    }
  }

  public async invokeAndParse<T extends Record<string, unknown>>(
    messages: BaseMessage[],
    parser: JsonOutputParser<T>
  ): Promise<T> {
    if (!this.model) {
      this.logger.error('Model not initialized');
      throw new Error('Model not initialized');
    }

    const response = await this.model?.invoke(messages);

    this.logger.debug(
      `Raw model response: ${JSON.stringify(response, null, 2)}`
    );

    return parser.invoke(response);
  }
}
