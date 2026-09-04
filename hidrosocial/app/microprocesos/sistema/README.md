# sistema

**Frontera.** Las diez causas estructurales vistas como una red: quién depende
de quién, qué sostiene a qué, y qué pasa si se corrige una sin corregir aquello
de lo que depende.

**Propósito único.** Agregaciones puras sobre `VaultGraph` que responden a la
tesis del diagnóstico: *mientras la raíz persista, ninguna corrección se
sostiene*. Todo sale del frontmatter (`depende_de`, `sostiene_a`, `contacto`,
`genera`, `debe_resolver`) — nada está codificado a mano.

**Lo que NO hace.** No toca `fs`, no cachea, no escribe, no conoce React, no
renderiza. No inventa relaciones que el vault no declare.

**Contrato público.**

```ts
construirRed(g: VaultGraph): RedSistema
simular(red: RedSistema, seleccion: Iterable<ArbolId>): ResultadoSimulacion
ordenRecomendado(red: RedSistema, objetivo: ArbolId): ArbolId[]
incidenciaActores(g: VaultGraph, red: RedSistema): IncidenciaActor[]
actoresSinIncidencia(g: VaultGraph, red: RedSistema): string[]
ordenArbol(a: ArbolId, b: ArbolId): number
```

**Definiciones.**

- `dependeDe` — supuestos que el árbol declara. Si no se cumplen, su corrección
  se deshace.
- `requiere` — cierre transitivo de `dependeDe`, sin incluirse a sí mismo.
  Tolera ciclos (marca visitados).
- `saldo` — `entra − sale`. Positivo: el resto del sistema se apoya en él.
- `esRaiz` — no depende de nadie y otros dependen de él.
- **sostenible** — resuelto y con todo su `requiere` también resuelto.

**Razón de cambio.** Que cambie el modelo de relaciones entre árboles del vault
(nuevos tipos de vínculo, o una regla distinta de sostenibilidad).
