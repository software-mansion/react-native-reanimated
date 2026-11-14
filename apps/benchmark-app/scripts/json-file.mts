import fs from 'node:fs';

import { ToolError } from './errors.mts';

export function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ToolError(
      `Cannot read JSON from ${file}: ${(error as Error).message}`
    );
  }
}
