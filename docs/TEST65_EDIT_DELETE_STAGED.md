# TEST65 — EDIT / DELETE de playlists comunitarias (publicado en GitHub, backend pendiente)

**Checkpoint estable anterior:** [TEST64 PASS](CHECKPOINT_TEST64_PASS_2026-11-08.md). No modificar datos de producción sin completar actualización del Worker.

## Solicitud implementada

- Las playlists públicas v2 que viven en Cloudflare D1 muestran botones pequeños **LOAD | EDIT | DELETE** en cada fila del catálogo COMMUNITY PLAYLISTS.
- EDIT abre un diálogo con **Playlist name**, **Playlist by** y **BETA KEY**; botón **AUTHORIZE**.
- DELETE abre el diálogo de clave **BETA KEY / AUTHORIZE**, seguido por confirmación explícita del borrado completo.
- La clave se recibe por cuadro de contraseña pero **nunca se incrusta en el código GitHub** ni se guarda en localStorage.
- Las tres listas históricas estáticas de GitHub no exhiben EDIT/DELETE. Los TOP 100 rankeados tampoco.
- En navegador se comprueba que `GET /capabilities` contenga `editMode:"metadata-and-delete"` antes de permitir PATCH/DELETE. Si aún corre TEST64 en Cloudflare, se evita toda modificación y aparece advertencia.
- Se conservan botones × por canción y SAVE para eliminaciones, publicación con clave, audio, temas, UI y controles anteriores.

## Backend nuevo (por desplegar manualmente)

- `PATCH /playlists/{uuid}`: autenticación con header `X-Beta-Key` y Cloudflare secret `BETA_EDIT_KEY`; cambia `name` y `createdBy` en el JSON `payload` y las columnas `title`/`creator`. No cambia canciones ni identificador.
- `DELETE /playlists/{uuid}`: autenticación idéntica y `DELETE` físico de la fila D1; **irreversible si no existe backup**. No elimina ni modifica archivos SID o ZIP.
- `OPTIONS` permite `PATCH` y `DELETE`.
- `GET /capabilities` indica `editMode:"metadata-and-delete"`.
- No hay cambios en el esquema D1.

### Pasos de activación

1. Respaldar D1 antes de habilitar DELETE, y conservar el Worker TEST64 activo como punto de restauración.
2. Cloudflare → Workers & Pages → `ricos-sid-community` → **Edit code**.
3. Copiar **todo** el archivo actualizado de GitHub `community/api/worker.js` y reemplazar Worker anterior. Pulsar **Deploy**.
4. No tocar secret `BETA_EDIT_KEY` (ya está en Production), ni D1 binding `DB`.
5. Abrir `https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities`; verificar `editMode:"metadata-and-delete"`, `configured:true`.
6. Probar EDIT en playlist pública de prueba; nombre/autor corregidos y visibles tras recargar en otro navegador.
7. Probar DELETE únicamente en una playlist desechable de prueba; confirmar desaparece del catálogo y GET ID retorna 404.
8. Confirmar rechazo de clave errónea y protección de las tres estáticas y los rankings; solo entonces declarar **TEST65 PASS**.

**Atención:** para la beta con clave compartida, todo betatester que conozca la clave puede editar o eliminar **cualquier** playlist v2 de D1. No hay propietarios autenticados. Recomendable crear mecanismos de backup, restauración y moderación antes de abrir al público.
