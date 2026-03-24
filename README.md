# 🤖 MCP Playwright Explorer

> AI-powered exploratory test agent — Generate exhaustive test cases from a URL + feature name using Playwright & Claude AI (MCP).

[![CI](https://github.com/estellenoubissi/mcp-playwright-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/estellenoubissi/mcp-playwright-explorer/actions/workflows/ci.yml)

## 🚀 Quick Start

```bash
git clone https://github.com/estellenoubissi/mcp-playwright-explorer.git
cd mcp-playwright-explorer
npm install
npx playwright install chromium
cp .env.example .env
# Add your ANTHROPIC_API_KEY in .env
npm run explore -- --url https://your-app.com --feature "Login"
```

## 🛠️ CLI

```bash
# Explore a feature and generate test cases
npm run explore -- --url https://your-app.com --feature "Login"

# Run with headed browser
npm run explore -- --url https://your-app.com --feature "Dashboard" --headed

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Build TypeScript
npm run build

# Start MCP server
npm run mcp:server
```

## 📁 Project Structure

```
src/
  agent/
    analyzer.ts       # DOM & network analysis
    classifier.ts     # Test case classification & prioritization
    explorer.ts       # Main exploration orchestrator
  mcp/
    prompts/
      exploratoryPrompt.ts  # LLM prompt builder
    tools/
      navigate.ts     # Browser navigation
      screenshot.ts   # Screenshot capture
      inspect.ts      # DOM inspection
      network.ts      # Network call interception
    server.ts         # MCP server
  reporters/
    types.ts          # TypeScript types
    jsonReporter.ts   # JSON output
    markdownReporter.ts  # Markdown output
  index.ts            # CLI entry point
tests/
  unit/               # Jest unit tests
  e2e/                # Playwright E2E tests
outputs/              # Generated reports & screenshots
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and set your API key:

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BASE_URL=http://localhost:3000
HEADLESS=true
```

See `mcp.config.yaml` for full MCP/tool configuration.

## 📊 Output

Generated test cases are saved to `outputs/test-cases/` in both JSON and Markdown formats.
