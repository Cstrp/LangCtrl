import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

@Injectable()
export class OllamaInstallerService {
  private readonly logger: Logger = new Logger(OllamaInstallerService.name);

  private readonly ollamaApiUrl = 'http://localhost:11434';
  private readonly execAsyncRaw = promisify(exec);

  constructor(private readonly httpService: HttpService) {}

  public async install(model: string): Promise<string | void> {
    this.logger.log(`Initiating installation for model: ${model}`);

    if (os.type() !== 'Linux') {
      this.logger.warn(
        `Non-Linux OS detected (${os.type()}). Manual installation required.`
      );
      throw new Error(
        'Ollama installation is supported only on Linux systems.'
      );
    }

    try {
      this.logger.debug(
        `Checking Ollama service availability at ${this.ollamaApiUrl}`
      );

      const isOllamaRunning = await this.checkOllamaApi();

      if (!isOllamaRunning) {
        this.logger.log(
          'Ollama service not detected. Starting installation...'
        );

        this.logger.debug('Installing Ollama via installation script...');
        await this.execAsync(
          'curl -sSL https://ollama.com/install.sh | sh',
          'Ollama installation'
        );

        this.logger.debug('Enabling Ollama user service...');
        await this.execAsync(
          'systemctl --user enable ollama',
          'Enable Ollama service'
        );

        this.logger.debug('Starting Ollama user service...');
        await this.execAsync(
          'systemctl --user start ollama',
          'Start Ollama service'
        );

        this.logger.debug('Verifying Ollama service startup...');
        const isStarted = await this.checkOllamaApi();

        if (!isStarted) {
          this.logger.error(
            'Ollama service failed to start after installation.'
          );
          throw new Error('Ollama service failed to start.');
        }

        this.logger.log('Ollama service installed and started successfully.');
      } else {
        this.logger.log('Ollama service is already running.');
      }

      this.logger.debug(`Checking if model ${model} is already installed...`);

      const isModelPulled = await this.checkModelExists(model);

      if (isModelPulled) {
        this.logger.warn(
          `Model ${model} is already installed. Skipping download.`
        );
        return 'already installed';
      }

      this.logger.log(`Downloading model: ${model}`);

      await this.execAsync(`ollama pull ${model}`, `Pull model ${model}`);

      this.logger.log(`Model ${model} downloaded successfully.`);

      return 'downloaded successfully';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Installation failed for model ${model}: ${message}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new Error(`Ollama installation or model pull failed: ${message}`);
    }
  }

  private async checkOllamaApi(): Promise<boolean> {
    this.logger.debug(`Sending GET request to ${this.ollamaApiUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.ollamaApiUrl, { timeout: 5000 })
      );

      if (response.status === 200) {
        this.logger.debug('Ollama API is accessible (status: 200).');

        return true;
      }

      this.logger.debug(
        `Ollama API returned non-200 status: ${response.status}`
      );

      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.debug(`Ollama API check failed: ${message}`);

      return false;
    }
  }

  private async checkModelExists(model: string): Promise<boolean> {
    this.logger.debug(`Listing installed models to check for ${model}`);

    try {
      const { stdout } = await this.execAsyncRaw('ollama list');

      const models = stdout
        .split('\n')
        .map(line => line.split(/\s+/)[0])
        .filter(Boolean);

      const exists = models.includes(model);

      this.logger.debug(
        `Model ${model} ${exists ? 'found' : 'not found'} in installed models.`
      );

      return exists;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.debug(`Failed to list models: ${message}`);

      return false;
    }
  }

  private async execAsync(command: string, context: string): Promise<void> {
    this.logger.debug(`Executing command for ${context}: ${command}`);

    try {
      const { stdout, stderr } = await this.execAsyncRaw(command);

      if (stdout) {
        this.logger.debug(`${context} stdout: ${stdout.trim()}`);
      }

      if (stderr) {
        this.logger.debug(`${context} stderr: ${stderr.trim()}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Command execution failed for ${context}: ${message}`,
        error instanceof Error ? error.stack : undefined
      );

      throw error;
    }
  }
}
