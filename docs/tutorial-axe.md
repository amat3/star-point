# Cómo funciona axe, con starpoint

Tutorial práctico sobre `axe-core`, la librería con la que starpoint comprueba su accesibilidad. Los números salen de ejecuciones reales del 16 de octubre de 2026 (`axe-core` 4.13.0): una página rota a propósito y la demo desplegada.

## 1. La idea en una frase

`axe` es una librería de JavaScript que **se inyecta en la página, lee el DOM y los estilos ya calculados, y aplica reglas deterministas** sacadas de WCAG y ARIA. No usa IA ni adivina: cada regla es un algoritmo, y por eso el mismo HTML da siempre el mismo resultado.

## 2. Las tres capas que hay en el repositorio

| Capa | Qué es | Dónde |
|---|---|---|
| **Motor** | `axe-core`, las 105 reglas | dependencia |
| **Puente** | `@axe-core/playwright` (`AxeBuilder`): inyecta el motor en la página, llama a `axe.run` y devuelve el JSON | [helpers.ts:44](../e2e/helpers.ts#L44) |
| **Propia** | `expectNoA11yViolations`: convierte los problemas en líneas legibles y falla si hay alguno | [helpers.ts:43-52](../e2e/helpers.ts#L43-L52) |

[a11y.spec.ts](../e2e/a11y.spec.ts) solo decide **qué pantallas** y **en qué tema** se comprueban. `test.use({ colorScheme })` ([línea 8](../e2e/a11y.spec.ts#L8)) hace que Chrome pida el tema claro o el oscuro, y por eso los dos modos salen de la misma lista.

## 3. Qué reglas ejecuta

Las 105 reglas llevan etiquetas. Con `.withTags([...])` ([línea 45](../e2e/helpers.ts#L45)) se eligen cuáles:

- `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`: lo que WCAG **exige**. Es lo que usa starpoint.
- `best-practice` (30 reglas): buenas prácticas que WCAG no exige.
- `experimental` (7): reglas en pruebas.

## 4. La anatomía del resultado

`analyze()` devuelve cuatro cubos, y cada regla acaba en **uno solo**:

| Cubo | Qué significa | Página rota | Portada de starpoint (oscuro) |
|---|---|---|---|
| `violations` | La regla se aplica y falla | 9 | **0** |
| `passes` | Se aplica y cumple | 12 | 19 |
| `incomplete` | Axe **no pudo decidir**: hay que revisarlo a mano | 0 | 0 |
| `inapplicable` | No hay nada a lo que aplicarla | 72 | 44 |

Dos ideas importantes:

- **"0 violations" no significa "perfecto".** Significa que, de lo que axe pudo decidir, nada falla. Por eso mirar `incomplete` también es parte del trabajo.
- **`inapplicable` es normal.** Una página sin tablas no tiene nada que decir de las reglas de tablas.

## 5. Leer una violación

En la página rota, cada fallo trae el nombre de la regla, su gravedad (`critical`, `serious`, `moderate`, `minor`) y los criterios WCAG a los que corresponde:

```
button-name    [critical] wcag412  → <button></button>
image-alt      [critical] wcag111  → <img src="x.png">
label          [critical] wcag412  → <input type="text">
color-contrast [serious]  wcag143  → <p style="color:#aaa;background:#fff">
```

`wcag143` se lee "criterio 1.4.3", el contraste mínimo. `heading-order`, `region` y `landmark-one-main` son `best-practice`, no exigidas.

## 6. El caso del contraste, con los números de starpoint

Fue casi todo lo que se encontró, y es un algoritmo que se puede hacer a mano:

1. Cada canal RGB se pasa a lineal: `v/255`, y luego `((v+0.055)/1.055)^2.4`.
2. **Luminancia** = `0,2126·R + 0,7152·G + 0,0722·B`. El texto `#7c8780` da 0,2317 y el fondo `#fbfaf6` da 0,9553.
3. **Ratio** = `(L_claro + 0,05) / (L_oscuro + 0,05)` = 1,0053 / 0,2817 = **3,57**. Axe informa 3,56 porque trunca en vez de redondear.
4. Umbral: **4,5** para texto normal y **3** para texto grande (18,66 px en negrita o 24 px).

Con `#626b66` el ratio sube a **5,27**, y de ahí viene el cambio de `muted` en [theme.ts](../src/theme.ts).

Axe también resuelve el **fondo real** recorriendo los elementos padre y mezclando transparencias. Eso explica dos cosas que aparecieron:

- El texto con `opacity: 0.6` sobre la tarjeta falló porque su color efectivo es una mezcla con el fondo de la tarjeta, no el color que se escribió.
- En el tema oscuro, `forest` no se podía arreglar con un solo valor: como texto sobre fondo oscuro necesitaba ser **más claro**, y como fondo de las iniciales beis, **más oscuro**. Dos exigencias contrarias en el mismo token son la señal de que hay que separar tokens, y de ahí salieron `forestText`, `dangerText` y `onCoral`.

## 7. El método que se siguió

1. **Escanear** y agrupar por pareja de colores (`fg on bg`), no por elemento: unos 250 elementos se redujeron a unas 12 causas.
2. **Rastrear** cada pareja hasta su token o componente.
3. **Corregir** el token, no cada sitio.
4. **Volver a escanear.** 250 → 1 → 0.
5. **Convertirlo en test**, y comprobar que falla si se rompe: con el valor antiguo de `muted` el test lo detecta y dice "3.56".

## 8. Lo que axe no ve

La comprobación automática cubre una parte de WCAG, no todo, y la proporción depende de cómo se mida. En starpoint, además:

- **Estados que no se visitan:** diálogos, el menú del avatar, avisos de error y los *toast*. Solo se escanea cada página en su estado inicial.
- **Teclado:** si se puede llegar a todo con Tab y si el foco se ve. Axe solo comprueba algunas cosas sueltas.
- **Lector de pantalla:** si lo que se anuncia tiene sentido. Axe valida que existe un nombre accesible, no que sea bueno.
- **Un hallazgo real:** con las reglas `best-practice`, la portada tiene **3 elementos** y el login **1** fuera de un *landmark* (regla `region`). Probablemente la cabecera es un `div` en lugar de un `<header>`. No incumple WCAG, pero es una mejora fácil.

## 9. Ejercicios, de menos a más

1. **Romper algo a propósito:** quitar el `aria-label` del botón del micrófono en [MatchAssistant.tsx](../src/components/events/MatchAssistant.tsx) y ejecutar `npx playwright test e2e/a11y.spec.ts`. Debería saltar `button-name` en `/partido`.
2. **Escanear solo un diálogo:** abrir uno y usar `new AxeBuilder({ page }).include('[role="dialog"]')`.
3. **Arreglar el `region`:** cambiar la cabecera a `<header>`, añadir `best-practice` al helper y comprobar que baja a 0.
4. **Probar el teclado** con Playwright: pulsar `Tab` varias veces y comprobar el orden con `page.locator(':focus')`. Es justo lo que axe no hace.

## En resumen

Axe se usa como **guardia de regresión**: escanea las pantallas principales en claro y oscuro y falla si el contraste baja de 4,5:1. Corrige lo que una máquina puede decidir; el teclado y el lector de pantalla necesitan además revisión manual.
