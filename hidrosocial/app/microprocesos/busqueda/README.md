# busqueda

Frontera: dado `VaultGraph` + consulta → resultados rankeados.
Propósito: búsqueda full-text simple (título, resumen, capa, tipo).
Lo que NO hace: leer fs, renderizar, conocer React, paginar.
Contrato: `buscar(g, q): ResultadoBusqueda[]` (`{nodo, puntos}`);
`normalizar(s): string` (minúsculas sin acentos, NFD).
Ranking: título 3 (exacto 6), resumen 1, tags/arbol 2; tope 12.
Razón de cambio: solo si cambia la relevancia o los campos buscados.
