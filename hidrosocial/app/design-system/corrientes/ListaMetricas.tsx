import { Metrica } from '../gotas/Metrica';
import styles from './ListaMetricas.module.css';

export interface ItemMetrica {
  valor: number | string;
  etiqueta: string;
  acento?: string;
  sub?: string;
  /** Nombre del icono material-symbols; opcional. */
  icono?: string;
}

/** Corriente: grilla de Métricas (KPIs, mobile-first 2→3→6 columnas). */
export function ListaMetricas({ items }: { items: ItemMetrica[] }) {
  return (
    <div className={styles.grilla}>
      {items.map((m) => (
        <Metrica
          key={m.etiqueta}
          valor={m.valor}
          etiqueta={m.etiqueta}
          acento={m.acento}
          sub={m.sub}
          icono={m.icono}
        />
      ))}
    </div>
  );
}
