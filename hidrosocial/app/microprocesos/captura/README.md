# captura

Frontera: ÚNICA puerta de ESCRITURA (validar Borrador → plantilla → `9 · Evidencia de campo/`).
Propósito: convertir el cuestionario en una nota `.md` válida del vault.
Lo que NO hace: leer el vault (salvo resolver causa/ficha/medición al guardar), métricas, React.
Contrato: `validarBorrador(fd: FormData): Borrador` (lanza Error legible);
`validarBorradorParcial(p): {borrador, errores}` (puro, para preview cliente);
`renderPlantilla(b, ctx): string` (puro, sin `node:fs`);
`guardarNota(b): Promise<VaultNode>` (solo append en `9 · Evidencia de campo/`).
`plantilla.ts` y `esquema.ts`/`parcial.ts` NO importan `node:fs`.
Razón de cambio: solo si cambia la plantilla de nota o las reglas del cuestionario.
