import { TelegrafExceptionFilter } from '../common/telegraf-exception.filter';
import { Wizard, WizardStep, Ctx, On, Message } from 'nestjs-telegraf';
import { CONFIG_PATH, WIZARD_SCENE_IDS } from '../constants';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { Logger, UseFilters } from '@nestjs/common';
import { ExtendedLaunchOptions } from '@/types';
import { WizardContext } from '../types';
import { dirname } from 'path';

@Wizard(WIZARD_SCENE_IDS.TUNE_SCENE)
export class TunerWizard {
  private readonly logger = new Logger(TunerWizard.name);

  private readonly configPath = CONFIG_PATH;

  private readonly browsers: { text: string; callback_data: string }[] = [
    { text: '🌐 Chromium', callback_data: 'browser_chromium' },
    { text: '🦊 Firefox', callback_data: 'browser_firefox' },
    { text: '🍎 WebKit', callback_data: 'browser_webkit' },
  ];

  @WizardStep(1)
  @UseFilters(TelegrafExceptionFilter)
  async onSceneEnter(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 1 — Starting Playwright configuration');

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 800));

    await ctx.reply(
      '👋 *Welcome to the Playwright Setup Wizard!* \n\n' +
        'Let’s configure your browser. First, choose the browser type:',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [this.browsers],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(2)
  @UseFilters(TelegrafExceptionFilter)
  async onBrowserSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 2 — Processing browser selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No browser selected. Please try again.');
      return;
    }

    const browser = callbackQuery.data;
    ctx.wizard.state.browserName = browser.split('_').pop() as
      | 'chromium'
      | 'firefox'
      | 'webkit';

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ You selected: *${ctx.wizard.state.browserName}*\n\n` +
        `Would you like to enable stealth mode to avoid detection?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🕵️ Yes', callback_data: 'stealth_true' },
              { text: '🚫 No', callback_data: 'stealth_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(3)
  @UseFilters(TelegrafExceptionFilter)
  async onStealthSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 3 — Processing stealth mode selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    const stealth = callbackQuery.data === 'stealth_true';
    ctx.wizard.state.enableStealth = stealth;

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Stealth mode: *${stealth ? 'Enabled' : 'Disabled'}*\n\n` +
        `Would you like to run the browser in headless mode?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🖥 Yes', callback_data: 'headless_true' },
              { text: '🚫 No', callback_data: 'headless_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(4)
  @UseFilters(TelegrafExceptionFilter)
  async onHeadlessSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 4 — Processing headless mode selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    const headless = callbackQuery.data === 'headless_true';
    ctx.wizard.state.headless = headless;

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Headless mode: *${headless ? 'Enabled' : 'Disabled'}*\n\n` +
        `Enter slow motion delay in milliseconds (e.g., 50 for 50ms, or 0 for none):`,
      { parse_mode: 'Markdown' }
    );

    ctx.wizard.next();
  }

  @On('text')
  @WizardStep(5)
  @UseFilters(TelegrafExceptionFilter)
  async onSlowMoInput(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } },
    @Message() msg: { text: string }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 5 — Processing slow motion delay input');

    const slowMoStr = msg.text.trim();
    const slowMo = parseInt(slowMoStr);

    if (isNaN(slowMo) || slowMo < 0) {
      this.logger.warn(`Invalid slowMo input: ${slowMoStr}`);
      await ctx.reply(
        '⚠️ Invalid input. Please enter a non-negative number (e.g., 50 or 0).',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    ctx.wizard.state.slowMo = slowMo;

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Slow motion delay: *${slowMo}ms*\n\n` +
        `Enter a custom user agent string or select "Default":`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Default', callback_data: 'useragent_default' }],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(6)
  @UseFilters(TelegrafExceptionFilter)
  async onUserAgentSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 6 — Processing user agent selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    await ctx.answerCbQuery();

    if (callbackQuery.data === 'useragent_default') {
      ctx.wizard.state.userAgent = undefined;

      await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
      await new Promise(resolve => setTimeout(resolve, 600));

      await ctx.reply(
        `✅ User agent: *Default*\n\n` +
          `Choose a viewport size or select "Custom" to enter manually:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 375x667 (Mobile)',
                  callback_data: 'viewport_375_667',
                },
                {
                  text: '💻 1280x720 (HD)',
                  callback_data: 'viewport_1280_720',
                },
              ],
              [
                {
                  text: '🖥 1920x1080 (Full HD)',
                  callback_data: 'viewport_1920_1080',
                },
                { text: '✏️ Custom', callback_data: 'viewport_custom' },
              ],
            ],
          },
        }
      );

      ctx.wizard.selectStep(7);
      return;
    }

    await ctx.reply(
      '✏️ Please enter a custom user agent string (e.g., "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"):',
      { parse_mode: 'Markdown' }
    );

    ctx.wizard.next();
  }

  @On('text')
  @WizardStep(7)
  @UseFilters(TelegrafExceptionFilter)
  async onCustomUserAgent(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } },
    @Message() msg: { text: string }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 7 — Processing custom user agent input');

    const userAgent = msg.text.trim();
    ctx.wizard.state.userAgent = userAgent;

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ User agent set: *${userAgent.substring(0, 30)}...*\n\n` +
        `Choose a viewport size or select "Custom" to enter manually:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📱 375x667 (Mobile)',
                callback_data: 'viewport_375_667',
              },
              { text: '💻 1280x720 (HD)', callback_data: 'viewport_1280_720' },
            ],
            [
              {
                text: '🖥 1920x1080 (Full HD)',
                callback_data: 'viewport_1920_1080',
              },
              { text: '✏️ Custom', callback_data: 'viewport_custom' },
            ],
          ],
        },
      }
    );

    ctx.wizard.selectStep(8);
  }

  @On('callback_query')
  @WizardStep(8)
  @UseFilters(TelegrafExceptionFilter)
  async onViewportSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 8 — Processing viewport selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No viewport selected. Please try again.');
      return;
    }

    const data = callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === 'viewport_custom') {
      await ctx.reply(
        '✏️ Please enter the viewport size in the format "width height" (e.g., "1280 720"):',
        { parse_mode: 'Markdown' }
      );
      ctx.wizard.next();
      return;
    }

    const [width, height] = data
      .replace('viewport_', '')
      .split('_')
      .map(v => parseInt(v));
    ctx.wizard.state.viewportWidth = width;
    ctx.wizard.state.viewportHeight = height;

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Viewport set: *${width}x${height}*\n\n` +
        `Would you like to take an initial screenshot when launching the browser?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📸 Yes', callback_data: 'screenshot_true' },
              { text: '🚫 No', callback_data: 'screenshot_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.selectStep(10);
  }

  @On('text')
  @WizardStep(9)
  @UseFilters(TelegrafExceptionFilter)
  async onCustomViewport(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } },
    @Message() msg: { text: string }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 9 — Processing custom viewport input');

    const [widthStr, heightStr] = msg.text.trim().split(/\s+/);
    const width = parseInt(widthStr);
    const height = parseInt(heightStr);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      this.logger.warn(`Invalid viewport input: ${msg.text}`);
      await ctx.reply(
        '⚠️ Invalid format. Please enter the viewport size as "width height" (e.g., "1280 720").',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    ctx.wizard.state.viewportWidth = width;
    ctx.wizard.state.viewportHeight = height;

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Viewport set: *${width}x${height}*\n\n` +
        `Would you like to take an initial screenshot when launching the browser?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📸 Yes', callback_data: 'screenshot_true' },
              { text: '🚫 No', callback_data: 'screenshot_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(10)
  @UseFilters(TelegrafExceptionFilter)
  async onScreenshotSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 10 — Processing screenshot selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    const screenshot = callbackQuery.data === 'screenshot_true';
    ctx.wizard.state.takeInitialScreenshot = screenshot;

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Initial screenshot: *${screenshot ? 'Enabled' : 'Disabled'}*\n\n` +
        `Would you like to record a video of browser actions?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🎥 Yes', callback_data: 'video_true' },
              { text: '🚫 No', callback_data: 'video_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(11)
  @UseFilters(TelegrafExceptionFilter)
  async onVideoSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 11 — Processing video recording selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    const video = callbackQuery.data === 'video_true';
    ctx.wizard.state.recordVideo = video;

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    if (video) {
      await ctx.reply(
        `🎥 Please enter the directory for video recordings (e.g., "./videos") or press "Default" to use "./playwright-videos":`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📁 Default', callback_data: 'video_dir_default' }],
            ],
          },
        }
      );
      ctx.wizard.next();
      return;
    }

    await ctx.reply(
      `✅ Video recording: *Disabled*\n\n` +
        `Would you like to ignore HTTPS errors?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔒 Yes', callback_data: 'https_errors_true' },
              { text: '🚫 No', callback_data: 'https_errors_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.selectStep(13);
  }

  @On('callback_query')
  @WizardStep(12)
  @UseFilters(TelegrafExceptionFilter)
  async onVideoDirSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 12 — Processing video directory selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    await ctx.answerCbQuery();

    if (callbackQuery.data === 'video_dir_default') {
      ctx.wizard.state.recordVideo = { dir: './playwright-videos' };

      await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
      await new Promise(resolve => setTimeout(resolve, 600));

      await ctx.reply(
        `✅ Video directory set: *./playwright-videos*\n\n` +
          `Would you like to ignore HTTPS errors?`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔒 Yes', callback_data: 'https_errors_true' },
                { text: '🚫 No', callback_data: 'https_errors_false' },
              ],
            ],
          },
        }
      );

      ctx.wizard.selectStep(13);
      return;
    }

    await ctx.reply(
      '✏️ Please enter a custom directory for video recordings (e.g., "./videos"):',
      { parse_mode: 'Markdown' }
    );

    ctx.wizard.next();
  }

  @On('text')
  @WizardStep(13)
  @UseFilters(TelegrafExceptionFilter)
  async onVideoDir(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } },
    @Message() msg: { text: string }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 13 — Processing video directory input');

    const dir = msg.text.trim() || './playwright-videos';
    ctx.wizard.state.recordVideo = { dir };

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    await ctx.reply(
      `✅ Video directory set: *${dir}*\n\n` +
        `Would you like to ignore HTTPS errors?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔒 Yes', callback_data: 'https_errors_true' },
              { text: '🚫 No', callback_data: 'https_errors_false' },
            ],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(14)
  @UseFilters(TelegrafExceptionFilter)
  async onHttpsErrorsSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 14 — Processing HTTPS errors selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No selection made. Please try again.');
      return;
    }

    const ignoreHTTPSErrors = callbackQuery.data === 'https_errors_true';
    ctx.wizard.state.ignoreHTTPSErrors = ignoreHTTPSErrors;

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    await new Promise(resolve => setTimeout(resolve, 600));

    const settings = ctx.wizard.state;
    const videoDir =
      settings.recordVideo && typeof settings.recordVideo === 'object'
        ? settings.recordVideo.dir
        : 'Disabled';

    const summary =
      `🎯 *Configuration Summary*\n\n` +
      `- Browser: *${settings.browserName || 'chromium'}*\n` +
      `- Stealth mode: *${settings.enableStealth ? 'Enabled' : 'Disabled'}*\n` +
      `- Headless: *${settings.headless ? 'Enabled' : 'Disabled'}*\n` +
      `- Slow motion: *${settings.slowMo || 0}ms*\n` +
      `- User agent: *${settings.userAgent || 'Default'}*\n` +
      `- Viewport: *${settings.viewportWidth || 1280}x${settings.viewportHeight || 720}*\n` +
      `- Initial screenshot: *${settings.takeInitialScreenshot ? 'Enabled' : 'Disabled'}*\n` +
      `- Record video: *${videoDir}*\n` +
      `- Ignore HTTPS errors: *${settings.ignoreHTTPSErrors ? 'Enabled' : 'Disabled'}*\n\n` +
      `Confirm these settings?`;

    await ctx.reply(summary, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Save These Settings', callback_data: 'save_settings' },
            { text: '❌ Cancel', callback_data: 'cancel_wizard' },
          ],
        ],
      },
    });

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(15)
  @UseFilters(TelegrafExceptionFilter)
  async onFinalAction(
    @Ctx() ctx: WizardContext & { wizard: { state: ExtendedLaunchOptions } }
  ): Promise<void> {
    if (!ctx.chat) {
      this.logger.warn('No chat context available');
      return;
    }

    this.logger.log('🛠 Step 15 — Processing final action');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No action selected. Please try again.');
      return;
    }

    await ctx.answerCbQuery();

    if (callbackQuery.data === 'save_settings') {
      await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

      try {
        let existingSettings = {};

        try {
          const existingData = await readFile(this.configPath, 'utf-8');

          existingSettings = JSON.parse(existingData);
        } catch {
          // File doesn't exist or is invalid, continue with empty settings
        }

        const mergedSettings = {
          ...existingSettings,
          ...ctx.wizard.state,
        };

        const configDir = dirname(this.configPath);
        await mkdir(configDir, { recursive: true });
        await writeFile(
          this.configPath,
          JSON.stringify(mergedSettings, null, 2)
        );

        this.logger.log(
          `💾 Playwright configuration saved to ${this.configPath}`
        );

        await ctx.reply(
          `🎉 *Playwright setup complete!*\n\n` +
            `Your browser configuration has been saved.\n\n` +
            `You can now use **/tune** to reconfigure or **/start** to set up your AI.`,
          {
            parse_mode: 'Markdown',
          }
        );
      } catch (error) {
        this.logger.error('❌ Error saving Playwright configuration', error);
        await ctx.reply('⚠️ Failed to save configuration. Please try again.');
        return;
      }
    } else if (callbackQuery.data === 'cancel_wizard') {
      await ctx.reply(
        `❌ Configuration cancelled. Your existing settings remain unchanged.\n\n` +
          `Use **/tune** to try again or **/start** to set up your AI.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      this.logger.warn(`Unknown final action: ${callbackQuery.data}`);
      await ctx.reply('⚠️ Error: Invalid action. Configuration cancelled.');
    }

    await ctx.scene.leave();
  }
}
