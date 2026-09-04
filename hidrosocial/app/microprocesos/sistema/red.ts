import { encodeNodo } from '~/lib/rutas';
import { ARBOLES } from '~/lib/taxonomia';
import type { ArbolId, CapaId, VaultGraph, VaultNode } from '../vault-core/tipos';
import type { ArbolSistema, RedSistema, RelacionSistema } from './tipos';

const ES_ARBOL = new Set<string>(ARBOLES);

/** `"E1, E2"` → `['E1','E2']`, filtrando lo que no sea un árbol válido. */
function listaArboles(valor: string | undefined): ArbolId[] {
  if (!valor) return [];
  const vistos = new Set<ArbolId>();
  for (const bruto of valor.split(',')) {
    const v = bruto.trim().toUpperCase();
    if (ES_ARBOL.has(v)) vistos.add(v as ArbolId);
  }
  return [...vistos];
}

/** `"SIAPA, PLAN"` → `['SIAPA','PLAN']`. */
function listaCodigos(valor: string | undefined): string[] {
  if (!valor) return [];
  return valor
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Cierre transitivo de dependencias con detección de ciclos:
 * todo lo que hay que resolver antes de que `raiz` se sostenga.
 * El propio `raiz` nunca se incluye.
 */
function cerrarDependencias(raiz: ArbolId, directas: Map<ArbolId, ArbolId[]>): ArbolId[] {
  const visto = new Set<ArbolId>();
  const pila = [...(directas.get(raiz) ?? [])];
  while (pila.length) {
    const actual = pila.pop();
    if (!actual || actual === raiz || visto.has(actual)) continue;
    visto.add(actual);
    for (const siguiente of directas.get(actual) ?? []) {
      if (!visto.has(siguiente)) pila.push(siguiente);
    }
  }
  return [...visto].sort(ordenArbol);
}

/** E1, E2, … E10 en orden numérico (no lexicográfico). */
export function ordenArbol(a: ArbolId, b: ArbolId): number {
  return Number(a.slice(1)) - Number(b.slice(1));
}

/**
 * Altura en la jerarquía de dependencias: 0 para quien no depende de nadie,
 * y para el resto el camino más largo hasta una raíz. Tolera ciclos con una
 * pila de nodos en curso (un ciclo no aporta altura).
 */
function calcularNiveles(directas: Map<ArbolId, ArbolId[]>): Map<ArbolId, number> {
  const memo = new Map<ArbolId, number>();
  const enCurso = new Set<ArbolId>();
  function nivel(a: ArbolId): number {
    const previo = memo.get(a);
    if (previo !== undefined) return previo;
    if (enCurso.has(a)) return 0;
    enCurso.add(a);
    let alto = 0;
    for (const dep of directas.get(a) ?? []) {
      if (dep === a) continue;
      alto = Math.max(alto, nivel(dep) + 1);
    }
    enCurso.delete(a);
    memo.set(a, alto);
    return alto;
  }
  for (const a of directas.keys()) nivel(a);
  return memo;
}

/**
 * Rehidrata la red desde la lista de árboles serializada por un loader.
 * `RedSistema` lleva un `Map`, que no sobrevive a JSON; esto lo reconstruye
 * en el cliente sin volver a leer el vault.
 */
export function desdeArboles(arboles: ArbolSistema[]): RedSistema {
  const relaciones: RelacionSistema[] = [];
  const clave = new Set<string>();
  for (const a of arboles) {
    for (const destino of a.dependeDe) {
      const k = `d:${a.arbol}>${destino}`;
      if (clave.has(k)) continue;
      clave.add(k);
      relaciones.push({ de: a.arbol, a: destino, tipo: 'dependencia' });
    }
  }
  for (const a of arboles) {
    for (const destino of a.contacto) {
      const par = [a.arbol, destino].sort(ordenArbol);
      const k = `c:${par[0]}~${par[1]}`;
      if (clave.has(k)) continue;
      clave.add(k);
      relaciones.push({ de: a.arbol, a: destino, tipo: 'contacto' });
    }
  }
  return {
    arboles,
    porArbol: new Map(arboles.map((a) => [a.arbol, a])),
    relaciones,
    raices: arboles.filter((a) => a.esRaiz).map((a) => a.arbol),
    totalRelaciones: relaciones.length,
    totalDependencias: relaciones.filter((r) => r.tipo === 'dependencia').length,
    totalContactos: relaciones.filter((r) => r.tipo === 'contacto').length,
  };
}

/**
 * Construye la red de las diez causas estructurales a partir del vault.
 * Lee `depende_de`, `sostiene_a` y `contacto` del frontmatter de cada causa;
 * las fichas se cuentan por las aristas de jerarquía del grafo.
 */
export function construirRed(g: VaultGraph): RedSistema {
  const causas = new Map<ArbolId, VaultNode>();
  for (const n of g.nodos.values()) {
    if (n.tipo !== 'causa') continue;
    const id = (n.frontmatter.id ?? n.arbol ?? '').trim().toUpperCase();
    if (ES_ARBOL.has(id)) causas.set(id as ArbolId, n);
  }

  // Fichas colgadas de cada causa (aristas de jerarquía ficha → causa).
  const fichasPorCausa = new Map<string, number>();
  for (const a of g.aristas) {
    if (a.tipo !== 'jerarquia') continue;
    if (g.nodos.get(a.origen)?.tipo !== 'ficha') continue;
    if (g.nodos.get(a.destino)?.tipo !== 'causa') continue;
    fichasPorCausa.set(a.destino, (fichasPorCausa.get(a.destino) ?? 0) + 1);
  }

  const dependeDe = new Map<ArbolId, ArbolId[]>();
  const sostieneA = new Map<ArbolId, ArbolId[]>();
  const contacto = new Map<ArbolId, ArbolId[]>();
  for (const [arbol, nodo] of causas) {
    dependeDe.set(arbol, listaArboles(nodo.frontmatter.depende_de));
    sostieneA.set(arbol, listaArboles(nodo.frontmatter.sostiene_a));
    contacto.set(arbol, listaArboles(nodo.frontmatter.contacto));
  }

  // Relaciones deduplicadas. El contacto es simétrico: se guarda una sola vez.
  const relaciones: RelacionSistema[] = [];
  const clave = new Set<string>();
  for (const [arbol, destinos] of dependeDe) {
    for (const destino of destinos) {
      const k = `d:${arbol}>${destino}`;
      if (clave.has(k)) continue;
      clave.add(k);
      relaciones.push({ de: arbol, a: destino, tipo: 'dependencia' });
    }
  }
  for (const [arbol, destinos] of contacto) {
    for (const destino of destinos) {
      const par = [arbol, destino].sort(ordenArbol);
      const k = `c:${par[0]}~${par[1]}`;
      if (clave.has(k)) continue;
      clave.add(k);
      relaciones.push({ de: arbol, a: destino, tipo: 'contacto' });
    }
  }

  const niveles = calcularNiveles(dependeDe);

  const arboles: ArbolSistema[] = [];
  for (const arbol of ARBOLES) {
    const nodo = causas.get(arbol);
    if (!nodo) continue;
    const propias = dependeDe.get(arbol) ?? [];
    const sostiene = sostieneA.get(arbol) ?? [];
    const contactos = contacto.get(arbol) ?? [];
    const requiere = cerrarDependencias(arbol, dependeDe);
    const entra = sostiene.length + contactos.length;
    const sale = propias.length + contactos.length;
    arboles.push({
      arbol,
      id: nodo.id,
      slug: nodo.slug || encodeNodo(nodo.relPath),
      titulo: nodo.titulo,
      resumen: nodo.frontmatter.resumen ?? nodo.resumen,
      enunciado: nodo.frontmatter.enunciado ?? nodo.resumen,
      capa: (nodo.capa ?? 'C1') as CapaId,
      ambito: nodo.frontmatter.ambito ?? nodo.frontmatter.atribucion ?? '—',
      naturaleza: nodo.frontmatter.naturaleza ?? '—',
      brecha: nodo.frontmatter.brecha ?? 'pendiente',
      genera: listaCodigos(nodo.frontmatter.genera),
      debeResolver: listaCodigos(nodo.frontmatter.debe_resolver),
      dependeDe: propias,
      sostieneA: sostiene,
      contacto: contactos,
      fichas: fichasPorCausa.get(nodo.id) ?? 0,
      entra,
      sale,
      saldo: entra - sale,
      requiere,
      profundidad: requiere.length,
      nivel: niveles.get(arbol) ?? 0,
      esRaiz: propias.length === 0 && sostiene.length > 0,
    });
  }

  const porArbol = new Map(arboles.map((a) => [a.arbol, a]));
  return {
    arboles,
    porArbol,
    relaciones,
    raices: arboles.filter((a) => a.esRaiz).map((a) => a.arbol),
    totalRelaciones: relaciones.length,
    totalDependencias: relaciones.filter((r) => r.tipo === 'dependencia').length,
    totalContactos: relaciones.filter((r) => r.tipo === 'contacto').length,
  };
}
