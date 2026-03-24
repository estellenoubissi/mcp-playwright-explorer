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

## 🤖 LLM Providers

### Anthropic (default)

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### OpenAI

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
```

### Groq 🆓 FREE

[Groq](https://console.groq.com/) offers a **free API** (with rate limits) compatible with the OpenAI format, using models like `llama-3.3-70b-versatile`.

1. Create a free API key at **https://console.groq.com/**
2. Configure your `.env`:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

3. Run the explorer:

```bash
npm run explore -- --url https://demo.playwright.dev/todomvc --feature "Todo List" --provider groq
```

Expected output:

```
🤖 LLM Provider: Groq (llama-3.3-70b-versatile) 🆓 FREE
🚀 Starting exploration of "Todo List" at https://demo.playwright.dev/todomvc
...
```

## 🗂️ Exploration multi-sous-menus

The `explore-submenus` command lets you explore a main navigation tab and **all its sub-menus** automatically, generating **one HTML report per sub-menu**.

### How it works

1. Navigates to the given URL (with optional authentication)
2. Detects all sub-menu links in the navigation bar (auto-detection or via a custom CSS selector)
3. Visits each sub-menu page sequentially
4. Calls the LLM to generate test cases for each sub-menu
5. Generates JSON + Markdown + HTML reports for each sub-menu

### Usage

```bash
# Explore a tab and all its sub-menus (auto-detect navigation)
npm run explore:submenus -- --url https://monapp.com/users --feature "Gestion utilisateurs"

# With a custom nav selector
npm run explore:submenus -- --url https://monapp.com/users --feature "Gestion utilisateurs" --nav-selector ".left-sidebar a"

# With headed browser and authentication
npm run explore:submenus -- --url https://monapp.com/users --feature "Gestion utilisateurs" --headed --auth

# Wait for a specific CSS selector before detecting menus (e.g. for lazy-loaded menus)
npm run explore:submenus -- --url https://monapp.com/preparation --feature "La préparation" --auth --wait-for "#preparation-tab"

# Or wait a fixed delay if the selector is unknown
npm run explore:submenus -- --url https://monapp.com/preparation --feature "La préparation" --auth --wait-timeout 3000
```

### Options

| Option | Description | Default |
|---|---|---|
| `-u, --url <url>` | URL of the main tab (required) | — |
| `-f, --feature <feature>` | Name of the main tab (required) | — |
| `--nav-selector <selector>` | CSS selector for the nav menu | auto-detection |
| `--headed` | Run browser in headed mode | headless |
| `-o, --output <dir>` | Output directory | `outputs/test-cases` |
| `--provider <provider>` | LLM provider: anthropic, openai or groq | anthropic |
| `--no-html` | Disable HTML report generation | — |
| `--auth` / `--no-auth` | Force/disable authentication | `AUTH_ENABLED` env var |
| `--wait-for <selector>` | CSS selector to wait for before detecting menus | — |
| `--wait-timeout <ms>` | Time in ms to wait after navigation before detecting menus | — |

### Generated files

For each detected sub-menu, three files are created in the output directory:

```
outputs/test-cases/
  liste-1234567890.json
  liste-1234567890.md
  liste-1234567890.html
  creation-1234567890.json
  creation-1234567890.md
  creation-1234567890.html
  ...
```

### Example output

```
🔐 Authentication successful
🚀 Starting sub-menu exploration of "Gestion utilisateurs" at https://monapp.com/users

🗂️ Detected 3 sub-menus: [Liste, Création, Permissions]

📂 Exploring sub-menu [1/3]: "Liste"
🤖 Calling LLM...

📂 Exploring sub-menu [2/3]: "Création"
🤖 Calling LLM...

📂 Exploring sub-menu [3/3]: "Permissions"
🤖 Calling LLM...

============================================
🎯 Sub-menu exploration complete!
   📂 3 sub-menus explored
   🧪 Total: 45 test cases generated
   ✅ 20 passants | ❌ 15 non-passants | 🔴 5 complexes | 🟢 5 simples
   📁 Reports saved in: outputs/test-cases/
============================================
```

## 📊 Output

Generated test cases are saved to `outputs/test-cases/` in both JSON and Markdown formats.
