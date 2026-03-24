import fs from 'fs';
import path from 'path';
import { ExplorationResult } from './types';

export class JsonReporter {
  private outputDir: string;

  constructor(outputDir = 'outputs/test-cases') {
    this.outputDir = outputDir;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  generate(result: ExplorationResult): string {
    const filename = `${result.feature.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✅ JSON report saved: ${filepath}`);
    return filepath;
  }
}
