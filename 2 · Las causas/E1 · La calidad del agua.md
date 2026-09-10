---
id: E1
padre: PC
supuesto_E7: "Los recursos de operación y mantenimiento llegan a las plantas (Propósito de E7). Si se drenan, la calidad cae."
supuesto_E5: "La fuente no recibe carga contaminante (Propósito de E5). Bisagra: calidad en origen."
tipo: causa
titulo: E1 · La calidad del agua
aliases: [E1, "Incumplimiento de calidad (NOM-127)"]
resumen: "Incumplimiento de calidad (NOM-127)"
rama: 1
enunciado: "Habitantes del AMG, conectados a la red hidráulica del SIAPA, reciben agua sin cumplimiento de la NOM-127-SSA1-2021."
capa: C1
capas_secundarias: [C4]
macroproceso: ABAS
actores: [SIAPA, PLAN]
factor: F1
dimension: BIO
genera: [SIAPA, PLAN]
debe_resolver: [SIAPA, PLAN]
brecha: ninguna
naturaleza: Omisión
ambito: SIAPA
toca_raiz: true
depende_de: [E7, E5]
sostiene_a: [E10]
contacto: [E2, E5, E6, E10]
efectos: [EF-morbilidad, EF-gasto-embotellada, EF-dhays]
mediciones: [IND-cumplimiento-nom127, IND-cobertura-monitoreo-calidad, IND-cloro-residual]
magnitud: "% de zonas que cumplen los parámetros de la NOM-127-SSA1-2021"
linea_base: null
estado: en-revision
---

# E1 · La calidad del agua

> **El problema**
> Habitantes del AMG, conectados a la red hidráulica del SIAPA, reciben agua sin cumplimiento de la NOM-127-SSA1-2021.

El agua puede salir de la planta cumpliendo la norma y aun así no llegar así a la llave. Este árbol separa los dos momentos en que la calidad se pierde: antes de potabilizar, porque la fuente llega deteriorada y la planta no da abasto; y después de entregar, porque la red se despresuriza y el hogar tiene que almacenar.

---

## Por qué ocurre

**1 · La capacidad instalada de potabilización opera por debajo de la carga que la fuente y la demanda exigen.**

*Lo que produce:* menos remoción de contaminantes.

*Causa directa · Omisión · atribución SIAPA · ficha [E1.1](../3%20%C2%B7%20Las%20fichas/E1.1.md)*

---

**2 · El control de calidad (muestreo, cloración, vigilancia) se realiza de forma insuficiente e intermitente a lo largo de la red.**

*Lo que produce:* agua sale de norma sin detección.

*Causa directa · Omisión · atribución SIAPA · ficha [E1.2](../3%20%C2%B7%20Las%20fichas/E1.2.md)*

> **Y eso, ¿por qué?** El monitoreo de calidad se concentra en pocos puntos y no cubre el territorio de la red.
> *Omisión · atribución SIAPA · ficha [E1.2.1](../3%20%C2%B7%20Las%20fichas/E1.2.1.md)*

---

**3 · La red se despresuriza por el tandeo y admite intrusión de contaminantes por fracturas y baja presión.**

*Lo que produce:* recontaminación post-planta. Esta misma condición toca a [E2 · El tandeo](./E2%20%C2%B7%20El%20tandeo.md).

*Causa directa · Mixta · atribución SIAPA · ficha [E1.3](../3%20%C2%B7%20Las%20fichas/E1.3.md)*

---

**4 · Las fuentes de abastecimiento presentan deterioro de calidad en origen que la planta no remueve del todo.**

*Lo que produce:* carga que excede el diseño. Esta misma condición toca a [E5 · La carga a la cuenca](./E5%20%C2%B7%20La%20carga%20a%20la%20cuenca.md) y [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md).

*Causa directa · Mixta · atribución Mixto · ficha [E1.4](../3%20%C2%B7%20Las%20fichas/E1.4.md)*

---

**5 · El almacenamiento domiciliario forzado por la intermitencia degrada el agua ya entregada (tinacos/aljibes).**

*Lo que produce:* contaminación en el último tramo. Esta misma condición toca a [E2 · El tandeo](./E2%20%C2%B7%20El%20tandeo.md).

*Causa directa · Mixta · atribución Mixto · ficha [E1.5](../3%20%C2%B7%20Las%20fichas/E1.5.md)*

---

## De qué depende, fuera de este árbol

Hay condiciones que este árbol necesita y que **no puede resolver por dentro**: pertenecen a otros. Se anotan aparte para no contarlas dos veces.

**Supuesto con [E7 · La captura del presupuesto](./E7%20%C2%B7%20La%20captura%20del%20presupuesto.md).** Los recursos de operación y mantenimiento llegan a las plantas (Propósito de E7). Si se drenan, la calidad cae.

**Supuesto con [E5 · La carga a la cuenca](./E5%20%C2%B7%20La%20carga%20a%20la%20cuenca.md).** La fuente no recibe carga contaminante (Propósito de E5). Bisagra: calidad en origen.

**Desde la raíz.** Sin medición endógena verificable, el incumplimiento no se detecta ni se sanciona. → [La raíz maestra](../1%20%C2%B7%20El%20problema/La%20ra%C3%ADz%20maestra.md)

---

## Qué provoca

Estos son **efectos**. Viajan hacia arriba y alimentan otros árboles. No se intervienen: se leen.

**[Morbilidad de origen hídrico](../5%20%C2%B7%20Los%20efectos/Morbilidad%20de%20origen%20h%C3%ADdrico.md)** — Morbilidad de origen hídrico y gasto en salud.

**[Gasto en agua embotellada](../5%20%C2%B7%20Los%20efectos/Gasto%20en%20agua%20embotellada.md)** — Gasto privado en agua embotellada.

**[Erosión del derecho al agua](../5%20%C2%B7%20Los%20efectos/Erosi%C3%B3n%20del%20derecho%20al%20agua.md)** — Erosión del Derecho Humano al Agua y al Saneamiento (DHAyS): la población del AMG no lo ejerce con calidad, equidad y sostenibilidad.
También lo produce [el problema central](../1%20%C2%B7%20El%20problema/El%20problema%20central.md).

---

## Cómo se mediría

- **[Cumplimiento de la NOM-127](../6%20%C2%B7%20Las%20mediciones/Cumplimiento%20de%20la%20NOM-127.md)** — % de muestras y zonas que cumplen la NOM-127-SSA1-2021
- **[Cobertura del monitoreo de calidad](../6%20%C2%B7%20Las%20mediciones/Cobertura%20del%20monitoreo%20de%20calidad.md)** — Cobertura territorial del monitoreo de calidad
- **[Continuidad de cloro residual](../6%20%C2%B7%20Las%20mediciones/Continuidad%20de%20cloro%20residual.md)** — Continuidad de cloro residual en red

Estas mediciones no tienen una línea base incorporada al diagnóstico original. Su disponibilidad pública requiere una búsqueda documentada. → [Las mediciones](../6%20%C2%B7%20Las%20mediciones/Las%20mediciones.md)

---

## Quién lo causa y quién debería resolverlo

**Lo causa:** [SIAPA](../4%20%C2%B7%20Los%20actores/SIAPA.md) *(Organismo operador)* · [PLAN](../4%20%C2%B7%20Los%20actores/PLAN.md) *(Planeación)*
**Debería resolverlo:** [SIAPA](../4%20%C2%B7%20Los%20actores/SIAPA.md) *(Organismo operador)* · [PLAN](../4%20%C2%B7%20Los%20actores/PLAN.md) *(Planeación)*

El mismo actor causa el problema y es el responsable de corregirlo: **juez y parte**. → [Quién causa y quién debe resolver](../7%20%C2%B7%20El%20m%C3%A9todo/Qui%C3%A9n%20causa%20y%20qui%C3%A9n%20debe%20resolver.md)

**Naturaleza:** Omisión — no se hace lo debido.
**Ámbito de atribución:** SIAPA

---

## Dónde se conecta

**Este árbol depende de:**

- [E7 · La captura del presupuesto](./E7%20%C2%B7%20La%20captura%20del%20presupuesto.md) — da por supuesto que ahí funciona lo que aquí hace falta
- [E5 · La carga a la cuenca](./E5%20%C2%B7%20La%20carga%20a%20la%20cuenca.md) — da por supuesto que ahí funciona lo que aquí hace falta

**Y sostiene a:**

- [E10 · El gasto privado forzado](./E10%20%C2%B7%20El%20gasto%20privado%20forzado.md) — lo da por supuesto

**Puntos de contacto:**

- [E2 · El tandeo](./E2%20%C2%B7%20El%20tandeo.md) — por [E1.3](../3%20%C2%B7%20Las%20fichas/E1.3.md), [E1.5](../3%20%C2%B7%20Las%20fichas/E1.5.md)
- [E5 · La carga a la cuenca](./E5%20%C2%B7%20La%20carga%20a%20la%20cuenca.md) — por [E1.4](../3%20%C2%B7%20Las%20fichas/E1.4.md)
- [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md) — por [E1.4](../3%20%C2%B7%20Las%20fichas/E1.4.md)
- [E10 · El gasto privado forzado](./E10%20%C2%B7%20El%20gasto%20privado%20forzado.md) — por [E10.2](../3%20%C2%B7%20Las%20fichas/E10.2.md)


---

## Ficha

| | |
|---|---|
| Capa dominante | Macroprocesos *(secundaria: Dimensiones)* |
| Macroproceso | Abasto-potabilización |
| Actores implicados | Organismo operador, Planeación |
| Fuerza de presión | Tiempo y obsolescencia |
| Lente de análisis | Biofísica-técnica |
| Causas directas | 5 |
| Mapa | [Ver el mapa](../8%20%C2%B7%20Mapas/E1%20%C2%B7%20La%20calidad%20del%20agua%20%C2%B7%20mapa.canvas) |
