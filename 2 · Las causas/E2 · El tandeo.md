---
id: E2
tipo: causa
titulo: E2 · El tandeo
aliases: [E2, "Servicio discontinuo (tandeo)"]
resumen: "Servicio discontinuo (tandeo)"
rama: 2
enunciado: "Habitantes del AMG, conectados a la red del SIAPA, reciben un servicio discontinuo de agua."
capa: C1
capas_secundarias: [C3]
macroproceso: DIST
actores: [SIAPA, DIST]
factor: F1
dimension: BIO
genera: [DIST, PLAN]
debe_resolver: [DIST, PLAN]
brecha: ninguna
naturaleza: Omisión
ambito: SIAPA
toca_raiz: true
depende_de: [E7, E6]
sostiene_a: [E10]
contacto: [E6, E3, E9, E1, E10]
efectos: [EF-almacenamiento-domiciliario, EF-gasto-pipas, EF-inequidad-sin-tinaco]
mediciones: [IND-horas-suministro, IND-perdidas-fisicas, IND-red-sectorizada]
magnitud: "Continuidad del servicio (horas de suministro al día)"
linea_base: null
estado: en-revision
---

# E2 · El tandeo

> **El problema**
> Habitantes del AMG, conectados a la red del SIAPA, reciben un servicio discontinuo de agua.

El tandeo no es una avería: es la forma en que el sistema administra un déficit que no reconoce en público. Este árbol explica de dónde sale ese déficit —el documento propone un rango de pérdidas de 36.8–50 %, pendiente de contrastar— y por qué el reparto de lo que queda no tiene calendario ni criterio.

---

## Por qué ocurre

**1 · Las pérdidas físicas en la red (36.8–50 %) reducen el volumen disponible para entrega continua.**

*Lo que produce:* menos agua para repartir.

*Causa directa · Omisión · atribución SIAPA · ficha [E2.1](../3%20%C2%B7%20Las%20fichas/E2.1.md)*

> **Y eso, ¿por qué?** La reposición anual de red se mantiene muy por debajo de la tasa de deterioro (meta de 172 km/año no ejecutada).
> *Omisión · atribución SIAPA · ficha [E2.1.1](../3%20%C2%B7%20Las%20fichas/E2.1.1.md)*

---

**2 · La red opera sin sectorización ni control de presión, lo que impide gestionar la demanda sin cortes.**

*Lo que produce:* racionamiento por incapacidad de control.

*Causa directa · Omisión · atribución SIAPA · ficha [E2.2](../3%20%C2%B7%20Las%20fichas/E2.2.md)*

---

**3 · La capacidad de fuentes y conducción es insuficiente frente a la demanda en estiaje.**

*Lo que produce:* déficit estacional de oferta. Esta misma condición toca a [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md).

*Causa directa · Mixta · atribución SIAPA · ficha [E2.3](../3%20%C2%B7%20Las%20fichas/E2.3.md)*

---

**4 · El deterioro no repuesto de infraestructura (bombeo, líneas) provoca fallas recurrentes de suministro.**

*Lo que produce:* interrupciones no programadas.

*Causa directa · Omisión · atribución SIAPA · ficha [E2.4](../3%20%C2%B7%20Las%20fichas/E2.4.md)*

---

**5 · El tandeo se administra como racionamiento no declarado, sin criterio equitativo ni calendario público.**

*Lo que produce:* discontinuidad opaca e inequitativa. Esta misma condición toca a [E3 · La tarifa](./E3%20%C2%B7%20La%20tarifa.md) y [E9 · La exigencia débil](./E9%20%C2%B7%20La%20exigencia%20d%C3%A9bil.md).

*Causa directa · Acción · atribución SIAPA · ficha [E2.5](../3%20%C2%B7%20Las%20fichas/E2.5.md)*

---

## De qué depende, fuera de este árbol

Hay condiciones que este árbol necesita y que **no puede resolver por dentro**: pertenecen a otros. Se anotan aparte para no contarlas dos veces.

**Supuesto con [E7 · La captura del presupuesto](./E7%20%C2%B7%20La%20captura%20del%20presupuesto.md).** La inversión en reposición de red se ejecuta (Propósito de E7).

**Supuesto con [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md).** La fuente no se sobreexplota por el circuito informal (Propósito de E6).

**Desde la raíz.** Sin balance hídrico auditado no se dimensiona el déficit ni el tandeo. → [La raíz maestra](../1%20%C2%B7%20El%20problema/La%20ra%C3%ADz%20maestra.md)

---

## Qué provoca

Estos son **efectos**. Viajan hacia arriba y alimentan otros árboles. No se intervienen: se leen.

**[Almacenamiento domiciliario](../5%20%C2%B7%20Los%20efectos/Almacenamiento%20domiciliario.md)** — Almacenamiento domiciliario que degrada la calidad del agua ya entregada.

**[Gasto en pipas](../5%20%C2%B7%20Los%20efectos/Gasto%20en%20pipas.md)** — Gasto en pipas para suplir la intermitencia.

**[La inequidad del tandeo](../5%20%C2%B7%20Los%20efectos/La%20inequidad%20del%20tandeo.md)** — Inequidad del tandeo: es peor para quien no tiene tinaco ni aljibe.

---

## Cómo se mediría

- **[Horas de suministro al día](../6%20%C2%B7%20Las%20mediciones/Horas%20de%20suministro%20al%20d%C3%ADa.md)** — Horas de suministro al día por zona
- **[Pérdidas físicas de la red](../6%20%C2%B7%20Las%20mediciones/P%C3%A9rdidas%20f%C3%ADsicas%20de%20la%20red.md)** — % de pérdidas físicas (agua no contabilizada)
- **[Sectorización y reposición de red](../6%20%C2%B7%20Las%20mediciones/Sectorizaci%C3%B3n%20y%20reposici%C3%B3n%20de%20red.md)** — % de red sectorizada; tasa de reposición contra tasa de deterioro

Estas mediciones no tienen una línea base incorporada al diagnóstico original. Su disponibilidad pública requiere una búsqueda documentada. → [Las mediciones](../6%20%C2%B7%20Las%20mediciones/Las%20mediciones.md)

---

## Quién lo causa y quién debería resolverlo

**Lo causa:** [DIST](../4%20%C2%B7%20Los%20actores/DIST.md) *(Distribución)* · [PLAN](../4%20%C2%B7%20Los%20actores/PLAN.md) *(Planeación)*
**Debería resolverlo:** [DIST](../4%20%C2%B7%20Los%20actores/DIST.md) *(Distribución)* · [PLAN](../4%20%C2%B7%20Los%20actores/PLAN.md) *(Planeación)*

El mismo actor causa el problema y es el responsable de corregirlo: **juez y parte**. → [Quién causa y quién debe resolver](../7%20%C2%B7%20El%20m%C3%A9todo/Qui%C3%A9n%20causa%20y%20qui%C3%A9n%20debe%20resolver.md)

**Naturaleza:** Omisión — no se hace lo debido.
**Ámbito de atribución:** SIAPA

---

## Dónde se conecta

**Este árbol depende de:**

- [E7 · La captura del presupuesto](./E7%20%C2%B7%20La%20captura%20del%20presupuesto.md) — da por supuesto que ahí funciona lo que aquí hace falta
- [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md) — da por supuesto que ahí funciona lo que aquí hace falta

**Y sostiene a:**

- [E10 · El gasto privado forzado](./E10%20%C2%B7%20El%20gasto%20privado%20forzado.md) — lo da por supuesto

**Puntos de contacto:**

- [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md) — por [E2.3](../3%20%C2%B7%20Las%20fichas/E2.3.md)
- [E3 · La tarifa](./E3%20%C2%B7%20La%20tarifa.md) — por [E2.5](../3%20%C2%B7%20Las%20fichas/E2.5.md), [E3.4](../3%20%C2%B7%20Las%20fichas/E3.4.md)
- [E9 · La exigencia débil](./E9%20%C2%B7%20La%20exigencia%20d%C3%A9bil.md) — por [E2.5](../3%20%C2%B7%20Las%20fichas/E2.5.md)
- [E1 · La calidad del agua](./E1%20%C2%B7%20La%20calidad%20del%20agua.md) — por [E1.3](../3%20%C2%B7%20Las%20fichas/E1.3.md), [E1.5](../3%20%C2%B7%20Las%20fichas/E1.5.md)
- [E10 · El gasto privado forzado](./E10%20%C2%B7%20El%20gasto%20privado%20forzado.md) — por [E10.3](../3%20%C2%B7%20Las%20fichas/E10.3.md)


---

## Ficha

| | |
|---|---|
| Capa dominante | Macroprocesos *(secundaria: Factores)* |
| Macroproceso | Distribución |
| Actores implicados | Organismo operador, Distribución |
| Fuerza de presión | Tiempo y obsolescencia |
| Lente de análisis | Biofísica-técnica |
| Causas directas | 5 |
| Mapa | [Ver el mapa](../8%20%C2%B7%20Mapas/E2%20%C2%B7%20El%20tandeo%20%C2%B7%20mapa.canvas) |
