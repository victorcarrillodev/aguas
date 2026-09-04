export type CapaId = 'C0' | 'C1' | 'C2' | 'C3' | 'C4';

export type ArbolId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10';

export type VaultNodeType =
  | 'problema'
  | 'causa'
  | 'ficha'
  | 'actor'
  | 'efecto'
  | 'medicion'
  | 'metodo'
  | 'evidencia'
  | 'indice';

export interface VaultEdge {
  origen: string; // id del nodo (relPath)
  destino: string; // id del nodo
  tipo: 'enlace' | 'canvas' | 'jerarquia';
  etiqueta?: string;
}

export interface VaultNode {
  id: string; // relPath normalizado con "/" (sin URL-encoding)
  tipo: VaultNodeType;
  titulo: string; // del frontmatter o del nombre de archivo
  slug: string; // base64url del relPath (para rutas)
  relPath: string; // igual que id
  frontmatter: Record<string, string | undefined>;
  resumen: string; // primer blockquote "> ..." o primeros 160 chars del cuerpo
  arbol?: ArbolId;
  capa?: CapaId;
  lineaBaseDisponible?: boolean; // solo mediciones (## Línea base != No disponible)
}

export interface VaultGraph {
  nodos: Map<string, VaultNode>;
  aristas: VaultEdge[];
  escaneadoEn: number; // Date.now()
}

export interface FileMeta {
  mtimeMs: number;
  size: number;
}

export interface NotaCompleta {
  nodo: VaultNode;
  frontmatter: Record<string, string | undefined>;
  cuerpo: string; // markdown sin frontmatter
  links: string[]; // relPaths destino
}
