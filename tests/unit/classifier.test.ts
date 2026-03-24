import { Classifier } from '../../src/agent/classifier';
import { TestCase } from '../../src/reporters/types';

const base: TestCase = {
  id: '', feature: 'test', categorie: 'PASSANT', titre: '',
  preconditions: [], etapes: [], donnees_test: {},
  resultat_attendu: '', priorite: 'MOYENNE', automatisable: true, complexite: 1,
};

describe('Classifier', () => {
  const classifier = new Classifier();

  it('assigns sequential IDs', () => {
    const result = classifier.classify([{ ...base, titre: 'Test A' }, { ...base, titre: 'Test B' }]);
    expect(result[0].id).toBe('TC-001');
    expect(result[1].id).toBe('TC-002');
  });

  it('marks injection tests as CRITIQUE', () => {
    const result = classifier.classify([{ ...base, titre: 'Injection SQL dans email' }]);
    expect(result[0].priorite).toBe('CRITIQUE');
  });

  it('marks race condition as non-automatable', () => {
    const result = classifier.classify([{ ...base, titre: 'Race condition paiement' }]);
    expect(result[0].automatisable).toBe(false);
  });

  it('marks COMPLEXE as HAUTE priority', () => {
    const result = classifier.classify([{ ...base, categorie: 'COMPLEXE', titre: 'Scénario complexe' }]);
    expect(result[0].priorite).toBe('HAUTE');
  });

  it('marks SIMPLE as BASSE priority', () => {
    const result = classifier.classify([{ ...base, categorie: 'SIMPLE', titre: 'Vérifier label' }]);
    expect(result[0].priorite).toBe('BASSE');
  });

  it('adds createdAt timestamp', () => {
    const result = classifier.classify([{ ...base, titre: 'Test timestamp' }]);
    expect(new Date(result[0].createdAt!).getTime()).not.toBeNaN();
  });
});
