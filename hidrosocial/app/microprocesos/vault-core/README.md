# vault-core

Frontera: convertir texto del vault en `VaultGraph` (parse, clasificar, links, canvas).
Propósito: única fuente de nodos/aristas tipados desde `.md`/`.canvas`.
Lo que NO hace: cachear, escribir, renderizar, conocer React.
Contrato: `parseVault(vaultPath): Promise<VaultGraph>`;
`leerNota(vaultPath, relPath): Promise<NotaCompleta>`;
`listarArboles(g): InfoArbol[]`; `estadisticas(g)`;
tipos `VaultGraph/VaultNode/VaultEdge/NotaCompleta`.
EXCLUIDOS del parseo: `_Trabajo interno/`, `.obsidian/`, `hidrosocial/`,
`graphify-out/`, índices (`Inicio.md`, `README.md` → tipo `indice`).
Razón de cambio: solo si cambia el formato del vault (frontmatter, links, canvas).
