import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readNight } from './read.js';
import type { NightDigest } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function openNight(runsDir: string, night: string): NightDigest | undefined {
  if (!NIGHT.test(night) || !existsSync(join(runsDir, `${night}.jsonl`))) return undefined;
  return readNight(runsDir, night);
}
