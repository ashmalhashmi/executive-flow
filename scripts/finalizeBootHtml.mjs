/** Boot script last in body; modulepreload links before script. */
export function finalizeBootHtml(html) {
  const scriptRe = /<script type="module" crossorigin src="\.\/assets\/[^"]+\.js"><\/script>/;
  const scriptMatch = html.match(scriptRe);
  if (!scriptMatch) return html;

  const scriptTag = scriptMatch[0];
  let out = html.replace(scriptRe, '');

  const preloadRe = /<link rel="modulepreload" crossorigin href="\.\/assets\/[^"]+\.js">\s*/g;
  const preloads = [...out.matchAll(preloadRe)].map((m) => m[0].trim());
  out = out.replace(preloadRe, '');

  const block = [...preloads, scriptTag].join('\n    ');
  out = out.replace('</body>', `    ${block}\n  </body>`);
  return out;
}
