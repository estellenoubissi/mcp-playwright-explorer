import fs from 'fs';
import path from 'path';
import { ExplorationResult, TestCase } from './types';

export class HtmlReporter {
  private outputDir: string;

  constructor(outputDir = 'outputs/test-cases') {
    this.outputDir = outputDir;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  generate(result: ExplorationResult): string {
    const html = this.buildHtml(result);
    const filename = `${result.feature.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.html`;
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`✅ HTML report saved: ${filepath}`);
    return filepath;
  }

  private buildHtml(result: ExplorationResult): string {
    const generatedAt = new Date(result.exploredAt).toLocaleString('fr-FR');
    const testCasesJson = JSON.stringify(result.testCases);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🧪 Rapport — ${this.escapeHtml(result.feature)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }

    /* ── Hero ── */
    .hero { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: #fff; padding: 2.5rem 2rem; }
    .hero h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; }
    .hero .meta { font-size: 0.9rem; opacity: 0.8; line-height: 1.8; }

    /* ── Stats ── */
    .stats { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.5rem 2rem; }
    .stat-card { flex: 1 1 160px; border-radius: 12px; padding: 1.25rem 1.5rem; color: #fff; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .stat-card .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-card .stat-label { font-size: 0.85rem; opacity: 0.9; }
    .stat-passant  { background: #22c55e; }
    .stat-non      { background: #ef4444; }
    .stat-complexe { background: #f97316; }
    .stat-simple   { background: #3b82f6; }

    /* ── Filters ── */
    .filters { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; position: sticky; top: 0; z-index: 10; }
    .filter-group { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .filter-group label { font-size: 0.8rem; font-weight: 600; color: #64748b; margin-right: 0.25rem; }
    .filter-btn { border: 1.5px solid #cbd5e1; background: #f8fafc; color: #475569; border-radius: 20px; padding: 0.3rem 0.85rem; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover { border-color: #94a3b8; background: #f1f5f9; }
    .filter-btn.active { border-color: transparent; color: #fff; }
    .filter-btn.active[data-cat="ALL"]      { background: #475569; }
    .filter-btn.active[data-cat="PASSANT"]  { background: #22c55e; }
    .filter-btn.active[data-cat="NON_PASSANT"] { background: #ef4444; }
    .filter-btn.active[data-cat="COMPLEXE"] { background: #f97316; }
    .filter-btn.active[data-cat="SIMPLE"]   { background: #3b82f6; }
    .filter-btn.active[data-pri="ALL"]      { background: #475569; }
    .filter-btn.active[data-pri="CRITIQUE"] { background: #dc2626; }
    .filter-btn.active[data-pri="HAUTE"]    { background: #ea580c; }
    .filter-btn.active[data-pri="MOYENNE"]  { background: #ca8a04; }
    .filter-btn.active[data-pri="BASSE"]    { background: #16a34a; }
    .search-input { border: 1.5px solid #cbd5e1; border-radius: 20px; padding: 0.3rem 1rem; font-size: 0.85rem; outline: none; min-width: 200px; transition: border-color 0.15s; }
    .search-input:focus { border-color: #3b82f6; }
    .counter { margin-left: auto; font-size: 0.82rem; color: #64748b; white-space: nowrap; }

    /* ── Cards ── */
    .cards { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1rem; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); overflow: hidden; }
    .card-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1.25rem; cursor: pointer; user-select: none; }
    .card-header:hover { filter: brightness(0.96); }
    .card[data-cat="PASSANT"]  .card-header { background: #dcfce7; border-left: 4px solid #22c55e; }
    .card[data-cat="NON_PASSANT"] .card-header { background: #fee2e2; border-left: 4px solid #ef4444; }
    .card[data-cat="COMPLEXE"] .card-header { background: #ffedd5; border-left: 4px solid #f97316; }
    .card[data-cat="SIMPLE"]   .card-header { background: #dbeafe; border-left: 4px solid #3b82f6; }
    .card-id { font-size: 0.78rem; font-weight: 700; color: #64748b; white-space: nowrap; }
    .card-title { font-weight: 600; font-size: 0.95rem; flex: 1; }
    .badges { display: flex; gap: 0.35rem; flex-shrink: 0; flex-wrap: wrap; }
    .badge { font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 20px; }
    .badge-pri-CRITIQUE { background: #fee2e2; color: #dc2626; }
    .badge-pri-HAUTE    { background: #ffedd5; color: #c2410c; }
    .badge-pri-MOYENNE  { background: #fef9c3; color: #a16207; }
    .badge-pri-BASSE    { background: #dcfce7; color: #15803d; }
    .badge-auto  { background: #f0fdf4; color: #15803d; }
    .badge-noauto { background: #fef2f2; color: #b91c1c; }
    .badge-complexite { background: #f8fafc; color: #475569; }
    .chevron { margin-left: auto; transition: transform 0.2s; font-size: 0.75rem; color: #94a3b8; }
    .card.open .chevron { transform: rotate(180deg); }
    .card-body { display: none; padding: 1.25rem; border-top: 1px solid #e2e8f0; }
    .card.open .card-body { display: block; }
    .section-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.5rem; margin-top: 1rem; }
    .section-title:first-child { margin-top: 0; }
    ul.list { padding-left: 1.25rem; }
    ul.list li, ol.list li { font-size: 0.9rem; line-height: 1.7; }
    ol.list { padding-left: 1.25rem; }
    pre { background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 1rem; font-size: 0.82rem; overflow-x: auto; }
    .result-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.9rem; color: #15803d; }
    .hidden { display: none !important; }

    @media (max-width: 600px) {
      .hero h1 { font-size: 1.3rem; }
      .filters { padding: 0.75rem 1rem; }
      .cards { padding: 1rem; }
      .counter { margin-left: 0; }
    }
  </style>
</head>
<body>

<header class="hero">
  <h1>🧪 Rapport de Tests Exploratoires — ${this.escapeHtml(result.feature)}</h1>
  <div class="meta">
    <div>🌐 URL analysée : <strong>${this.escapeHtml(result.url)}</strong></div>
    <div>📅 Généré le : <strong>${generatedAt}</strong></div>
    <div>📋 Total cas de tests : <strong>${result.totalTestCases}</strong></div>
  </div>
</header>

<section class="stats">
  <div class="stat-card stat-passant">
    <span class="stat-value">${result.summary.passant}</span>
    <span class="stat-label">✅ Passants</span>
  </div>
  <div class="stat-card stat-non">
    <span class="stat-value">${result.summary.non_passant}</span>
    <span class="stat-label">❌ Non-Passants</span>
  </div>
  <div class="stat-card stat-complexe">
    <span class="stat-value">${result.summary.complexe}</span>
    <span class="stat-label">🔴 Complexes</span>
  </div>
  <div class="stat-card stat-simple">
    <span class="stat-value">${result.summary.simple}</span>
    <span class="stat-label">🟢 Simples</span>
  </div>
</section>

<nav class="filters">
  <div class="filter-group">
    <label>Catégorie :</label>
    <button class="filter-btn active" data-cat="ALL">Tous</button>
    <button class="filter-btn" data-cat="PASSANT">✅ Passants</button>
    <button class="filter-btn" data-cat="NON_PASSANT">❌ Non-Passants</button>
    <button class="filter-btn" data-cat="COMPLEXE">🔴 Complexes</button>
    <button class="filter-btn" data-cat="SIMPLE">🟢 Simples</button>
  </div>
  <div class="filter-group">
    <label>Priorité :</label>
    <button class="filter-btn active" data-pri="ALL">Toutes</button>
    <button class="filter-btn" data-pri="CRITIQUE">CRITIQUE</button>
    <button class="filter-btn" data-pri="HAUTE">HAUTE</button>
    <button class="filter-btn" data-pri="MOYENNE">MOYENNE</button>
    <button class="filter-btn" data-pri="BASSE">BASSE</button>
  </div>
  <input class="search-input" type="search" placeholder="🔍 Rechercher un cas de test…" id="searchInput" />
  <span class="counter" id="counter"></span>
</nav>

<main class="cards" id="cardsContainer">
${result.testCases.map(tc => this.renderCard(tc)).join('\n')}
</main>

<script>
(function () {
  var allCards = Array.from(document.querySelectorAll('.card'));
  var total = allCards.length;
  var activeCat = 'ALL';
  var activePri = 'ALL';
  var searchText = '';

  function updateCounter(visible) {
    document.getElementById('counter').textContent = 'Affichage ' + visible + ' / ' + total + ' cas de tests';
  }

  function applyFilters() {
    var visible = 0;
    allCards.forEach(function (card) {
      var cat = card.getAttribute('data-cat');
      var pri = card.getAttribute('data-pri');
      var title = card.getAttribute('data-title') || '';
      var catOk = activeCat === 'ALL' || cat === activeCat;
      var priOk = activePri === 'ALL' || pri === activePri;
      var searchOk = !searchText || title.toLowerCase().indexOf(searchText) !== -1;
      if (catOk && priOk && searchOk) {
        card.classList.remove('hidden');
        visible++;
      } else {
        card.classList.add('hidden');
      }
    });
    updateCounter(visible);
  }

  // Category buttons
  document.querySelectorAll('[data-cat]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeCat = btn.getAttribute('data-cat');
      document.querySelectorAll('[data-cat]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilters();
    });
  });

  // Priority buttons
  document.querySelectorAll('[data-pri]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activePri = btn.getAttribute('data-pri');
      document.querySelectorAll('[data-pri]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilters();
    });
  });

  // Search input
  document.getElementById('searchInput').addEventListener('input', function () {
    searchText = this.value.trim().toLowerCase();
    applyFilters();
  });

  // Accordion
  document.querySelectorAll('.card-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var card = header.parentElement;
      card.classList.toggle('open');
    });
  });

  // Initial counter
  applyFilters();
})();
</script>
</body>
</html>`;
  }

  private renderCard(tc: TestCase): string {
    const stars = '⭐'.repeat(tc.complexite);
    const autoBadge = tc.automatisable
      ? `<span class="badge badge-auto">✅ Auto</span>`
      : `<span class="badge badge-noauto">❌ Non-auto</span>`;

    const preconditions = tc.preconditions
      .map(p => `<li>${this.escapeHtml(p)}</li>`)
      .join('\n        ');

    const etapes = tc.etapes
      .map(e => `<li>${this.escapeHtml(e)}</li>`)
      .join('\n        ');

    const donneesJson = this.escapeHtml(JSON.stringify(tc.donnees_test, null, 2));

    return `  <article class="card" data-cat="${this.escapeHtml(tc.categorie)}" data-pri="${this.escapeHtml(tc.priorite)}" data-title="${this.escapeHtml(tc.titre.toLowerCase())}">
    <div class="card-header">
      <span class="card-id">${this.escapeHtml(tc.id)}</span>
      <span class="card-title">${this.escapeHtml(tc.titre)}</span>
      <div class="badges">
        <span class="badge badge-pri-${this.escapeHtml(tc.priorite)}">${this.escapeHtml(tc.priorite)}</span>
        <span class="badge badge-complexite">${stars}</span>
        ${autoBadge}
      </div>
      <span class="chevron">▼</span>
    </div>
    <div class="card-body">
      <p class="section-title">Préconditions</p>
      <ul class="list">
        ${preconditions}
      </ul>
      <p class="section-title">Étapes</p>
      <ol class="list">
        ${etapes}
      </ol>
      <p class="section-title">Données de test</p>
      <pre>${donneesJson}</pre>
      <p class="section-title">Résultat attendu</p>
      <div class="result-box">${this.escapeHtml(tc.resultat_attendu)}</div>
    </div>
  </article>`;
  }

  private escapeHtml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
