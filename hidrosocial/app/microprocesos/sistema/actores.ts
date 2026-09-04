import type { ArbolId, VaultGraph } from '../vault-core/tipos';
import { ordenArbol } from './red';
import type { IncidenciaActor, RedSistema } from './tipos';

/**
 * Incidencia de actores: en cuántas causas aparece cada actor como quien
 * **genera** el problema y en cuántas como quien **debería resolverlo**.
 *
 * La brecha entre ambas columnas es la lectura que importa. Cuenta presencia,
 * no peso: un actor puede aparecer poco y hacerlo en la raíz.
 */
export function incidenciaActores(g: VaultGraph, red: RedSistema): IncidenciaActor[] {
  const genera = new Map<string, ArbolId[]>();
  const resuelve = new Map<string, ArbolId[]>();

  for (const a of red.arboles) {
    for (const cod of a.genera) {
      genera.set(cod, [...(genera.get(cod) ?? []), a.arbol]);
    }
    for (const cod of a.debeResolver) {
      resuelve.set(cod, [...(resuelve.get(cod) ?? []), a.arbol]);
    }
  }

  const filas: IncidenciaActor[] = [];
  for (const n of g.nodos.values()) {
    if (n.tipo !== 'actor') continue;
    const codigo = (n.frontmatter.id ?? n.titulo).trim();
    const g1 = (genera.get(codigo) ?? []).sort(ordenArbol);
    const r1 = (resuelve.get(codigo) ?? []).sort(ordenArbol);
    if (g1.length === 0 && r1.length === 0) continue;
    filas.push({
      codigo,
      nombre: n.frontmatter.nombre ?? n.titulo,
      grupo: n.frontmatter.grupo ?? '—',
      curva: n.frontmatter.curva ?? '—',
      genera: g1,
      debeResolver: r1,
      delta: g1.length - r1.length,
      lectura: lecturaDe(g1.length, r1.length),
    });
  }

  return filas.sort(
    (a, b) => b.genera.length + b.debeResolver.length - (a.genera.length + a.debeResolver.length),
  );
}

function lecturaDe(genera: number, resuelve: number): string {
  if (genera > 0 && resuelve === 0) return 'daña sin obligación de reparar';
  if (resuelve > 0 && genera === 0) return 'repara sin haber causado';
  if (genera === resuelve) return 'juez y parte';
  return genera > resuelve ? 'daña más de lo que repara' : 'repara más de lo que daña';
}

/** Actores del catálogo que hoy no aparecen ni como causa ni como responsables. */
export function actoresSinIncidencia(g: VaultGraph, red: RedSistema): string[] {
  const conIncidencia = new Set<string>();
  for (const a of red.arboles) {
    for (const c of a.genera) conIncidencia.add(c);
    for (const c of a.debeResolver) conIncidencia.add(c);
  }
  const fuera: string[] = [];
  for (const n of g.nodos.values()) {
    if (n.tipo !== 'actor') continue;
    const codigo = (n.frontmatter.id ?? n.titulo).trim();
    if (!conIncidencia.has(codigo)) fuera.push(codigo);
  }
  return fuera.sort((a, b) => a.localeCompare(b, 'es'));
}
