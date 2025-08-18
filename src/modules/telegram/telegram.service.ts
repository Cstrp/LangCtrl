import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Update, Start, Command, Ctx, InjectBot } from 'nestjs-telegraf';
import { BOT_COMMANDS, WIZARD_SCENE_IDS } from './constants';
import { SceneContext } from './types';
import { Context, Telegraf } from 'telegraf';

@Update()
@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);

  constructor(@InjectBot() private readonly bot: Telegraf<Context>) {}

  public onModuleInit() {
    void this.bot.telegram.setMyCommands(
      Object.values(BOT_COMMANDS).map(cmd => ({
        command: cmd.name.slice(1),
        description: cmd.description,
      }))
    );
  }

  @Start()
  public async onStart(@Ctx() ctx: SceneContext): Promise<void> {
    this.logger.log('User started the bot.');
    await ctx.scene.enter(WIZARD_SCENE_IDS.GREETER_SCENE);
  }

  @Command('tune')
  public async onTuneCommand(@Ctx() ctx: SceneContext): Promise<void> {
    this.logger.log('Tuning...');
    await ctx.scene.enter(WIZARD_SCENE_IDS.TUNE_SCENE);
  }

  @Command('report')
  public async onReportCommand(@Ctx() ctx: SceneContext): Promise<void> {
    this.logger.log('Generating report...');
    await ctx.scene.enter(WIZARD_SCENE_IDS.REPORT_SCENE);
  }

  @Command('wizard')
  public async onWizardCommand(@Ctx() ctx: SceneContext): Promise<void> {
    this.logger.log('Entering wizard...');
    await ctx.scene.enter(WIZARD_SCENE_IDS.GREETER_SCENE);
  }

  @Command('help')
  public async onHelpCommand(@Ctx() ctx: SceneContext): Promise<void> {
    this.logger.log('Displaying help...');
    await ctx.scene.enter(WIZARD_SCENE_IDS.HELPER_SCENE);
  }
}
