import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium, Page } from 'playwright';
import { navigateTo } from './tools/navigate';
import { takeScreenshot } from './tools/screenshot';
import { inspectDOM } from './tools/inspect';
import { setupNetworkInterceptor } from './tools/network';
import { NetworkCall } from '../reporters/types';

let page: Page | null = null;
let networkCalls: NetworkCall[] = [];

const server = new Server(
  { name: 'mcp-playwright-explorer', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'browser_navigate',
      description: 'Navigate to a URL',
      inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    },
    {
      name: 'browser_screenshot',
      description: 'Take a full-page screenshot',
      inputSchema: { type: 'object', properties: { label: { type: 'string' } }, required: ['label'] },
    },
    {
      name: 'dom_inspect',
      description: 'Inspect interactive DOM elements',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'network_get_calls',
      description: 'Get captured XHR/fetch calls',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!page) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
    networkCalls = setupNetworkInterceptor(page);
  }

  switch (name) {
    case 'browser_navigate':
      await navigateTo(page, { url: args?.url as string });
      return { content: [{ type: 'text', text: `Navigated to ${args?.url}` }] };
    case 'browser_screenshot': {
      const fp = await takeScreenshot(page, args?.label as string);
      return { content: [{ type: 'text', text: `Screenshot saved: ${fp}` }] };
    }
    case 'dom_inspect': {
      const elements = await inspectDOM(page);
      return { content: [{ type: 'text', text: JSON.stringify(elements, null, 2) }] };
    }
    case 'network_get_calls':
      return { content: [{ type: 'text', text: JSON.stringify(networkCalls, null, 2) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Playwright Explorer server running on stdio');
}
main().catch(console.error);
