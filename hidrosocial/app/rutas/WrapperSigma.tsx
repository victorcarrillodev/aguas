import { useEffect, useRef, useState } from 'react';
import type Sigma from 'sigma';
import type { MouseCoords } from 'sigma/types';

import type { AristaRender, NodoRender } from '~/microprocesos/grafo/index';
import styles from './WrapperSigma.module.css';

interface Props {
  nodos: NodoRender[];
  aristas: AristaRender[];
  foco?: string;
  /** Clic en un nodo → selección en el inspector (no navega). */
  onSeleccionar?: (id: string | null) => void;
}

interface ControlSigma {
  acercar: () => void;
  alejar: () => void;
  reset: () => void;
  pantallaCompleta: () => void;
}

/**
 * Lienzo sigma estilo Obsidian: labels solo a zoom cercano, hover que
 * oculta el resto (`hidden`), nodos arrastrables y toolbar flotante
 * (zoom/reset/pantalla completa).
 */
export default function WrapperSigma({ nodos, aristas, foco, onSeleccionar }: Props) {
  const marco = useRef<HTMLDivElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const control = useRef<ControlSigma | null>(null);
  const seleccionarRef = useRef(onSeleccionar);
  seleccionarRef.current = onSeleccionar;
  /** Instancia viva de sigma: la crea el effect de construcción, la usa el effect de foco. */
  const sigmaRef = useRef<Sigma | null>(null);
  /** Grafo vivo (para leer posiciones en el effect de foco sin reconstruir). */
  const graphRef = useRef<{
    hasNode(id: string): boolean;
    getNodeAttributes(id: string): unknown;
  } | null>(null);
  /** Nodo resaltado actual (foco o hover). Ref para no recrear listeners/reducers. */
  const resaltadoRef = useRef<string | null>(null);
  /** Último foco recibido por props. Ref para que leaveNode lo restaure sin redepender. */
  const focoRef = useRef<string | null>(null);
  focoRef.current = foco ?? null;
  const [, forzar] = useState(0);

  useEffect(() => {
    let renderer: { kill: () => void } | null = null;
    let cancelado = false;
    (async () => {
      const [{ default: Graph }, { default: Sigma }] = await Promise.all([
        import('graphology'),
        import('sigma'),
      ]);
      if (cancelado || !contenedor.current) return;
      const graph = new Graph();
      for (const n of nodos) {
        if (!graph.hasNode(n.id)) {
          graph.addNode(n.id, { x: n.x, y: n.y, size: n.size, label: n.titulo, color: n.color });
        }
      }
      aristas.forEach((a, i) => {
        if (graph.hasNode(a.origen) && graph.hasNode(a.destino)) {
          try {
            graph.addEdge(a.origen, a.destino, { id: `e${i}`, size: 1 });
          } catch {
            // Arista duplicada: se ignora.
          }
        }
      });
      const adyacencia = new Map<string, Set<string>>();
      for (const a of aristas) {
        if (!adyacencia.has(a.origen)) adyacencia.set(a.origen, new Set());
        if (!adyacencia.has(a.destino)) adyacencia.set(a.destino, new Set());
        adyacencia.get(a.origen)?.add(a.destino);
        adyacencia.get(a.destino)?.add(a.origen);
      }
      resaltadoRef.current = focoRef.current;
      const sigma = new Sigma(graph, contenedor.current, {
        allowInvalidContainer: true,
        renderEdgeLabels: false,
        defaultNodeColor: '#7EA6E0',
        labelRenderedSizeThreshold: 9,
        labelDensity: 0.07,
        labelColor: { color: '#0b1c30' },
      });
      sigma.setSetting('nodeReducer', (node: string, data: Record<string, unknown>) => {
        const resaltado = resaltadoRef.current;
        if (!resaltado) return data;
        if (node === resaltado || adyacencia.get(resaltado)?.has(node)) return data;
        return { ...data, hidden: true };
      });
      sigma.setSetting('edgeReducer', (edge: string, data: Record<string, unknown>) => {
        const resaltado = resaltadoRef.current;
        if (!resaltado) return data;
        const extremos = graph.extremities(edge) as string[];
        if (extremos.includes(resaltado)) return { ...data, size: 2.5 };
        return { ...data, hidden: true };
      });
      let movido = false;
      sigma.on('clickNode', ({ node }: { node: string }) => {
        if (movido) {
          movido = false;
          return;
        }
        resaltadoRef.current = node as string;
        sigma.refresh();
        seleccionarRef.current?.(node as string);
      });
      sigma.on('enterNode', ({ node }: { node: string }) => {
        resaltadoRef.current = node as string;
        sigma.refresh();
      });
      sigma.on('leaveNode', () => {
        if (!arrastrado) {
          resaltadoRef.current = focoRef.current;
          sigma.refresh();
        }
      });
      // Arrastrar nodos: downNode + mousemove con viewportToGraph.
      let arrastrado: string | null = null;
      sigma.on('downNode', (e: { node: string }) => {
        arrastrado = e.node as string;
        movido = false;
        sigma.getCamera().disable();
      });
      sigma.getMouseCaptor().on('mousemove', (e: MouseCoords) => {
        if (!arrastrado) return;
        movido = true;
        e.preventSigmaDefault();
        const pos = sigma.viewportToGraph({ x: e.x, y: e.y });
        graph.setNodeAttribute(arrastrado, 'x', pos.x);
        graph.setNodeAttribute(arrastrado, 'y', pos.y);
        sigma.refresh();
      });
      sigma.getMouseCaptor().on('mouseup', () => {
        if (arrastrado) {
          arrastrado = null;
          sigma.getCamera().enable();
        }
      });
      const focoInicial = focoRef.current;
      if (focoInicial && graph.hasNode(focoInicial)) {
        const pos = graph.getNodeAttributes(focoInicial) as { x: number; y: number };
        sigma.getCamera().animate({ ...pos, ratio: 0.6 }, { duration: 300 });
      }
      const estadoInicial = sigma.getCamera().getState();
      control.current = {
        acercar: () => sigma.getCamera().animatedZoom({ duration: 200 }),
        alejar: () => sigma.getCamera().animatedUnzoom({ duration: 200 }),
        reset: () => sigma.getCamera().animate(estadoInicial, { duration: 300 }),
        pantallaCompleta: () => {
          const el = marco.current;
          if (!el) return;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void el.requestFullscreen?.();
        },
      };
      forzar((n) => n + 1);
      sigmaRef.current = sigma;
      graphRef.current = graph;
      renderer = sigma;
    })();
    return () => {
      cancelado = true;
      control.current = null;
      sigmaRef.current = null;
      graphRef.current = null;
      renderer?.kill();
    };
  }, [nodos, aristas]);

  // Cambios de foco: reutiliza la instancia viva (sin reconstruir sigma).
  // Solo actualiza el resaltado, refresca y anima la cámara al nodo foco.
  useEffect(() => {
    resaltadoRef.current = foco ?? null;
    const sigma = sigmaRef.current;
    if (!sigma) return;
    sigma.refresh();
    if (foco && graphRef.current?.hasNode(foco)) {
      const pos = graphRef.current.getNodeAttributes(foco) as { x: number; y: number };
      sigma.getCamera().animate({ ...pos, ratio: 0.6 }, { duration: 300 });
    }
  }, [foco]);

  return (
    <div ref={marco} className={styles.marco}>
      <div ref={contenedor} className={styles.lienzo} role="img" aria-label="Grafo del vault" />
      <div className={styles.toolbar} role="toolbar" aria-label="Controles del grafo">
        <button type="button" title="Acercar" onClick={() => control.current?.acercar()}>
          <span className="material-symbols-outlined" aria-hidden="true">
            zoom_in
          </span>
        </button>
        <button type="button" title="Alejar" onClick={() => control.current?.alejar()}>
          <span className="material-symbols-outlined" aria-hidden="true">
            zoom_out
          </span>
        </button>
        <button type="button" title="Restablecer vista" onClick={() => control.current?.reset()}>
          <span className="material-symbols-outlined" aria-hidden="true">
            restart_alt
          </span>
        </button>
        <button
          type="button"
          title="Pantalla completa"
          onClick={() => control.current?.pantallaCompleta()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            fullscreen
          </span>
        </button>
      </div>
    </div>
  );
}
