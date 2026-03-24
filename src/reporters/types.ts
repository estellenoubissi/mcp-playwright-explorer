export type TestCategory = 'PASSANT' | 'NON_PASSANT' | 'COMPLEXE' | 'SIMPLE';
export type Priority = 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';

export interface TestCase {
  id: string;
  feature: string;
  categorie: TestCategory;
  titre: string;
  preconditions: string[];
  etapes: string[];
  donnees_test: Record<string, unknown>;
  resultat_attendu: string;
  priorite: Priority;
  automatisable: boolean;
  complexite: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  createdAt?: string;
}

export interface ExplorationResult {
  url: string;
  feature: string;
  exploredAt: string;
  totalTestCases: number;
  summary: {
    passant: number;
    non_passant: number;
    complexe: number;
    simple: number;
  };
  testCases: TestCase[];
}

export interface UIElement {
  type: 'input' | 'button' | 'select' | 'checkbox' | 'radio' | 'link' | 'form' | 'table' | 'modal' | 'other';
  selector: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  validation?: string[];
  states?: string[];
}

export interface NetworkCall {
  method: string;
  url: string;
  status?: number;
  requestBody?: unknown;
  responseBody?: unknown;
}
