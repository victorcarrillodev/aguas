# grafo

Frontera: preparar datos de red (layout FA2, filtros, grado, densidad, modularidad, vecinos).
Propósito: convertir `VaultGraph` en nodos/aristas serializables + métricas de red.
Lo que NO hace: tocar fs, renderizar (sigma vive en `rutas/WrapperSigma`).
Contrato: `construirGrafoRender(g, filtro?): GrafoRender`;
`vecinosDe(id, g, profundidad=1): VaultNode[]`;
`grado(g, id): number`; `densidad(g) = 2·E/(N·(N−1))` (0 si N<2);
`modularidad(g): number` (louvain de `graphology-communities-louvain`, 0 si N<2 o falla).
Tamaño de nodo ∝ 4+2·log(1+grado).
Razón de cambio: solo si cambian layout, filtros o métricas de red.
