# dashboard

Frontera: agregaciones puras sobre `VaultGraph` (KPIs, causas, evidencias, brechas).
Propósito: métricas del panel sin tocar fs ni conocer React.
Lo que NO hace: leer/escribir fs, renderizar, filtrar el grafo.
Contrato: `calcularMetricas(g): MetricasDashboard` con
`evidencias: {relPath, titulo, fecha}[]` (fecha de frontmatter o nombre, orden desc);
`brechas: {medicionesSinLineaBase, total}`;
Criticidad de causa: alta ≥8 fichas, media ≥4, baja <4 (`criticidadDe(fichas)`).
Razón de cambio: solo si cambian los KPIs o sus reglas.
