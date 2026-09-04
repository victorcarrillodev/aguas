import { Link } from '@remix-run/react';

import { colorDeNodo } from '~/lib/colores';
import { encodeNodo } from '~/lib/rutas';
import type { CapaId, VaultNodeType } from '~/microprocesos/vault-core/tipos';
import { Chip } from '../gotas/Chip';
import styles from './PanelDetalleNodo.module.css';

export interface VecinoPanel {
  id: string;
  titulo: string;
  tipo: VaultNodeType;
  capa?: CapaId;
}

interface Props {
  titulo: string;
  tipo: VaultNodeType;
  capa?: CapaId;
  resumen: string;
  vecinos: VecinoPanel[];
}

/** Corriente: panel DOM del nodo seleccionado + vecinos navegables. */
export function PanelDetalleNodo({ titulo, tipo, capa, resumen, vecinos }: Props) {
  return (
    <aside className={styles.panel} aria-label={`Detalle de ${titulo}`}>
      <div className={styles.chips}>
        <Chip color={colorDeNodo(tipo, capa)}>{capa ? `${tipo} · ${capa}` : tipo}</Chip>
      </div>
      <h2 className={styles.titulo}>{titulo}</h2>
      {resumen ? <p className={styles.resumen}>{resumen}</p> : null}
      <h3 className={styles.subtitulo}>Relacionados ({vecinos.length})</h3>
      {vecinos.length === 0 ? (
        <p className={styles.vacio}>Sin vecinos en el grafo.</p>
      ) : (
        <ul className={styles.vecinos}>
          {vecinos.map((v) => (
            <li key={v.id} className={styles.vecino}>
              <Link to={`/nodo/${encodeNodo(v.id)}`} className={styles.enlace}>
                <Chip color={colorDeNodo(v.tipo, v.capa)}>{v.tipo}</Chip>
                <span>{v.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
