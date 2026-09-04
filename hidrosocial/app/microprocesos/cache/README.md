# cache

Frontera: ÚNICA puerta de LECTURA del vault (frescura: TTL 2s + mtime).
Propósito: servir `VaultGraph` en memoria sin reparsear en cada request.
Lo que NO hace: parsear (delega en vault-core), escribir, métricas.
Contrato: `getVaultGraph(): Promise<VaultGraph>`;
`invalidar(): void`; `getVaultPath(): string` (`VAULT_PATH` o `..`).
Razón de cambio: solo si cambia la política de frescura (TTL, firmas).
