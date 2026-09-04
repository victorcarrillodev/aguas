import { Link } from '@remix-run/react';

import { colorDeCapa, colorDeTipo } from '~/lib/colores';
import type { CapaId, VaultNodeType } from '~/microprocesos/vault-core/tipos';
import { Chip } from '../gotas/Chip';
import styles from './PanelFiltro.module.css';

export const TIPOS_FILTRO: VaultNodeType[] = [
  'causa',
  'ficha',
  'actor',
  'efecto',
  'medicion',
  'problema',
  'evidencia',
];
export const CAPAS_FILTRO: CapaId[] = ['C0', 'C1', 'C2', 'C3', 'C4'];

interface Props {
  tipoActual?: string;
  capaActual?: string;
}

function href(tipo?: string, capa?: string): string {
  const params = new URLSearchParams();
  if (tipo) params.set('tipo', tipo);
  if (capa) params.set('capa', capa);
  const q = params.toString();
  return q ? `/grafo?${q}` : '/grafo';
}

/** Corriente: controles de filtro del grafo (tipo/capa) por query params. */
export function PanelFiltro({ tipoActual, capaActual }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.grupo}>
        <span className={styles.etiqueta}>Tipo</span>
        <div className={styles.opciones}>
          <Link
            to={href(undefined, capaActual)}
            className={!tipoActual ? styles.activo : styles.opcion}
          >
            Todos
          </Link>
          {TIPOS_FILTRO.map((t) => (
            <Link
              key={t}
              to={href(t, capaActual)}
              className={tipoActual === t ? styles.activo : styles.opcion}
            >
              <Chip color={colorDeTipo(t)}>{t}</Chip>
            </Link>
          ))}
        </div>
      </div>
      <div className={styles.grupo}>
        <span className={styles.etiqueta}>Capa</span>
        <div className={styles.opciones}>
          <Link
            to={href(tipoActual, undefined)}
            className={!capaActual ? styles.activo : styles.opcion}
          >
            Todas
          </Link>
          {CAPAS_FILTRO.map((c) => (
            <Link
              key={c}
              to={href(tipoActual, c)}
              className={capaActual === c ? styles.activo : styles.opcion}
            >
              <Chip color={colorDeCapa(c)}>{c}</Chip>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
