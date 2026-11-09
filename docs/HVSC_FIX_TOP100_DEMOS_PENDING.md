# HVSC FIX — TOP 100 DEMOS (CSDb)

**Fecha de la captura:** 9 de noviembre de 2026. **Origen:** [Top C64 Demo](https://csdb.dk/toplist.php?subtype=%281%29&type=release). El ranking varía con los votos; esta lista guarda las 100 primeras entradas en el orden observado, incluso cuando CSDb tiene empates de posición.

## Estado actual

- **100 demos** guardadas en el índice fuente `library/hvsc-fix/top-100-demos-sources.json`.
- **29 demos revisadas** con **142 referencias SID verificadas** contra HVSC #85 (135 SID distintos; algunas canciones se usan en más de una demo).
- **71 demos pendientes de revisar**. **No significa que sus SID falten en HVSC**: todavía no se extrajeron/comprobaron sus rutas desde CSDb.
- **0 rutas SID concretas sin coincidencia** entre las 142 revisadas.
- La playlist pública `community/playlists/csdb-top-100-demos.json` reproduce las referencias válidas y mantiene el orden por demo.
- El registro de trabajo para asociar manualmente pistas en el futuro es `library/hvsc-fix/top-100-demos-pending.json`, con identificadores estables y campos `resolvedPack` y `resolvedFile` inicialmente nulos.

## Demos pendientes en HVSC FIX

| Orden Top 100 | Demo | Pendiente |
|---:|---|---|
| 3 | [Viva Las Vegas](https://csdb.dk/release/?id=264488) | Revisar los SID de la demo |
| 24 | CatYa Dancing Queen | Revisar los SID de la demo |
| 28 | Meet Crest | Revisar los SID de la demo |
| 29 | The X-File | Revisar los SID de la demo |
| 30 | Tribute to Gabi | Revisar los SID de la demo |
| 31 | Eyes | Revisar los SID de la demo |
| 32 | Nightfall 100% | Revisar los SID de la demo |
| 33 | Lifecycle | Revisar los SID de la demo |
| 34 | What Is The Matrix 2 | Revisar los SID de la demo |
| 35 | The Trip | Revisar los SID de la demo |
| 36 | Lunatico | Revisar los SID de la demo |
| 37 | Skybox | Revisar los SID de la demo |
| 38 | The Demo Coder | Revisar los SID de la demo |
| 39 | Aliens in Wonderland | Revisar los SID de la demo |
| 40 | Still Rising | Revisar los SID de la demo |
| 41 | Rest In Peace HIC | Revisar los SID de la demo |
| 42 | A Fayre Glow | Revisar los SID de la demo |
| 43 | Fitty | Revisar los SID de la demo |
| 44 | Halloweed 4 - Blow Your Mind | Revisar los SID de la demo |
| 45 | Signal Carnival | Revisar los SID de la demo |
| 47 | Wonderland XII | Revisar los SID de la demo |
| 48 | Nightworks | Revisar los SID de la demo |
| 50 | Incoherent Nightmare | Revisar los SID de la demo |
| 51 | Ad Astra per Alas Porci | Revisar los SID de la demo |
| 52 | Gorba Boost | Revisar los SID de la demo |
| 53 | All Hallows' Eve | Revisar los SID de la demo |
| 54 | Norsk Data | Revisar los SID de la demo |
| 55 | The 21st | Revisar los SID de la demo |
| 56 | Unity | Revisar los SID de la demo |
| 57 | Stereo Re-Issue | Revisar los SID de la demo |
| 58 | Still Standing | Revisar los SID de la demo |
| 59 | 2600 | Revisar los SID de la demo |
| 60 | Cocktail To Go | Revisar los SID de la demo |
| 61 | The Star Wars Demo | Revisar los SID de la demo |
| 62 | JustinBlue | Revisar los SID de la demo |
| 63 | Do Pretzels Dream? | Revisar los SID de la demo |
| 64 | Crimbo 1982 | Revisar los SID de la demo |
| 65 | Halloweed 3 - VIC or Weed | Revisar los SID de la demo |
| 66 | Kamishibai | Revisar los SID de la demo |
| 68 | Oldschool Guide | Revisar los SID de la demo |
| 69 | Dual Crew 40 Years | Revisar los SID de la demo |
| 70 | A három nyúl | Revisar los SID de la demo |
| 71 | Purple | Revisar los SID de la demo |
| 72 | Multiverse 100% | Revisar los SID de la demo |
| 73 | Virsi 64 | Revisar los SID de la demo |
| 74 | Cinque | Revisar los SID de la demo |
| 75 | Lethal Display 6 | Revisar los SID de la demo |
| 76 | Sidelined 2 | Revisar los SID de la demo |
| 77 | Tuomiopaeivae | Revisar los SID de la demo |
| 78 | Wonderland XIII | Revisar los SID de la demo |
| 79 | Fünfzig 90% | Revisar los SID de la demo |
| 80 | Harminc | Revisar los SID de la demo |
| 81 | Christmas Megademo | Revisar los SID de la demo |
| 82 | Ooops | Revisar los SID de la demo |
| 83 | Space Beer | Revisar los SID de la demo |
| 84 | Zone 5 | Revisar los SID de la demo |
| 85 | Trapped Love | Revisar los SID de la demo |
| 86 | F20 | Revisar los SID de la demo |
| 87 | Neon | Revisar los SID de la demo |
| 88 | The Shores of Reflection | Revisar los SID de la demo |
| 89 | Submerged | Revisar los SID de la demo |
| 90 | Fantasmolytic | Revisar los SID de la demo |
| 91 | Sweet | Revisar los SID de la demo |
| 92 | 50 Years of Flex | Revisar los SID de la demo |
| 93 | Deus Ex Machina | Revisar los SID de la demo |
| 94 | Wizard of Wor Sprite Comparison Demo | Revisar los SID de la demo |
| 95 | Wavemode | Revisar los SID de la demo |
| 96 | Battle Scars | Revisar los SID de la demo |
| 97 | Xcusemo | Revisar los SID de la demo |
| 98 | Delirious 11 | Revisar los SID de la demo |
| 100 | We Love to Party | Revisar los SID de la demo |

## Cómo completar en el futuro

Buscar los SID de cada demo en la ficha de CSDb. Si hay una ruta `/MUSICIANS/...` o `/DEMOS/...`, comprobarla contra `library/data/*.json`. Si no existe en el índice local, mantener el registro `unresolved_sid_path` con la ruta original y **no inventar un archivo**. Cuando encontremos manualmente la correspondencia, se completarán `resolvedPack` y `resolvedFile` y recién entonces se añadirá a la playlist. Este documento es un inventario de trabajo, no una promesa de que las 100 demos tengan todos sus SID incorporados.

**Interfaz:** se utilizó COMMUNITY PLAYLISTS tal como estaba; sin botones ni ventanas nuevos.
