import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';
import type { RigConfig } from '../src/config.js';

function rig(runsDir: string) {
  const config: RigConfig = {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  };
  return createApp(config);
}

function writeNight(dir: string, night: string, body: string) {
  writeFileSync(join(dir, `${night}.jsonl`), body);
}

describe('digest routes', () => {
  it('returns 200 with the same jobs, in the same order, as JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'digest-routes-'));
    writeNight(
      dir,
      '2026-10-02',
      [
        '{"at":"2026-10-02T02:00:00+01:00","job":"b","status":"ok","owner":"rook"}',
        '{"at":"2026-10-02T01:00:00+01:00","job":"a","status":"fail","owner":null,"error":"disk"}',
      ].join('\n'),
    );
    const page = await rig(dir).request('/digest/2026-10-02');
    const html = await page.text();
    const json = (await (await rig(dir).request('/api/digest/2026-10-02')).json()) as NightDigest;
    expect(page.status).toBe(200);
    expect(json.rows.map((row) => row.job)).toEqual(['a', 'b']);
    expect(html.indexOf('<td>a</td>')).toBeGreaterThan(0);
    expect(html.indexOf('<td>b</td>')).toBeGreaterThan(html.indexOf('<td>a</td>'));
  });

  it('returns 404 when the night has no file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'digest-routes-'));
    const page = await rig(dir).request('/digest/2026-10-03');
    const json = await rig(dir).request('/api/digest/2026-10-03');
    expect(page.status).toBe(404);
    expect(json.status).toBe(404);
    expect(await page.text()).toContain('no file');
  });

  it('renders nothing ran for an empty night', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'digest-routes-'));
    writeNight(dir, '2026-10-04', '');
    const page = await rig(dir).request('/digest/2026-10-04');
    const html = await page.text();
    const json = (await (await rig(dir).request('/api/digest/2026-10-04')).json()) as NightDigest;
    expect(page.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(json.rows).toEqual([]);
  });

  it('still renders a night that contains a bad line', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'digest-routes-'));
    writeNight(
      dir,
      '2026-10-05',
      ['{"at":"2026-10-05T01:00:00+01:00","job":"kept","status":"ok","owner":"rook"}', 'not json'].join('\n'),
    );
    const page = await rig(dir).request('/digest/2026-10-05');
    const html = await page.text();
    const json = (await (await rig(dir).request('/api/digest/2026-10-05')).json()) as NightDigest;
    expect(page.status).toBe(200);
    expect(html).toContain('<td>kept</td>');
    expect(html).toContain('1 bad line');
    expect(json.badLines).toBe(1);
    expect(json.rows.map((row) => row.job)).toEqual(['kept']);
  });
});
