import { OllamaInstallerService } from '../services/ollama-installer.service';
import { TelegrafExceptionFilter } from '../common/telegraf-exception.filter';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { CONFIG_PATH, WIZARD_SCENE_IDS } from '../constants';
import { Logger, UseFilters } from '@nestjs/common';
import { WizardContext } from '../types';
import * as fs from 'fs/promises';
import { sleep } from '@/utils';
import * as path from 'path';

@Wizard(WIZARD_SCENE_IDS.GREETER_SCENE)
export class GreeterWizard {
  private readonly logger = new Logger(GreeterWizard.name);
  private readonly configPath = CONFIG_PATH;

  private readonly providers: { key: string; label: string }[] = [
    { key: 'provider_openai', label: '🤖 OpenAI' },
    { key: 'provider_google', label: '🔍 Google' },
    { key: 'provider_ollama', label: '🦙 Ollama' },
  ];

  constructor(private readonly ollamaInstaller: OllamaInstallerService) {}

  @WizardStep(1)
  @UseFilters(TelegrafExceptionFilter)
  public async onSceneEnter(@Ctx() ctx: WizardContext) {
    if (!ctx.chat) return;

    const chat = ctx.chat;

    this.logger.log('🛠 Step 1 — Selecting provider');

    await ctx.telegram.sendChatAction(chat.id, 'typing');
    await sleep(800);

    await ctx.reply(
      '👋 *Welcome* to the AI-powered browser management system!\n\n' +
        'Please choose your AI provider:',
      {
        parse_mode: 'Markdown',
        reply_markup: this.providerKeyboard(),
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(2)
  @UseFilters(TelegrafExceptionFilter)
  public async onProviderSelected(
    @Ctx() ctx: WizardContext & { wizard: { state: { provider?: string } } }
  ) {
    if (!ctx.chat) return;

    const chat = ctx.chat;
    this.logger.log('🛠 Step 2 — Processing provider selection');

    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !('data' in callbackQuery)) {
      await ctx.reply('⚠️ No provider selected. Please try again.');
      return;
    }

    const providerKey = callbackQuery.data;
    ctx.wizard.state.provider = providerKey;

    await ctx.answerCbQuery();
    await ctx.telegram.sendChatAction(chat.id, 'typing');
    await sleep(600);

    await ctx.reply(
      `✅ You selected: *${this.formatProviderName(providerKey)}*`,
      { parse_mode: 'Markdown' }
    );

    await sleep(800);

    if (['provider_openai', 'provider_google'].includes(providerKey)) {
      await ctx.telegram.sendChatAction(chat.id, 'typing');
      await sleep(600);

      await ctx.reply('🔑 Please enter your *API key* for this provider:', {
        parse_mode: 'Markdown',
      });

      ctx.wizard.next();
    } else {
      try {
        await this.saveSettings({ provider: providerKey.split('_').pop() });
        this.logger.log(`💾 Provider ${providerKey} saved`);

        await ctx.reply('🔑 Please enter your *Ollama model*:', {
          parse_mode: 'Markdown',
        });

        ctx.wizard.selectStep(3);
      } catch (error) {
        this.logger.error('❌ Error saving provider', error);
        await ctx.reply('⚠️ Failed to save your selection. Please try again.');
      }
    }
  }

  @On('text')
  @WizardStep(3)
  @UseFilters(TelegrafExceptionFilter)
  public async onApiKey(
    @Ctx()
    ctx: WizardContext & {
      wizard: { state: { provider: string; apiKey?: string } };
    },
    @Message() msg: { text: string }
  ) {
    if (!ctx.chat) return;

    const chat = ctx.chat;
    this.logger.log('🛠 Step 3 — Entering API key');

    const apiKey = msg.text.trim();
    ctx.wizard.state.apiKey = apiKey;

    try {
      await this.saveSettings({
        provider: ctx.wizard.state.provider.split('_').pop(),
        apiKey: apiKey,
      });

      this.logger.log(
        `💾 Provider ${ctx.wizard.state.provider} and API key saved`
      );

      await ctx.telegram.sendChatAction(chat.id, 'typing');
      await sleep(600);
      await ctx.reply('✅ API key saved successfully.');

      await sleep(800);

      ctx.wizard.selectStep(4);
      await sleep(800);

      await this.onAvailableCommands(ctx);
    } catch (error) {
      this.logger.error('❌ Error saving API key', error);
      await ctx.reply('⚠️ Failed to save API key. Please try again.');
    }
  }

  @On('text')
  @WizardStep(4)
  @UseFilters(TelegrafExceptionFilter)
  public async onOllamaModel(
    @Ctx()
    ctx: WizardContext & {
      wizard: { state: { provider: string; model?: string } };
    },
    @Message() msg: { text: string }
  ) {
    if (!ctx.chat) return;

    const chat = ctx.chat;
    const model = msg.text.trim();
    ctx.wizard.state.model = model;

    this.logger.log(`🛠 Step 4 — Entering Ollama model: ${model}`);

    try {
      await this.saveSettings({
        provider: ctx.wizard.state.provider.split('_').pop(),
        model: model,
      });

      await ctx.telegram.sendChatAction(chat.id, 'typing');
      await sleep(600);
      await ctx.reply(`✅ Model *${model}* saved successfully.`, {
        parse_mode: 'Markdown',
      });

      await ctx.telegram.sendChatAction(chat.id, 'typing');
      await sleep(800);
      await ctx.reply(`⬇️ Installing Ollama model *${model}*...`, {
        parse_mode: 'Markdown',
      });

      const result = await this.ollamaInstaller.install(model);

      await sleep(1000);
      await ctx.reply(
        `🎉 Model *${model}* ${result ?? 'installed successfully!'}`,
        { parse_mode: 'Markdown' }
      );

      ctx.wizard.selectStep(4);
      await sleep(800);
      await this.onAvailableCommands(ctx);
    } catch (error) {
      this.logger.error('❌ Error saving or installing Ollama model', error);
      await ctx.reply(
        '⚠️ Failed to save or install the model. Please try again.'
      );
    }
  }

  @WizardStep(5)
  @UseFilters(TelegrafExceptionFilter)
  public async onAvailableCommands(@Ctx() ctx: WizardContext) {
    if (!ctx.chat) return;

    const chat = ctx.chat;
    this.logger.log('🛠 Step 5 — Showing available commands');

    await ctx.telegram.sendChatAction(chat.id, 'typing');
    await sleep(800);

    const commands = await ctx.telegram.getMyCommands();

    await ctx.reply(
      '🎉 Setup complete! You can now use the bot.\n\n' +
        '📜 *Available commands:*\n\n',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: commands.map(cmd => [
            { text: `${cmd.command}`, callback_data: cmd.command },
          ]),
        },
      }
    );

    await ctx.scene.leave();
  }

  private async saveSettings(settings: Record<string, unknown>): Promise<void> {
    const configDir = path.dirname(this.configPath);

    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    await fs.writeFile(this.configPath, JSON.stringify(settings, null, 2));
  }

  private providerKeyboard(): InlineKeyboardMarkup {
    return {
      inline_keyboard: this.providers.map(p => [
        { text: p.label, callback_data: p.key },
      ]),
    };
  }

  private formatProviderName(key: string): string {
    return this.providers.find(p => p.key === key)?.label || key;
  }
}
