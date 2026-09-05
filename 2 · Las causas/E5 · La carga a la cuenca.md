---
id: E5
tipo: causa
titulo: E5 · La carga a la cuenca
aliases: [E5, "Carga contaminante en la cuenca"]
resumen: "Carga contaminante en la cuenca"
rama: 5
enunciado: "La cuenca-activo y las comunidades ribereñas aguas abajo reciben carga contaminante."
capa: C1
capas_secundarias: [C0]
macroproceso: SANE
actores: [SIAPA]
factor: F1
dimension: AMB
genera: [SIAPA]
debe_resolver: [SANE]
brecha: total
naturaleza: Omisión
ambito: SIAPA
toca_raiz: true
depende_de: [E8]
sostiene_a: [E1]
contacto: [E6, E4, E1]
efectos: [EF-deterioro-fuente, EF-dano-riberenas, EF-agotamiento-cualitativo]
mediciones: [IND-caudal-tratado, IND-reuso-efectivo, IND-cumplimiento-descarga]
magnitud: "% de caudal residual tratado antes de descarga; % de reúso efectivo"
linea_base: null
estado: en-revision
---

# E5 · La carga a la cuenca

> **El problema**
> La cuenca-activo y las comunidades ribereñas aguas abajo reciben carga contaminante.

El sistema le devuelve a la cuenca lo que le quitó, pero no en las condiciones en que lo tomó. Este árbol explica dónde se rompe ese retorno: en la cobertura de tratamiento, en la operación de las plantas y en lo que entra al drenaje sin ser vigilado.

---

## Por qué ocurre

**1 · El agua servida se devuelve a la cuenca con saneamiento insuficiente (cobertura/eficiencia de tratamiento por debajo de lo requerido).**

*Lo que produce:* carga contaminante al receptor.

*Causa directa · Omisión · atribución SIAPA · ficha [E5.1](../3%20%C2%B7%20Las%20fichas/E5.1.md)*

---

**2 · El reúso del agua tratada se mantiene subutilizado, elevando la extracción de primer uso y la descarga.**

*Lo que produce:* más descarga y más extracción. Esta misma condición toca a [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md).

*Causa directa · Omisión · atribución SIAPA · ficha [E5.2](../3%20%C2%B7%20Las%20fichas/E5.2.md)*

---

**3 · Las plantas de tratamiento operan por debajo de su capacidad o fuera de norma.**

*Lo que produce:* efluente no conforme.

*Causa directa · Mixta · atribución SIAPA · ficha [E5.3](../3%20%C2%B7%20Las%20fichas/E5.3.md)*

> **Y eso, ¿por qué?** Los efluentes se monitorean de forma esporádica, sin telemetría continua.
> *Omisión · atribución SIAPA · ficha [E5.3.1](../3%20%C2%B7%20Las%20fichas/E5.3.1.md)*

---

**4 · Descargas industriales y de servicios fuera de norma llegan a colectores y cuerpos receptores sin control.**

*Lo que produce:* carga puntual no tratada. Esta misma condición toca a [E4 · Las inundaciones](./E4%20%C2%B7%20Las%20inundaciones.md).

*Causa directa · Acción · atribución Mixto · ficha [E5.4](../3%20%C2%B7%20Las%20fichas/E5.4.md)*

---

**5 · El drenaje combinado vierte mezcla pluvial-sanitaria a cauces en episodios de lluvia.**

*Lo que produce:* descarga difusa contaminada. Esta misma condición toca a [E4 · Las inundaciones](./E4%20%C2%B7%20Las%20inundaciones.md).

*Causa directa · Mixta · atribución Mixto · ficha [E5.5](../3%20%C2%B7%20Las%20fichas/E5.5.md)*

---

## De qué depende, fuera de este árbol

Hay condiciones que este árbol necesita y que **no puede resolver por dentro**: pertenecen a otros. Se anotan aparte para no contarlas dos veces.

**Supuesto con [E8 · La fiscalización invertida](./E8%20%C2%B7%20La%20fiscalizaci%C3%B3n%20invertida.md).** Se vigila y se sanciona la descarga fuera de norma (Propósito de E8).

**Bisagra con [E4 · Las inundaciones](./E4%20%C2%B7%20Las%20inundaciones.md).** Drenaje combinado y descargas industriales alimentan la carga.

**Bisagra con [E1 · La calidad del agua](./E1%20%C2%B7%20La%20calidad%20del%20agua.md).** La carga en origen degrada la fuente y regresa como problema de calidad (E1).

---

## Qué provoca

Estos son **efectos**. Viajan hacia arriba y alimentan otros árboles. No se intervienen: se leen.

**[Deterioro de la fuente](../5%20%C2%B7%20Los%20efectos/Deterioro%20de%20la%20fuente.md)** — Deterioro de la calidad de la fuente de abastecimiento.

**[Daño a las comunidades ribereñas](../5%20%C2%B7%20Los%20efectos/Da%C3%B1o%20a%20las%20comunidades%20ribere%C3%B1as.md)** — Daño a las comunidades ribereñas aguas abajo.

**[Agotamiento cualitativo de la cuenca](../5%20%C2%B7%20Los%20efectos/Agotamiento%20cualitativo%20de%20la%20cuenca.md)** — Agotamiento cualitativo del activo-cuenca (insostenibilidad).

---

## Cómo se mediría

- **[Caudal tratado antes de descarga](../6%20%C2%B7%20Las%20mediciones/Caudal%20tratado%20antes%20de%20descarga.md)** — % de caudal residual tratado antes de la descarga
- **[Reúso efectivo](../6%20%C2%B7%20Las%20mediciones/Re%C3%BAso%20efectivo.md)** — % de reúso efectivo
- **[Cumplimiento de norma de descarga](../6%20%C2%B7%20Las%20mediciones/Cumplimiento%20de%20norma%20de%20descarga.md)** — Cumplimiento de la norma de descarga; carga removida

Estas mediciones no tienen una línea base incorporada al diagnóstico original. Su disponibilidad pública requiere una búsqueda documentada. → [Las mediciones](../6%20%C2%B7%20Las%20mediciones/Las%20mediciones.md)

---

## Quién lo causa y quién debería resolverlo

**Lo causa:** [SIAPA](../4%20%C2%B7%20Los%20actores/SIAPA.md) *(Organismo operador)*
**Debería resolverlo:** [SANE](../4%20%C2%B7%20Los%20actores/SANE.md) *(Saneamiento)*

Quien causa el daño **no es quien debe repararlo**. Ahí es donde la responsabilidad se pierde. → [Quién causa y quién debe resolver](../7%20%C2%B7%20El%20m%C3%A9todo/Qui%C3%A9n%20causa%20y%20qui%C3%A9n%20debe%20resolver.md)

**Naturaleza:** Omisión — no se hace lo debido.
**Ámbito de atribución:** SIAPA

---

## Dónde se conecta

**Este árbol depende de:**

- [E8 · La fiscalización invertida](./E8%20%C2%B7%20La%20fiscalizaci%C3%B3n%20invertida.md) — da por supuesto que ahí funciona lo que aquí hace falta

**Y sostiene a:**

- [E1 · La calidad del agua](./E1%20%C2%B7%20La%20calidad%20del%20agua.md) — lo da por supuesto

**Puntos de contacto:**

- [E6 · El mercado negro](./E6%20%C2%B7%20El%20mercado%20negro.md) — por [E5.2](../3%20%C2%B7%20Las%20fichas/E5.2.md), [E6.4](../3%20%C2%B7%20Las%20fichas/E6.4.md)
- [E4 · Las inundaciones](./E4%20%C2%B7%20Las%20inundaciones.md) — por [E5.4](../3%20%C2%B7%20Las%20fichas/E5.4.md), [E5.5](../3%20%C2%B7%20Las%20fichas/E5.5.md), [E4.1](../3%20%C2%B7%20Las%20fichas/E4.1.md), [E4.5](../3%20%C2%B7%20Las%20fichas/E4.5.md)
- [E1 · La calidad del agua](./E1%20%C2%B7%20La%20calidad%20del%20agua.md) — por [E1.4](../3%20%C2%B7%20Las%20fichas/E1.4.md)


---

## Ficha

| | |
|---|---|
| Capa dominante | Macroprocesos *(secundaria: Ciclo hidrosocial)* |
| Macroproceso | Saneamiento |
| Actores implicados | Organismo operador |
| Fuerza de presión | Tiempo y obsolescencia |
| Lente de análisis | Ambiental |
| Causas directas | 5 |
| Mapa | [Ver el mapa](../8%20%C2%B7%20Mapas/E5%20%C2%B7%20La%20carga%20a%20la%20cuenca%20%C2%B7%20mapa.canvas) |
