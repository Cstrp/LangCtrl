import { TelegrafExceptionFilter } from '../common/telegraf-exception.filter';
import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { BOT_COMMANDS, WIZARD_SCENE_IDS } from '../constants';
import { Wizard, WizardStep, Ctx, On } from 'nestjs-telegraf';
import { Logger, UseFilters } from '@nestjs/common';
import { WizardContext } from '../types';

@Wizard(WIZARD_SCENE_IDS.HELPER_SCENE)
export class HelperWizard {
  private readonly logger = new Logger(HelperWizard.name);

  @WizardStep(1)
  @UseFilters(TelegrafExceptionFilter)
  async onSceneEnter(@Ctx() ctx: WizardContext): Promise<void> {
    this.logger.log('Entering help wizard: Displaying command list');

    const commandsList = Object.values(BOT_COMMANDS)
      .map(cmd => `${cmd.emoji} **${cmd.name}**: ${cmd.description}`)
      .join('\n\n');

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        ...Object.values(BOT_COMMANDS).map(cmd => [
          {
            text: `${cmd.emoji} ${cmd.name}`,
            callback_data: `cmd_${cmd.name.slice(1)}`,
          },
        ]),
        [{ text: '🏁 Done', callback_data: 'done' }],
      ],
    };

    await ctx.reply(
      `👋 Here are all available commands:\n\n${commandsList}\n\n` +
        `Choose a command to learn more or select "Done" to exit.`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(2)
  @UseFilters(TelegrafExceptionFilter)
  async onCommandSelected(
    @Ctx()
    ctx: WizardContext & { wizard: { state: { selectedCommand?: string } } }
  ): Promise<void> {
    this.logger.log('Processing command selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No command selected. Please try again.');
      return;
    }

    const data = callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === 'done') {
      this.logger.log('User chose to exit help wizard');
      await ctx.reply(
        '🎉 Thanks for exploring! Use /start to configure your AI or /tune to set up your browser.'
      );
      await ctx.scene.leave();
      return;
    }

    const commandKey = data.replace('cmd_', '');
    const command = Object.values(BOT_COMMANDS).find(
      cmd => cmd.name.slice(1) === commandKey
    );

    if (!command) {
      this.logger.warn(`Invalid command selected: ${data}`);
      await ctx.reply('⚠️ Error: Unknown command.');
      return;
    }

    this.logger.log(`User selected command: ${command.name}`);
    ctx.wizard.state.selectedCommand = command.name;

    await ctx.reply(
      `${command.emoji} *${command.name}*\n\n${command.description}\n\n` +
        `What would you like to do next?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to commands', callback_data: 'back' }],
            [
              {
                text: `🚀 Run ${command.name}`,
                callback_data: `run_${commandKey}`,
              },
            ],
            [{ text: '🏁 Done', callback_data: 'done' }],
          ],
        },
      }
    );

    ctx.wizard.next();
  }

  @On('callback_query')
  @WizardStep(3)
  @UseFilters(TelegrafExceptionFilter)
  async onActionSelected(
    @Ctx()
    ctx: WizardContext & { wizard: { state: { selectedCommand?: string } } }
  ): Promise<void> {
    this.logger.log('Processing action selection');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
      this.logger.warn('No callback data received');
      await ctx.reply('⚠️ Error: No action selected. Please try again.');
      return;
    }

    const data = callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === 'done') {
      this.logger.log('User chose to exit help wizard');
      await ctx.reply(
        '🎉 Help session complete! Use /help anytime to explore commands.'
      );
      await ctx.scene.leave();
      return;
    }

    if (data === 'back') {
      this.logger.log('User chose to go back to command list');
      ctx.wizard.selectStep(1);
      await this.onSceneEnter(ctx);
      return;
    }

    if (data.startsWith('run_')) {
      const commandKey = data.replace('run_', '');
      const sceneMap: Record<string, string> = {
        start: WIZARD_SCENE_IDS.GREETER_SCENE,
        wizard: WIZARD_SCENE_IDS.GREETER_SCENE,
        tune: WIZARD_SCENE_IDS.TUNE_SCENE,
        report: WIZARD_SCENE_IDS.REPORT_SCENE,
        help: WIZARD_SCENE_IDS.HELPER_SCENE,
      };

      const sceneId = sceneMap[commandKey];
      if (sceneId) {
        this.logger.log(
          `Redirecting to scene: ${sceneId} for command: /${commandKey}`
        );
        await ctx.reply(`🚀 Running ${commandKey}...`);
        await ctx.scene.enter(sceneId);
      } else {
        this.logger.warn(`No scene mapped for command: ${commandKey}`);
        await ctx.reply('⚠️ This command is not fully implemented yet.');
        await ctx.scene.leave();
      }
      return;
    }

    this.logger.warn(`Invalid action selected: ${data}`);
    await ctx.reply('⚠️ Error: Unknown action.');
  }
}
