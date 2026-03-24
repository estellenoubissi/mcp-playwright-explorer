import { TestCase, Priority } from '../reporters/types';

export class Classifier {
  classify(testCases: TestCase[]): TestCase[] {
    return testCases.map((tc, index) => ({
      ...tc,
      id: `TC-${String(index + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      automatisable: this.isAutomatable(tc),
      priorite: this.inferPriority(tc),
    }));
  }

  private isAutomatable(tc: TestCase): boolean {
    const keywords = ['race condition', 'session expir', 'manuel', 'visuel subjectif'];
    return !keywords.some(k => tc.titre.toLowerCase().includes(k));
  }

  private inferPriority(tc: TestCase): Priority {
    const t = tc.titre.toLowerCase();
    if (['connexion', 'login', 'paiement', 'auth', 'sécurité', 'injection', 'xss'].some(k => t.includes(k))) return 'CRITIQUE';
    if (tc.categorie === 'COMPLEXE') return 'HAUTE';
    if (tc.categorie === 'NON_PASSANT') return 'HAUTE';
    if (tc.categorie === 'SIMPLE') return 'BASSE';
    return tc.priorite || 'MOYENNE';
  }
}
