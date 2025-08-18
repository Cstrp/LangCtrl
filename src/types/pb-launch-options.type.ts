import { chromium } from 'playwright-extra';

export type PlaywrightLaunchOptions = Parameters<typeof chromium.launch>[0];

export type AdvancedLaunchOptions = {
  browserName?: string;
  enableStealth?: boolean;
  wsEndpoint?: string;
  takeInitialScreenshot?: boolean;
  recordVideo?:
    | boolean
    | { dir?: string; size?: { width: number; height: number } };
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
  ignoreHTTPSErrors?: boolean;
};

export type ExtendedLaunchOptions = PlaywrightLaunchOptions &
  AdvancedLaunchOptions;
