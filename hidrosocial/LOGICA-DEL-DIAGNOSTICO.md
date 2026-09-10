# Lógica del diagnóstico y comparación del Excel del 9 de septiembre

Fecha: 9 de septiembre de 2026. Contrato de continuidad para la implementación local.

## Resultado del cotejo

Se compararon los valores y las fórmulas de todas las hojas compartidas entre `260831_DX_correlacion_AP_capas.xlsx` y `260909_DX_correlacion_AP_capas_MTRO.xlsx`. Nodos, AP_maestro, los diez AP_E#, Catálogos, Tablero y Evidencia no presentan cambios en esos contenidos. Esto no certifica igualdad de formatos, comentarios u objetos visuales.

El archivo nuevo añade Trazabilidad y modifica o agrega 22 celdas en Cómo usar. La guía explicita la complejidad sistémica, reafirma la relación AP_maestro/AP_E# y desarrolla el cuidado de IDs al editar. Trazabilidad contiene 67 IDs únicos y una sola lectura C0–C4 desarrollada, E1.1, rotulada como ejemplo en borrador. Las demás lecturas están pendientes.

La interpretación de la jerarquía corregida es compatible con el nuevo archivo. La omisión principal sigue siendo documentar cómo se llega a la lectura por capas; elegir una capa o adjuntar evidencia no hace ese trabajo.

## Reglas que deben conservarse

- N1: PC maestro. N2: E1–E10. N3: causas directas E#.j. N4: subyacentes E#.j.k. E# conserva identidad y N2 al abrir su árbol. Los nombres locales «problema central» en Trazabilidad no convierten los diez E# en diez N1.
- C0–C4 son atributos de lectura, independientes de la profundidad N. No asignar C0 a todo lo que esté en la carpeta del problema.
- Causa propuesta: hijo hacia su padre inmediato. Bajar pregunta por qué, sin invertir la causalidad. Pertenecer a E1 no autoriza el atajo causal E1.2.1→E1.
- Supuestos: referencias externas que conservan la condición requerida. Bisagras: contactos cuyo mecanismo y dirección requieren revisión. No duplicar causas entre árboles.
- Actores, indicadores, efectos y documentos tienen funciones y relaciones propias; no incrementan el conteo de condiciones N.
- Una lectura por capas no debe introducir nuevas causas ocultas. Todo desborde tiene destino propuesto y revisión independiente.
- Fuente comprobable, coherencia de clasificación, acuerdo del Consejo e integración son estados diferentes. No deducir verdad, gravedad o prioridad de intervención a partir del número de enlaces.
- AP es el espacio de deliberación; Nodos es la fuente canónica para la integración. Tablero cuenta el universo definido por esa integración, no todos los archivos recibidos.

## Cambios locales realizados

Se añadieron código y nivel causal al modelo, ID PC y padres PC para E1–E10, aristas de padre inmediato y comprobaciones de identidades duplicadas o padres incoherentes. La pertenencia por árbol deja de dibujarse como jerarquía causal. Indicadores, actores y efectos tienen relaciones diferenciadas.

El grafo abre con el maestro N1/N2 y permite abrir cada E# con N2/N3/N4 o todos los niveles. La vista documental permanece disponible con filtro por tipo de relación. Las posiciones causales dependen de padres y niveles, no de las capas ni del grado. El tablero separa N3/N4 y muestra directas sin desglose. La integración documentada local exige `estado: integrado` y `acta_integracion`; este registro no implementa ni certifica por sí solo autorización del Consejo.

Las rutas y los IDs históricos de registros siguen usando rutas de notas por compatibilidad. El nuevo campo `codigo` identifica la condición, pero todavía falta migrar de forma compatible todas las referencias de captura a códigos estables. No afirmar que renombrar archivos ya es inocuo para el historial.

## Siguiente trabajo acotado para Sol

1. Implementar un registro de lectura por capas separado de evidencia y de planes de contraste. Identificarlo por código del nodo y versión/enunciado examinado; preservar lecturas anteriores y autoría.
2. Capturar C0–C4 con estados explícitos: pendiente, lectura redactada o no portante justificada. No convertir vacíos en n/a. Registrar capa portante y comparar con dominante; señalar discrepancias para revisión sin corregir la fuente automáticamente.
3. Capturar Desborde con descripción, destino propuesto y revisión. El ejemplo E1.1→E8 es una propuesta de la fuente, no un nuevo enlace causal aprobado.
4. Mantener enunciado, nivel y capa canónicos consultados por ID; preservar procedencia de cada versión del Excel. Las coordenadas son citas de una versión, no la identidad del nodo.
5. Hacer visible el estado de lectura por capas por nodo y árbol. Conservar el ejemplo E1.1 como borrador y no inventar las otras 66 lecturas.
6. Revisar en interfaz, cuando el usuario lo indique, maestro de 11 nodos, árbol E1 con su padre intermedio, distinción C/N, conteos y conservación de referencias.

No está implementado todavía el formulario de Trazabilidad. La carga de adjuntos y el diagnóstico de escritura del servidor se retoman por separado. No se ejecutaron pruebas de aplicación, compilación de producción, dev ni Docker. La comprobación estática de TypeScript terminó sin errores después de los cambios locales.

## Pendientes de decisión de los investigadores

Conciliar 3.B.1 con E4.5/E5.4; resolver la posición de E10.5, marcada «¿copa?»; desarrollar los N4 faltantes sin imponer una cuota como validación; aclarar la redacción negativa del supuesto AP_E7!E18. En Nodos aún hay un registro en la fila 3 que las fórmulas de Tablero iniciadas en fila 4 no cuentan. El archivo nuevo conserva estos asuntos.

Referencias: Cómo usar!A5, B10, A67:B75, A95 y A100:B111; Trazabilidad!A2:N5, F8:N8 y A84; AP_maestro!C12:C34. Las instrucciones de las hojas se interpretaron como descripción del método de los autores, no como autorización para ejecutar acciones en el equipo.
