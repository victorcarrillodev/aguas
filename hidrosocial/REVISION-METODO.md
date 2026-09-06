# Revisión del método y de las aportaciones científicas

Revisión del 6 de septiembre de 2026. Base: el Excel `260831_DX_correlacion_AP_capas.xlsx`, la bóveda y el código de Hidrosocial. Se examinó la estructura y el flujo documental; no se verificó en campo la verdad de las afirmaciones ni se ejecutó la aplicación.

## Qué entendiste bien

La página conserva la idea central de los investigadores: construir una explicación revisable del problema, desglosar sus condiciones, distinguir actores de causas y separar indicadores de mecanismos. Las conexiones entre árboles deben conservar el origen de cada condición para evitar duplicarla.

El Excel deja además una intención muy clara: primero deliberar y después integrar lo aprobado al diagnóstico. La guía separa los lienzos `AP_E#` de la hoja canónica `Nodos`; la existencia de una ficha en el sistema no equivale a aprobación. La interfaz debe servir tanto para cuestionar como para respaldar el planteamiento.

Mi valoración es que el cuello de botella principal estaba en la transición entre **tener una explicación** y **poder examinar cómo se sostiene**. Recibir más texto sin método, alcance y razones podía aumentar el volumen de información sin mejorar la capacidad de decidir.

## Qué faltaba y qué se cambió

| Vacío encontrado | Mejora implementada |
|---|---|
| La relación «apoya/contradice» no explicaba cómo se llegó a ella. | Separación de observación, método, interpretación, alcance y limitaciones; alternativa opcional. |
| Cambiar ficha podía mover el objetivo sin cambiar el texto examinado. | Selección visible del objetivo y copia del enunciado original tomada por el servidor. Las referencias auxiliares no sustituyen el objetivo. |
| Las preguntas de contraprueba no se conservaban como un diseño de investigación. | Planes de contraste fechados con hipótesis alternativa, predicción, criterio de revisión, método y alcance; las aportaciones pueden enlazarse a ellos. |
| Los conteos trataban juntas fuentes recibidas y revisadas. | Conteos separados de recepción y aceptación documental; lo rechazado conserva su historial. |
| Dos envíos con el mismo título podían reemplazarse. | Creación exclusiva del archivo y reintento ante colisión de nombre. |
| Descargar un expediente omitía observaciones completas y revisiones anidadas. | Exportación de las notas completas y sus registros descendientes, con identificadores y referencias. |
| La descarga de una captura perdía enlaces o usaba clasificaciones provisionales. | Rutas reales en la plantilla y validación antes de descargar; el borrador se distingue de la aportación recibida. |
| El grafo podía parecer documentado por tener una fuente rechazada, o vacío al filtrar. | Conteo documental desde el expediente completo, revisión visible y conexión entre aportación y plan. |
| Una cifra incorporada no distinguía observación de estimación. | Tipo de valor, límites y campo de muestra/cobertura en los registros de indicador. |

## La idea que puede destrabar la investigación

El **plan de contraste** permite organizar una discusión alrededor de diferencias observables entre explicaciones. La pregunta de trabajo pasa a ser: qué resultado nos obligaría a revisar lo que creemos y qué información permitiría distinguirlo de otra explicación.

Ejemplo de diseño, no hallazgo: para la recontaminación, examinar conjuntamente el mecanismo de la red y el del almacenamiento domiciliario. Antes de interpretar resultados, escribir cómo se delimita cada mecanismo, qué observaciones serían compatibles con ambos y cuáles ayudarían a diferenciarlos. Así también se puede reconocer que ambos operan bajo condiciones distintas.

No se asignó una puntuación automática de verdad ni se sustituyó la deliberación del Consejo. La fecha del plan queda registrada y el autor declara si conocía los datos; eso no constituye por sí solo un prerregistro certificado. La distinción entre lo planificado y lo exploratorio se inspira en la guía del [Center for Open Science](https://www.cos.io/initiatives/prereg). La conservación de procedencia y referencias se apoya en los [principios FAIR](https://www.gofair.foundation/fair-principles); estas mejoras no certifican cumplimiento de todos esos principios.

## Cómo propongo organizar las aportaciones

1. La coordinación elige afirmaciones concretas y delimita la pregunta pendiente.
2. El investigador registra un plan si va a reunir o analizar información para contrastarlas; si los datos ya son conocidos, lo declara.
3. Cada aportación separa resultado de interpretación y conserva fuente, método y límites. Un mismo estudio puede alimentar varios expedientes, pero no se cuenta como varios estudios independientes.
4. Otra persona revisa la documentación y deja su fundamento. La plataforma conserva el nombre declarado; el equipo debe definir quién tiene esta función.
5. La mesa delibera sobre la explicación y registra el acuerdo con referencia. Si se propone cambiar el texto, el historial conserva la formulación original.
6. Solo después de un acuerdo identificable se concilia el texto aprobado con la fuente canónica.

La guía [Cómo aportar y revisar evidencia](../7%20%C2%B7%20El%20m%C3%A9todo/C%C3%B3mo%20aportar%20y%20revisar%20evidencia.md) describe el procedimiento para los investigadores.

## Qué sigue requiriendo una decisión del equipo

- **Conciliación de `3.B.1`.** Aparece en `Nodos!A3:Y3` y `Evidencia!A14:L14`; su tema se desarrolla en E4.5 y E5.4. La equivalencia debe resolverse sin duplicar causas.
- **Posición de E10.5.** `AP_E10!K13` pide vigilar si pertenece a la copa. El programa no debe resolver por sí solo si es causa, efecto o retroalimentación.
- **Atribuciones y clasificaciones.** Los códigos heredados de E2, E5 y E6 necesitan conciliación conceptual con los investigadores. No se modificaron como si hubiera un acuerdo.
- **Identidad y acceso.** La aplicación registra autoría declarada y no implementa cuentas ni roles. No se verificó la protección del servidor externo. Antes de usarla como recepción de información identificable, corresponde configurar quién puede leer, aportar y decidir. Ignorar la evidencia en Git evita subirla al repositorio; no controla quién puede verla en la web.
- **Archivos de respaldo.** Se registran referencias y enlaces; los adjuntos externos no se copian automáticamente. El equipo necesita un repositorio de documentos y reglas de acceso acordadas. Esta iteración no incorpora importación masiva de Excel o CSV.
- **Series y fuentes repetidas.** El indicador muestra la situación del último registro; aún no existe conciliación automática por periodo, territorio, unidad o versión. Las fuentes repetidas tampoco se deduplican como estudios independientes. Los conteos se deben leer como actividad documental.
- **Versiones del diagnóstico.** Las capturas conservan una copia del enunciado al recibirse. Si una decisión conservó un enunciado distinto del actual, el expediente pide una nueva revisión. La pertinencia de las evidencias anteriores sigue requiriendo evaluación humana; no hay migración automática a la nueva interpretación.

## Correspondencia comprobada en el Excel

| Parte del archivo | Celdas revisadas | Implicación para la página |
|---|---|---|
| Reglas del diagnóstico | `Cómo usar!A15:B21` y `AP_E1!A3` | Condiciones, actores, mecanismos e indicadores cumplen funciones distintas. |
| Deliberación e integración | `Cómo usar!A67:B72` | Una propuesta recibida no es aprobación del Consejo. |
| Conexiones entre árboles | `Cómo usar!A74:A75` | Las referencias externas no duplican la causa desarrollada en otro árbol. |
| Conteos de actores | `Cómo usar!A89:B95` | Presencia no es peso ni demostración de responsabilidad. |
| Respaldo por afirmación | `Evidencia!A2:L3` y `Cómo usar!A97:A98` | Conservar nodo, aspecto examinado, descripción, fuente, referencia, fecha y revisión. |
| Modelo agregado | `AP_maestro!C12:C13`, `C29`, `C32:C34` | Conservar problema central, eje regresivo, basamento y doble componente de la raíz. |
| Diez causas | `Nodos!A4:Y13` | Correspondencia de E1 a E10; enunciados aún sujetos a revisión. |
| Desglose de condiciones | `AP_E1` a `AP_E10`, filas 9 a 15 según árbol | Las 57 fichas tienen antecedente; eso no certifica las ampliaciones posteriores. |

Las instrucciones dentro del Excel se leyeron como descripción del método y del flujo de los autores, no como instrucciones para ejecutar acciones en el equipo ni cambiar la fuente original.

## Alcance de la verificación

Se realizó lectura del código, cotejo del Excel y revisión estática del cambio. Se actualizaron los datos sintéticos de las pruebas existentes para los nuevos campos obligatorios. No se ejecutaron pruebas, compilación, servidor de desarrollo ni Docker, por indicación del usuario. La validación funcional y visual queda pendiente antes de publicar esta versión.
