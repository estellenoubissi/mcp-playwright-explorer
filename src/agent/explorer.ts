import { chromium } from 'playwright';
import { LLMClient } from './llmClient';
import { buildExploratoryPrompt } from '../mcp/prompts/exploratoryPrompt';
import { Analyzer } from './analyzer';
import { Classifier } from './classifier';
import { JsonReporter } from '../reporters/jsonReporter';
import { MarkdownReporter } from '../reporters/markdownReporter';
import { ExplorationResult, TestCase } from '../reporters/types';

export interface ExplorerOptions {
  url: string;
  feature: string;
  headless?: boolean;
  outputDir?: string;
}

export class Explorer {
  private llm: LLMClient;
  private classifier = new Classifier();
  private jsonReporter = new JsonReporter();
  private markdownReporter = new MarkdownReporter();

  constructor() {
    this.llm = new LLMClient();
  }

  async explore(options: ExplorerOptions): Promise<ExplorationResult> {
    const { url, feature, headless = true } = options;
    console.log(`\n🚀 Starting exploration of \