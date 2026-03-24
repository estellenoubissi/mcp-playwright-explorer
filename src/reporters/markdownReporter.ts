import fs from 'fs';
import path from 'path';
import { ExplorationResult, TestCase } from './types';

export class MarkdownReporter {
  private outputDir: string;

  constructor(outputDir = 'outputs/test-cases') {
    this.outputDir = outputDir;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  generate(result: ExplorationResult): string {
    const md = this.buildMarkdown(result);
    const filename = `${result.feature.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`;
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, md, 'utf-8');
    console.log(`✅ Markdown report saved: ${filepath}`);
    return filepath;
  }

  private buildMarkdown(result: ExplorationResult): string {
    const lines: string[] = [
      `# 🧪 Rapport de Tests Exploratoires — ${result.feature}`,
      ``,
      `> **URL analysée :** ${result.url}`,
      `> **Généré le :** ${new Date(result.exploredAt).toLocaleString('fr-FR')}`,
      `> **Total cas de tests :** ${result.totalTestCases}`,
      ``,
      `## 📊 Résumé`,
      ``,
      `| Catégorie | Nombre |`,
      `|-----------|--------|`,
      `| ✅ Passants | ${result.summary.passant} |`,
      `| ❌ Non-Passants | ${result.summary.non_passant} |`,
      `| 🔴 Complexes | ${result.summary.complexe} |`,
      `| 🟢 Simples | ${result.summary.simple} |`,
      ``,
      `---`,
      ``,
    ];

    const categories = [
      { key: 'PASSANT', emoji: '✅', label: 'Cas Passants (Happy Path)' },
      { key: 'NON_PASSANT', emoji: '❌', label: 'Cas Non-Passants (Unhappy Path)' },
      { key: 'COMPLEXE', emoji: '🔴', label: 'Cas Complexes' },
      { key: 'SIMPLE', emoji: '🟢', label: 'Cas Simples' },
    ];

    for (const cat of categories) {
      const cases = result.testCases.filter(tc => tc.categorie === cat.key);
      if (cases.length === 0) continue;
      lines.push(`## ${cat.emoji} ${cat.label}`, '');
      for (const tc of cases) {
        lines.push(...this.renderTestCase(tc));
      }
    }

    return lines.join('\n');
  }

  private renderTestCase(tc: TestCase): string[] {
    return [
      `### ${tc.id} — ${tc.titre}`,
      ``,
      `- **Priorité :** ${tc.priorite}`,
      `- **Complexité :** ${'⭐'.repeat(tc.complexite)}`,
      `- **Automatisable :** ${tc.automatisable ? '✅ Oui' : '❌ Non'}`,
      ``,
      `**Préconditions :**`,
      ...tc.preconditions.map(p => `- ${p}`),
      ``,
      `**Étapes :**`,
      ...tc.etapes.map((e, i) => `${i + 1}. ${e}`),
      ``,
      `**Données de test :**`,
      '```json',
      JSON.stringify(tc.donnees_test, null, 2),
      '```',
      ``,
      `**Résultat attendu :** ${tc.resultat_attendu}`,
      ``,
      `---`,
      ``,
    ];
  }
}
