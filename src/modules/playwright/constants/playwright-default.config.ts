import { ExtendedLaunchOptions } from '@/types';

export const PLAYWRIGHT_DEFAULT_CONFIG: ExtendedLaunchOptions = {
  headless: true,
  slowMo: 1000,
  timeout: 30000,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  enableStealth: true,
  takeInitialScreenshot: true,

  ignoreHTTPSErrors: true,
  viewportWidth: 1280,
  viewportHeight: 720,
  recordVideo: false,
  devtools: true,
  wsEndpoint: '',
  userAgent: '',
  browserName: 'chromium',
};
