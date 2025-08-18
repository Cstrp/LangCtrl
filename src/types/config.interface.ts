export interface AppConfig {
  // LLM Configuration
  provider: 'openai' | 'google' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;

  // Browser Configuration
  browserName: 'chromium' | 'firefox' | 'webkit';
  enableStealth: boolean;
  headless: boolean;
  slowMo: number;
  viewportWidth: number;
  viewportHeight: number;
  recordVideo: boolean;
  ignoreHTTPSErrors: boolean;
}

export interface LLMConfig {
  provider: 'openai' | 'google' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface BrowserConfig {
  browserName: 'chromium' | 'firefox' | 'webkit';
  enableStealth: boolean;
  headless: boolean;
  slowMo: number;
  viewportWidth: number;
  viewportHeight: number;
  recordVideo: boolean;
  ignoreHTTPSErrors: boolean;
}
