import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import type { ReactNode } from 'react';

import { MesaNodo } from '~/design-system/cauces/MesaNodo';
import { Chip } from '~/design-system/gotas/Chip';
import { colorDeNodo } from '~/lib/colores';
import { decodeNodo, encodeNodo, unirPosix } from '~/lib/rutas';
import { exportarExpediente, getVaultGraph, getVaultPath } from '~/microprocesos/cache/index';
import { guardarRegistro } from '~/microprocesos/captura/registro.server';
import {
  estadoDato,
  estadoDocumental,
  estadoRevision,
  origenDe,
  registrosDe,
  relacionesDe,
} from '~/microprocesos/revision/index';
import { leerNota } from '~/microprocesos/vault-core/index';
import type { VaultNode } from '~/microprocesos/vault-core/tipos';
import type { CapaId, VaultNodeType } from '~/microprocesos/vault-core/tipos';
import styles from './RutaNodo.module.css';

interface EnlaceResuelto {
  relPath: string;
  titulo: string;
}

interface Datos {
  titulo: string;
  /** Carpeta de la nota: base para resolver los enlaces relativos del cuerpo. */
  dir: string;
  tipo: VaultNodeType;
  capa?: CapaId;
  cuerpo: string;
  enlaces: EnlaceResuelto[];
  frontmatter: Record<string, string | undefined>;
  nodo: VaultNode;
  registros: VaultNode[];
  estado: string;
  dato: string;
  origen: string;
  relaciones: ReturnType<typeof relacionesDe>;
  exportacion: string;
  documentales: Record<string, string>;
  recibido: boolean;
  objetivo?: { id: string; titulo: string };
}

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    await guardarRegistro(await request.formData(), decodeNodo(params.slug ?? ''));
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'No se pudo guardar.' }, { status: 400 });
  }
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  let relPath: string;
  try {
    relPath = decodeNodo(params.slug ?? '');
  } catch {
    throw new Response('Nota inválida', { status: 404 });
  }
  const g = await getVaultGraph();
  if (!g.nodos.has(relPath)) throw new Response('Nota no encontrada', { status: 404 });
  const vaultPath = getVaultPath();
  let nota: Awaited<ReturnType<typeof leerNota>>;
  try {
    nota = await leerNota(vaultPath, relPath);
  } catch {
    throw new Response('Nota no encontrada', { status: 404 });
  }
  const directos = registrosDe(g, relPath);
  const aportacionesDelPlan = nota.frontmatter.registro === 'contraste'
    ? registrosDe(g, nota.frontmatter.nodo_id || '')
      .filter((r) => !r.frontmatter.registro && r.frontmatter.plan_id === relPath)
    : [];
  const registros = [...new Map([...directos, ...aportacionesDelPlan].map((r) => [r.id, r])).values()];
  const objetivo = g.nodos.get(nota.frontmatter.nodo_id || '');
  const enlaces: EnlaceResuelto[] = nota.links.map((rel) => ({
    relPath: rel,
    titulo: g.nodos.get(rel)?.titulo ?? rel.split('/').pop()?.replace(/\.md$/, '') ?? rel,
  }));
  return json<Datos>({
    titulo: nota.nodo.titulo,
    dir: relPath.split('/').slice(0, -1).join('/'),
    tipo: nota.nodo.tipo,
    capa: nota.nodo.capa,
    cuerpo: nota.cuerpo,
    enlaces,
    frontmatter: nota.frontmatter,
    nodo: nota.nodo,
    registros,
    estado: estadoRevision(nota.nodo, registrosDe(g, relPath)),
    dato: estadoDato(nota.nodo, registrosDe(g, relPath)),
    origen: origenDe(nota.nodo),
    relaciones: relacionesDe(g, nota.nodo),
    exportacion: await exportarExpediente(g, relPath, vaultPath),
    documentales: Object.fromEntries(registros
      .filter((r) => r.tipo === 'evidencia' && !r.frontmatter.registro)
      .map((r) => [r.id, estadoDocumental(g, r)])),
    recibido: new URL(request.url).searchParams.get('recibido') === '1' &&
      nota.nodo.tipo === 'evidencia' && !nota.frontmatter.registro,
    objetivo: objetivo ? { id: objetivo.id, titulo: objetivo.titulo } : undefined,
  });
}

function porRel(enlaces: EnlaceResuelto[], rel: string): EnlaceResuelto | undefined {
  return enlaces.find((e) => e.relPath === rel);
}

/** Render inline: `[texto](target)` → enlace interno si resuelve a un nodo. */
function renderInline(
  texto: string,
  enlaces: EnlaceResuelto[],
  keyBase: string,
  dir: string,
): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /\[([^\]]*)\]\(([^)\s]+)\)/g;
  let ultimo = 0;
  let k = 0;
  const pushTexto = (t: string) => {
    if (t) partes.push(<span key={`${keyBase}-t${k++}`}>{formatoSimple(t)}</span>);
  };
  for (;;) {
    const m = re.exec(texto);
    if (!m) break;
    pushTexto(texto.slice(ultimo, m.index));
    const etiqueta = m[1];
    let target = m[2];
    try {
      target = decodeURIComponent(target);
    } catch {
      // Se usa el target crudo.
    }
    const almohadilla = target.indexOf('#');
    if (almohadilla !== -1) target = target.slice(0, almohadilla);
    // Los enlaces del vault son relativos a la carpeta de la nota; los relPath
    // de `enlaces` son absolutos desde la raíz. Sin resolver, nunca casan.
    const absoluto = unirPosix(dir, target);
    const resuelto =
      porRel(enlaces, absoluto) ??
      porRel(enlaces, `${absoluto}.md`) ??
      porRel(enlaces, target) ??
      porRel(enlaces, `${target}.md`);
    if (resuelto && !/^https?:\/\//.test(m[2])) {
      partes.push(
        <Link key={`${keyBase}-l${k++}`} to={`/nodo/${encodeNodo(resuelto.relPath)}`}>
          {etiqueta}
        </Link>,
      );
    } else if (/^https?:\/\//.test(m[2])) {
      partes.push(
        <a key={`${keyBase}-l${k++}`} href={m[2]} target="_blank" rel="noreferrer">
          {etiqueta}
        </a>,
      );
    } else {
      // Destino no navegable (un .canvas, por ejemplo): se muestra la etiqueta
      // sola, nunca el markup crudo.
      pushTexto(etiqueta);
    }
    ultimo = m.index + m[0].length;
  }
  pushTexto(texto.slice(ultimo));
  return partes;
}

/** Negritas `**x**` dentro de un fragmento de texto. */
function formatoSimple(texto: string): ReactNode {
  const partes = texto.split('**');
  if (partes.length === 1) return texto;
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

/** Render de bloques: encabezados, citas, listas, tablas, párrafos. */
function renderBloques(cuerpo: string, enlaces: EnlaceResuelto[], dir: string): ReactNode[] {
  const lineas = cuerpo.split(/\r?\n/);
  const salida: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    const t = linea.trim();
    if (!t) {
      i++;
      continue;
    }
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const contenido = renderInline(h[2], enlaces, `h${k}`, dir);
      if (nivel === 1) salida.push(<h2 key={k}>{contenido}</h2>);
      else if (nivel === 2) salida.push(<h3 key={k}>{contenido}</h3>);
      else salida.push(<h4 key={k}>{contenido}</h4>);
      k++;
      i++;
      continue;
    }
    if (t.startsWith('>')) {
      const cita: string[] = [];
      while (i < lineas.length && lineas[i].trim().startsWith('>')) {
        cita.push(lineas[i].trim().replace(/^>+\s?/, ''));
        i++;
      }
      salida.push(
        <blockquote key={k++}>
          {cita.map((c, j) => (
            <p key={j}>{renderInline(c, enlaces, `q${k}-${j}`, dir)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lineas.length && /^[-*]\s+/.test(lineas[i].trim())) {
        items.push(lineas[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      salida.push(
        <ul key={k++}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, enlaces, `li${k}-${j}`, dir)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (t.startsWith('|')) {
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        const celdas = lineas[i]
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
        if (!/^-+/.test(celdas[0].replace(/:/g, ''))) filas.push(celdas);
        i++;
      }
      if (filas.length > 0) {
        const [cab, ...cuerpoT] = filas;
        salida.push(
          <table key={k++}>
            <thead>
              <tr>
                {cab.map((c, j) => (
                  <th key={j}>{renderInline(c, enlaces, `th${k}-${j}`, dir)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuerpoT.map((f, fi) => (
                <tr key={fi}>
                  {f.map((c, j) => (
                    <td key={j}>{renderInline(c, enlaces, `td${k}-${fi}-${j}`, dir)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>,
        );
      }
      continue;
    }
    if (/^---+$/.test(t)) {
      salida.push(<hr key={k++} />);
      i++;
      continue;
    }
    salida.push(<p key={k++}>{renderInline(t, enlaces, `p${k}`, dir)}</p>);
    i++;
  }
  return salida;
}

// /nodo/:slug — artículo legible de la nota.
export default function RutaNodo() {
  const d = useLoaderData<Datos>();
  return (
    <article className={styles.articulo}>
      <Link to="/grafo" className={styles.volver}>
        ← Volver al grafo
      </Link>
      <div className={styles.chips}>
        {d.nodo.nivelCausal ? <Chip color={colorDeNodo(d.tipo, d.capa)}>{d.nodo.codigo} · {d.nodo.nivelCausal}</Chip> : null}
        <Chip color={colorDeNodo(d.tipo, d.capa)}>{d.capa ? `${d.tipo} · ${d.capa}` : d.tipo}</Chip>
      </div>
      <h1 className={styles.titulo}>{d.titulo}</h1>
      {d.recibido ? (
        <section role="status" aria-label="Aportación recibida">
          <h2>Aportación recibida</h2>
          <p>El registro está guardado. Conserva este enlace para compartirlo o consultar su revisión.</p>
          <p>Referencia del registro: <code>{d.nodo.id}</code></p>
          <p>Recepción: {d.frontmatter.creado || 'Fecha no registrada'}. Consulta la revisión documental actual en el expediente.</p>
          {d.objetivo ? (
            <Link to={`/nodo/${encodeNodo(d.objetivo.id)}`}>Ver expediente: {d.objetivo.titulo}</Link>
          ) : null}
        </section>
      ) : null}
      <MesaNodo
        key={d.nodo.id}
        nodo={d.nodo}
        registros={d.registros}
        estado={d.estado}
        dato={d.dato}
        origen={d.origen}
        relaciones={d.relaciones}
        exportacion={d.exportacion}
        documentales={d.documentales}
      />
      <h2>{d.tipo === 'evidencia' ? 'Texto completo del registro' : 'Texto conservado del diagnóstico'}</h2>
      <div className={styles.cuerpo}>{renderBloques(d.cuerpo, d.enlaces, d.dir)}</div>
    </article>
  );
}
