import path from 'path';

export const CONFIG_PATH = path.join(process.cwd(), '.config', 'settings.json');

export const WIZARD_SCENE_IDS = {
  GREETER_SCENE: 'GREETER_WIZARD_SCENE',
  HELPER_SCENE: 'HELPER_WIZARD_SCENE',
  TUNE_SCENE: 'TUNE_WIZARD_SCENE',
  REPORT_SCENE: 'REPORT_WIZARD_SCENE',
} as const;

export const BOT_COMMANDS = {
  start: {
    name: '/start',
    emoji: '🚀',
    description:
      'Launch the bot and configure your AI model and provider (Google, OpenAI, or Ollama). With Ollama, download any model you want!',
  },
  wizard: {
    name: '/wizard',
    emoji: '🧙',
    description:
      'Dive into the AI configuration wizard to set up your preferred model and provider (Google, OpenAI, or Ollama).',
  },
  report: {
    name: '/report',
    emoji: '📊',
    description:
      'Generate a detailed report of AI and browser activities, including screenshots (coming soon).',
  },
  tune: {
    name: '/tune',
    emoji: '⚙️',
    description:
      'Set up your browser with custom or default configurations for seamless automation.',
  },
  help: {
    name: '/help',
    emoji: '❓',
    description:
      'Explore all available bot commands and learn how to use them.',
  },
} as const;
