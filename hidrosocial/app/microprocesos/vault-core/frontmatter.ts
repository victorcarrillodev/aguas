// Parser YAML mínimo para el frontmatter del vault:
// `clave: valor`, `clave: "valor"` y listas inline `clave: [a, b]`.

export interface FrontmatterParseado {
  datos: Record<string, string | undefined>;
  cuerpo: string;
}

export function parseFrontmatter(texto: string): FrontmatterParseado {
  if (!texto.startsWith('---')) {
    return { datos: {}, cuerpo: texto };
  }
  const fin = texto.indexOf('\n---', 3);
  if (fin === -1) {
    return { datos: {}, cuerpo: texto };
  }
  const bloque = texto.slice(3, fin).trim();
  const cuerpo = texto.slice(fin + 4).replace(/^\r?\n/, '');
  const datos: Record<string, string | undefined> = {};
  for (const linea of bloque.split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    const dos = linea.indexOf(':');
    if (dos === -1) continue;
    const clave = linea.slice(0, dos).trim();
    let valor = linea.slice(dos + 1).trim();
    if (!clave || valor === '') {
      datos[clave] = undefined;
      continue;
    }
    // Lista inline [a, b] → "a, b"
    if (valor.startsWith('[') && valor.endsWith(']')) {
      valor = valor
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
        .join(', ');
    } else {
      valor = valor.replace(/^["']|["']$/g, '');
    }
    datos[clave] = valor;
  }
  return { datos, cuerpo };
}
