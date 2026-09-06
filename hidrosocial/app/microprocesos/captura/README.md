# captura

Frontera de escritura: validar el formulario, resolver sus referencias y crear una nota nueva en 9 · Evidencia de campo.

- validarBorrador(fd) exige un objetivo explícito, fuente, referencia, responsable, observación, método, interpretación, alcance y limitaciones. Las explicaciones alternativas y el plan de contraste son opcionales.
- validarBorradorParcial(p) devuelve borrador y completitud para la vista previa. Completitud significa presencia de campos, no calidad científica. Los valores provisionales no deben enviarse ni exportarse como una captura completa.
- contextoPreview conserva las rutas reales recibidas del loader. La opción de cada árbol debe incluir relPath; ficha y medición conservan valor como ruta por compatibilidad.
- renderPlantilla(b, ctx) produce el esquema 2: observación completa y razonamiento tanto en frontmatter como en el cuerpo. Todos los escalares usan cadenas JSON para conservar saltos y caracteres.
- guardarNota(b) resuelve nodoId sin asignar un objetivo implícito. Ficha y medición son relaciones auxiliares y no cambian ese objetivo. Si hay planId, exige un registro de contraste del mismo nodo.
- texto_original se obtiene del nodo actual al guardar; afirmacion conserva el aspecto específico escrito por el investigador.
- Las notas se crean con escritura exclusiva. Una colisión de nombre genera un sufijo; cualquier otro error se devuelve sin sobrescribir archivos.
- Los tipos conservan campos opcionales para poder leer notas anteriores. El validador de formularios exige los campos del esquema actual.

Esquema, plantilla y parcial son puros y no importan node:fs. La captura registra aportaciones; no certifica identidades, acuerdos ni conclusiones.
