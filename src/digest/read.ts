import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, NightDigest } from './types.js';

const STATUSES = new Set<DigestStatus>(['ok', 'retry', 'fail']);

type Event = {
  at: string;
  ms: number;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error: string | null;
  index: number;
};

function parseLine(line: string, index: number): Event | undefined {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return undefined;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.at !== 'string' || typeof record.job !== 'string') return undefined;
  if (typeof record.status !== 'string' || !STATUSES.has(record.status as DigestStatus)) return undefined;
  if (record.owner !== null && typeof record.owner !== 'string') return undefined;
  if (record.error !== undefined && typeof record.error !== 'string') return undefined;
  const ms = Date.parse(record.at);
  if (Number.isNaN(ms)) return undefined;
  return {
    at: record.at,
    ms,
    job: record.job,
    status: record.status as DigestStatus,
    owner: record.owner,
    error: typeof record.error === 'string' ? record.error : null,
    index,
  };
}

export function readNight(runsDir: string, night: string): NightDigest {
  const text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const events: Event[] = [];
  let badLines = 0;
  const counts = { ok: 0, retry: 0, fail: 0 };

  for (const [index, line] of text.split('\n').entries()) {
    if (line.trim() === '') continue;
    const event = parseLine(line, index);
    if (!event) {
      badLines += 1;
      continue;
    }
    events.push(event);
    counts[event.status] += 1;
  }

  events.sort((a, b) => a.ms - b.ms || a.index - b.index);

  const byJob = new Map<string, DigestRow>();
  for (const event of events) {
    const row = byJob.get(event.job);
    if (!row) {
      byJob.set(event.job, {
        job: event.job,
        owner: event.owner,
        runs: 1,
        retries: event.status === 'retry' ? 1 : 0,
        lastStatus: event.status,
        lastError: event.error,
        firstAt: event.at,
        lastAt: event.at,
      });
      continue;
    }
    row.runs += 1;
    if (event.status === 'retry') row.retries += 1;
    row.owner = event.owner;
    row.lastStatus = event.status;
    row.lastAt = event.at;
    if (event.error !== null) row.lastError = event.error;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { rows, badLines, counts };
}
