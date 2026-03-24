## 🎯 Objectif

Ajouter le support OpenAI (GPT-4o) comme alternative à Anthropic Claude. Le provider LLM est choisi via `LLM_PROVIDER=openai` ou `LLM_PROVIDER=anthropic` dans le `.env`.

## 📦 Fichiers modifiés

- **`src/agent/llmClient.ts`** — Nouveau client LLM unifié supportant Anthropic et OpenAI
- **`src/agent/explorer.ts`** — Refactorisé pour utiliser `LLMClient` au lieu d'Anthropic directement
- **`src/index.ts`** — Ajout de l'option `--provider` dans le CLI

## 🛠️ Utilisation

### Via .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o

### Via CLI
npm run explore -- --url https://demo.playwright.dev/todomvc --feature "Todo List" --provider openai
npm run explore -- --url https://demo.playwright.dev/todomvc --feature "Todo List" --provider anthropic