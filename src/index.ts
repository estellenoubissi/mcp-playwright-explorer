import { Command } from 'commander';
import dotenv from 'dotenv';
import { Explorer } from './agent/explorer';
import { SubMenuExplorer } from './agent/subMenuExplorer';
dotenv.config();

function validateProvider(options: { provider?: string }): void {
  const provider = options.provider || process.env.LLM_PROVIDER || 'anthropic';
  process.env.LLM_PROVIDER = provider;

  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in .env');
    process.exit(1);
  }
  if (provider === 'groq' && !process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is not set in .env');
    process.exit(1);
  }
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set in .env');
    process.exit(1);
  }
}

function resolveAuthFlag(options: { auth?: boolean }): boolean | undefined {
  return options.auth === true ? true : options.auth === false ? false : undefined;
}

function validateAuthCredentials(authEnabled: boolean): void {
  if (authEnabled) {
    if (!process.env.AUTH_USERNAME) {
      console.error('❌ AUTH_USERNAME is not set in .env (required when auth is enabled)');
      process.exit(1);
    }
    if (!process.env.AUTH_PASSWORD) {
      console.error('❌ AUTH_PASSWORD is not set in .env (required when auth is enabled)');
      process.exit(1);
    }
  }
}

const program = new Command();
program
  .name('mcp-playwright-explorer')
  .description('AI-powered exploratory test agent using Playwright + MCP (supports Anthropic, OpenAI & Groq)')
  .version('1.0.0');

program
  .command('explore')
  .description('Explore a feature and generate test cases')
  .requiredOption('-u, --url <url>', 'URL of the application to test')
  .requiredOption('-f, --feature <feature>', 'Feature / tab name to explore')
  .option('--headed', 'Run browser in headed mode', false)
  .option('-o, --output <dir>', 'Output directory', 'outputs/test-cases')
  .option('--provider <provider>', 'LLM provider: anthropic, openai or groq')
  .option('--no-html', 'Disable HTML report generation')
  .option('--auth', 'Force authentication before exploration (overrides AUTH_ENABLED in .env)')
  .option('--no-auth', 'Disable authentication before exploration (overrides AUTH_ENABLED in .env)')
  .action(async (options) => {
    validateProvider(options);

    const authFlag = resolveAuthFlag(options);
    const authEnabled = authFlag !== undefined ? authFlag : process.env.AUTH_ENABLED === 'true';
    validateAuthCredentials(authEnabled);

    await new Explorer().explore({
      url: options.url,
      feature: options.feature,
      headless: !options.headed,
      outputDir: options.output,
      html: options.html,
      auth: authFlag,
    });
  });

program
  .command('explore-submenus')
  .description('Explore a main tab and all its sub-menus, generating one HTML report per sub-menu')
  .requiredOption('-u, --url <url>', 'URL of the main tab to explore')
  .requiredOption('-f, --feature <feature>', 'Name of the main tab / feature to explore')
  .option('--nav-selector <selector>', 'CSS selector for the navigation menu (default: auto-detection)')
  .option('--headed', 'Run browser in headed mode', false)
  .option('-o, --output <dir>', 'Output directory', 'outputs/test-cases')
  .option('--provider <provider>', 'LLM provider: anthropic, openai or groq')
  .option('--no-html', 'Disable HTML report generation')
  .option('--auth', 'Force authentication before exploration (overrides AUTH_ENABLED in .env)')
  .option('--no-auth', 'Disable authentication before exploration (overrides AUTH_ENABLED in .env)')
  .action(async (options) => {
    validateProvider(options);

    const authFlag = resolveAuthFlag(options);
    const authEnabled = authFlag !== undefined ? authFlag : process.env.AUTH_ENABLED === 'true';
    validateAuthCredentials(authEnabled);

    await new SubMenuExplorer().exploreWithSubMenus({
      url: options.url,
      feature: options.feature,
      navSelector: options.navSelector,
      headless: !options.headed,
      outputDir: options.output,
      html: options.html,
      auth: authFlag,
    });
  });

program.parse();
