import type { DigestRow, NightDigest } from '../digest/types.js';

function cell(value: string | null) {
  return value ?? '—';
}

function marked(row: DigestRow) {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>digest {night}</h1>
      {digest.badLines > 0 ? <p class="mute">{digest.badLines} bad line{digest.badLines === 1 ? '' : 's'}</p> : null}
      {digest.rows.length === 0 ? (
        <p>nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr class={marked(row) ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{cell(row.owner)}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{cell(row.lastError)}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
