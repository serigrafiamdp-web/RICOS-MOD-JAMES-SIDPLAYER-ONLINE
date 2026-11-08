# Arquitectura de reproducción, transiciones y AUTO — TEST102

**Fecha:** 2026-11-08  
**Código vigente:** `js/customPlaylist.test101.js` + `js/sidPlayer.js` + `js/backend_tinysid.js`; estilos/UI TEST102.  
**Base auditiva:** TEST100 PASS. **AUTO silencios:** TEST101 probado positivamente por el propietario, pendiente de ampliar muestras.

## A. Recorrido del sonido

```text
SID binario (PSID / RSID)
  → backend_tinysid.js (emulación / render de audio)
  → sidPlayer.js: ScriptProcessorNode.onaudioprocess (4096 muestras)
  → wrapper de customPlaylist.test101.js: análisis de señal SIN fade
  → GainNode (solo volumen de salida y transiciones)
  → AudioContext.destination (parlantes)
```

**No hay dos motores SID**. La playlist cambia el SID cargado en un emulador; no mezcla dos archivos simultáneamente. Por eso el comportamiento es un fade-out + sustitución + nueva canción al volumen original, **no** un crossfade de dos decks.

## B. Máquina de estados de la transición

Estados y variables principales:
- `player.sidListIndex`: índice del SID que está reproduciéndose.
- `selectedLiveIndex`: fila elegida manualmente, independiente del índice PLAY.
- `queuedLiveIndex`: SID que se cargará al finalizar el fade.
- `transitionBusy`: transición pendiente; bloquea múltiples timers y detectores.
- `transitionAwaitingStart`: esperando comienzo del SID entrante (puede ser asincrónico por XHR).
- `transitionTimer`: final del fade; `transitionRecovery`: respaldo de carga.
- `pendingNewSidUnmute`: el SID ya inició, pero la restauración de ganancia espera el **primer búfer del SID nuevo**.
- `fadeGainNode`: GainNode entre ScriptProcessor y destino.

Proceso (clic manual, NEXT o AUTO):
1. `requestSidSwitch(index, source)` comprueba índices y, si ya hay una transición, modifica la cola sin duplicar desvanecimientos. Selección de la canción actual puede cancelar la transición.
2. Si el SID actual reproduce, programa un fade-out de **5000 ms**, ganancia de **1 → 0.005**. Una canción detenida puede cambiar de inmediato.
3. Al finalizar se invoca `performSidSwitch` y `loadCustomIndex` o `loadSID`; `loadSIDData` inicializa el nuevo SID, manteniendo el GainNode al mínimo.
4. `player.playSong` **NO** debe restablecer inmediatamente el volumen: marca `pendingNewSidUnmute`.
5. El wrapper de `onaudioprocess` observa el primer búfer nuevo y agenda `gain.setValueAtTime(1,event.playbackTime)`. Así el audio del SID viejo que aún estaba en la cola del dispositivo no reaparece al 100 %.
6. No hay delay de silencio ni fade-in programados. El nuevo SID entra a volumen completo en el instante de su primer búfer audible.
7. Ante timeout/error/cancelación, limpiar timers, bandera de unmute y restaurar ganancia con prudencia.

### Curva (TEST99/100)

```js
const fadeOutMs = 5000;
const floor = 0.005; // 0.5 % de ganancia
const t = i / (points - 1);
curve[i] = floor + (currentGain - floor) * Math.cos(t * Math.PI / 2);
gain.setValueCurveAtTime(curve, currentTime + 0.001, 4.999);
```

Aproximación de ganancia a lo largo del fade: 0 s=100 %; 1.25 s≈92 %; 2.5 s≈71 %; 3.75 s≈39 %; 5 s=0.5 %. **Porcentaje de ganancia** no es percepción de volumen ni potencia sonora.

### Bug ya resuelto — no reintroducir

TEST99 restablecía el volumen en `playSong`. Por el procesamiento adelantado de `ScriptProcessorNode`, ese momento ocurría **antes** de que todo el búfer de audio del SID anterior llegara al parlante. Se escuchaba un breve pico del SID saliente al final del fade. TEST100 cambió la restauración a `event.playbackTime` del primer búfer nuevo y el propietario confirmó **PASS**.

## C. TIMER de la Playlist

Control en la ventana actual:
- `index.html` → `#ricoLiveTimer`, en la línea de `#ricoRemixBar`.
- Entrada: MM:SS, inicial **03:00**. Se edita directamente y se valida al cambiar/perder foco o presionar Enter.
- JS: `parseAutoTime`, `formatAutoTime`, `updateAutoTime`, `player.autoFallbackSeconds`.
- El valor se sincroniza con el control legado `#ricoFallback` y sus botones ±10 s.
- Intervalo admitido: 5 a 3600 segundos; entradas inválidas restauran el valor válido previo.
- El tiempo máximo no depende de una base de datos de duraciones: `player.getAutoDurationSeconds()` se sobreescribe para utilizar la configuración manual.
- El **fade empieza 5 s antes** del tiempo ajustado, para que la nueva canción entre aproximadamente al alcanzar ese límite. `03:00` → fade alrededor de `02:55`, nuevo SID alrededor de `03:00`.
- `AUTO: OFF` inhabilita el avance programado y la detección de silencio.

**Observación:** Esta configuración es de sesión; no se ha documentado persistencia entre reinicios de navegador. No prometerla.

## D. Detector de silencio de AUDIO ORIGINAL

Variables en `customPlaylist.test101.js`:

| Parámetro | Valor |
|---|---|
| `SILENCE_MIN_PLAY_SECONDS` | **12 s** de reproducción antes de evaluar silencios |
| `SILENCE_HOLD_SECONDS` | **2.5 s** continuos de nivel bajo |
| `SILENCE_RMS_THRESHOLD` | **0.0025** amplitud normalizada RMS |
| `SILENCE_PEAK_THRESHOLD` | **0.012** amplitud de pico |
| Muestreo | Tomar una de cada ocho muestras para medir RMS/pico del búfer |
| Avance | `scheduleSilenceAdvance` programa `player.nextSid()` como microtarea |

El análisis corre inmediatamente después de que se llenó `event.outputBuffer`, y **antes del GainNode** que atenúa la salida. Esto evita un falso positivo causado por el fade-out automático.

Condiciones de funcionamiento:
- La reproducción estaba activa al inicio del callback, AUTO ON, sin carga ni transición activa.
- Existe una lista de al menos 2 SID y un índice válido; no cambiar el archivo local sin lista.
- Se respetan los 12 s iniciales para evitar un salto por una introducción con silencio.
- Si el sonido supera cualquiera de los umbrales, se reinicia el acumulador de silencio.
- La ausencia de muestras por fin del motor se considera final de canción.
- Un flag evita programar varias microtareas NEXT por un mismo período de silencio.

**Detalle del avance:** si detecta audio silencioso mientras el SID aún se considera `isPlaying`, inicia la misma transición de 5 s de TEST100; no se salta abruptamente el fade por defecto. El detector no proporciona metadatos ni conoce si la música fue compuesta con pausas intencionales. Es un detector heurístico.

### Implicación práctica

El propietario descubrió que un TIMER algo más largo, combinado con el detector de silencio, reduce la necesidad de mantener una tabla de duraciones. Esta aproximación puede cubrir muchos SIDs: los que se quedan callados avanzan por silencio, los que no callan avanzan por tiempo máximo. **No garantiza** precisión musical exacta ni evita falsos silencios en todos los archivos; los umbrales deben ser ajustables en futuros tests si hay problemas.

## E. Estados visibles

- PLAY: fila invertida que indica el índice real `player.sidListIndex`.
- SELECT/NEXT: fila seleccionada; durante el fade, NEXT queda en cola.
- NEXT/AUTO actualiza la lista sin desplazar el scroll violentamente.
- Rankings históricos permanecen inmutables en orden y sin borrado.
- REMIX conserva las operaciones + y ordenado local.
- UI TEST102: título + atribución en un encabezado; TIMER junto a REMIX; **no mostrar SILENCE DETECT**, aunque la detección está activa.

## F. Pruebas realizadas y pruebas pendientes

**Lógica simulada comprobada durante TEST101**:
- ≈1.7 s de silencio → sin avance.
- ≈2.47 s de silencio → sin avance.
- ≈2.56 s de silencio continuo → 1 avance.
- Música intercalada entre pausas → sin avance.
- AUTO OFF → sin avance.
- Motor SID finalizado → 1 avance.

**Auditivo:** TEST100 fue aprobado por el propietario tras corregir el salto de volumen.  
**UI:** TEST102 recibió PASS visual del propietario.  
**Silencio:** resultado positivo informado, sin batería formal sobre todos los formatos.

**Regresión recomendada por próximo cambio**:
1. Reproducir SID largo → seleccionar otro; escuchar 5 s y transición sin pico al final.
2. Interrumpir/reseleccionar durante el fade; comprobar que solo hay un cambio.
3. AUTO ON con TIMER 00:30 → cambio cerca de 30 s incluyendo fade.
4. AUTO ON con SID que calla a los 20 s → detector espera silencio continuo y avanza; con música intermitente no salta.
5. AUTO OFF → no cambia por silencio ni por duración.
6. Pulsar STOP durante un fade → no inicia otra canción fuera de contexto.
7. Comprobar Remix, rankings, scroll, skins/paletas y controles de volumen.
8. Testear SID que produce silencios intencionales >2.5 s o audio muy bajo; revisar umbrales antes de declarar un nuevo PASS.
9. Probar pestaña inactiva: el render de audio impulsa el AUTO, no `requestAnimationFrame`.

## G. No hacer

- No modificar el motor SID original por tareas de interfaz; los cambios de audio están encapsulados en el controlador JS versionado.
- No volver a llamar `restoreFullVolume()` directamente desde `playSong` en una transición.
- No analizar sonido después del GainNode como si fuera silencio real del SID.
- No mezclar subida del nuevo SID con el audio viejo usando un solo emulador (haría falta doble deck).
- No alterar claves beta, Cloudflare Worker ni publicaciones por cambios del TIMER local.

## H. Recuperación exacta

- Código JS estable de AUTO y transición: `js/customPlaylist.test101.js`.
- UI/CSS aprobado: `index.html` y `css/style.css` con `?v=test102compact`.
- Consultar [CHECKPOINT_TEST102_PASS_2026-11-08.md](CHECKPOINT_TEST102_PASS_2026-11-08.md) para el resumen integral, servicios remotos y pendientes.
