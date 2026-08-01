/**
 * Verify production assets are Brotli (or gzip) compressed.
 * Usage: node scripts/check-brotli.mjs [baseUrl]
 */

const baseUrl = process.argv[2] || 'https://executive-flow-seven.vercel.app';

async function check(url) {
  const res = await fetch(url, {
    headers: { 'Accept-Encoding': 'br, gzip' },
  });
  const encoding = res.headers.get('content-encoding') || 'none';
  const size = res.headers.get('content-length') || '?';
  return { url, status: res.status, encoding, size };
}

async function main() {
  const indexRes = await fetch(`${baseUrl}/`);
  const html = await indexRes.text();
  const assetMatch = html.match(/\/assets\/index-[^"']+\.js/);
  const cssMatch = html.match(/\/assets\/index-[^"']+\.css/);

  const targets = [`${baseUrl}/`];
  if (assetMatch) targets.push(`${baseUrl}${assetMatch[0]}`);
  if (cssMatch) targets.push(`${baseUrl}${cssMatch[0]}`);

  const results = [];
  for (const url of targets) {
    results.push(await check(url));
  }

  console.log(JSON.stringify({ baseUrl, results }, null, 2));

  const compressed = results.every(
    (r) => r.encoding === 'br' || r.encoding === 'gzip',
  );
  if (!compressed) {
    console.error('Some responses were not br/gzip compressed.');
    process.exit(1);
  }
  console.log('OK — Vercel is serving compressed responses.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
