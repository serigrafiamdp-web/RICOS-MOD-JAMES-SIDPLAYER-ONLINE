# TEST211 — Mujer Amante: comprobar cuelgue del bajo / canal 1

**Fecha:** 2026-11-12. **Estado:** código desplegado; diagnóstico pendiente de prueba auditiva del usuario.

## Fuente y síntoma
SID original HVSC #85 `library/packs/musicians/U/Uctumi.zip` → `Mujer_Amante.sid` (8003 bytes, CRC32 D69AF18D). Encabezado PSID v2, PAL, MOS8580, 1 subtune; init $1000; play $1003. Archivo contiene firma de SID-Wizard (no asumir Cheesecutter). Duración HVSC: 329 segundos (5:29).

El usuario confirmó, contrastando con otra reproducción, que **no hay una nota sostenida intencional**: el bajo/canal 1 se cuelga desde 2:25 hasta 2:00 del TIMER regresivo (aprox. 3:04–3:29 de reproducción real), y posteriormente retorna.

## Comprobaciones previas
- TEST208: el primer golpe del SID mejoró en transiciones. No relacionado con el cuelgue de 25 segundos a mitad del tema.
- TEST209: ruta exacta de Mujer Amante al backend reSIDfp MOS8580. Sigue reportándose el cuelgue.
- TEST210: diagnóstico de backend/underruns/estado de voz mediante `RicoLftMode.mujerStatus()`, sin cambiar audio.
- **Todavía no conocemos la causa**. No afirmar que la melodía tiene una nota de bajo mantenida, ni que reSIDfp causa necesariamente el problema sin registrar los valores del motor.

## TEST211 — prueba A/B específica
Versión **normal**: `https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=211`

Variante **filtro desactivado solo para Mujer Amante**: `https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=211&mujerfilter=off`

La condición usa la referencia HVSC Uctumi y el estado `activeMujer`: no altera `Loco_un_Poco.sid`, Linus/LFT ni otras canciones. No altera muestras, patterns, datos SID ni ganancia de volumen. En condiciones normales no se altera la ruta ni el ajuste del filtro.

## Telemetría
`RicoLftMode.mujerStatus()` confirma el motor, el volumen independiente, los underruns, la cantidad de bloques de audio procesados y valores actuales de la voz 1.

`RicoLftMode.mujerTrace()` devuelve un registro por segundo aproximadamente entre 2:55 y 3:35 transcurridos, incluyendo la zona problemática. Lee los 25 registros del chip y registra los pertinentes:
- Voz 1: frecuencia, control, TEST, GATE, ataque/decay y sustain/release.
- Filtro: ruteo de voz 1, cutoff, resonancia, modo, volumen maestro.
- Underruns (bloques de audio ausentes).

## Interpretación
- Si el bajo sigue funcionando solo con filtro OFF, investigar mezcla/ruteo/cutoff del MOS8580 y eventos de SID-Wizard en 3:04–3:29.
- Si se cuelga con filtro ON y OFF, comparar controles GATE/TEST/frecuencia y estado de la envolvente, underruns y los registros del chip para descartar efecto de filtro.
- Si `usingReSIDfp` es falso, verificar coincidencia de referencia y fuente de la lista antes de concluir sobre el motor WASM.
- No aplicar cambios generales de síntesis ni modificar el archivo fuente sin confirmar la causa.

## Estado de publicación
Código de TEST211 en `lft-test/lft-mode.experimental.js` y caché en `index.html`. Workflow GitHub Pages 43252895838: SUCCESS. Falta PASS auditivo y comparación de dos variantes.

## Restricciones
Preservar TEST205/208 transición, TEST206 TIMER, fade-out 5 segundos, detector de silencios desactivado, y ajustes originales de Loco un Poco (MOS8580 + salida 2.6×). No introducir controles nuevos.
