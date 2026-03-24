import { Command } from 'commander';
import dotenv from 'dotenv';
import { Explorer } from './agent/explorer';
dotenv.config();

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
  .action(async (options) => {
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

    await new Explorer().explore({
      url: options.url,
      feature: options.feature,
      headless: !options.headed,
      outputDir: options.output,
    });
  });

program.parse();
