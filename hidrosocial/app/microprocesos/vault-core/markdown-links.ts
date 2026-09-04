// Extrae markdown links relativos y los resuelve a relPaths de raíz.
// El vault usa 0 wikilinks: todo es `[texto](../carpeta/Nota.md)` URL-encoded.

import { unirPosix } from '~/lib/rutas';

export function extraerLinks(cuerpo: string, dirActual: string): string[] {
  const vistos = new Set<string>();
  const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
  for (;;) {
    const m = re.exec(cuerpo);
    if (!m) break;
    let target = m[1].trim();
    if (
      !target ||
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('#') ||
      target.startsWith('mailto:')
    ) {
      continue;
    }
    const almohadilla = target.indexOf('#');
    if (almohadilla !== -1) target = target.slice(0, almohadilla);
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      // Si no decodifica, se usa el target crudo.
    }
    if (!target.toLowerCase().endsWith('.md')) continue;
    vistos.add(unirPosix(dirActual, target));
  }
  return [...vistos];
}
