# TEST63 — Beta editing / publication (STAGED, NOT PASS)

**Base preservada:** [TEST62 PASS](CHECKPOINT_TEST62_PASS_2026-11-08.md).  
**Arquitectura:** [ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md](ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md).

## Reglas aprobadas

1. Cualquier visitante puede **reproducir** cualquier playlist.
2. Cualquier visitante puede **quitar canciones de su copia temporal** en la ventana flotante, sin clave; recargar restaura la versión pública.
3. **Publicar una nueva playlist permanente** en D1 requiere la clave beta.
4. **SAVE CHANGES** en una playlist pública D1 requiere clave beta y permite **solo quitar canciones**, sin agregar/reordenar, renombrar ni cambiar el creador.
5. No eliminar playlists completas desde el reproductor.
6. Las tres listas curadas de GitHub (formato v1) permiten quitar canciones temporalmente, **no sobrescribir sus archivos estáticos** con la clave beta.
7. No hay login ni propiedad individual. **Cualquiera con la clave puede editar cualquier playlist D1**, que es exactamente el alcance experimental de esta beta.
8. La clave no se registra en archivos, HTML, documentación ni base de datos. Debe configurarse en Cloudflare como secret `BETA_EDIT_KEY`.

## Código preparado en GitHub

- `community/api/worker.js`: `GET /capabilities`, `POST /playlists` exige `X-Beta-Key`, `PUT /playlists/{uuid}` exige `X-Beta-Key` y valida eliminaciones solamente; usa tablas existentes `playlists` y `submissions` de TEST62.
- `js/customPlaylist.js`: botón × por canción de la playlist flotante, `SAVE CHANGES` para v2 pública, diálogo de clave beta al publicar.
- `css/style.css`: estilos compactos de botones.
- Ninguna modificación a la emulación SID o al esquema SQL D1.
- La capa del navegador comprueba `GET /capabilities` y **bloquea escrituras** si la nueva versión de Cloudflare todavía no está desplegada y configurada, para evitar publicar con un backend viejo desprotegido.
- No incrustar jamás la clave de los testers en GitHub ni en JS.

## ACTIVACIÓN MANUAL PENDIENTE EN CLOUDFLARE

**Muy importante:** editar el Worker en GitHub **no actualiza automáticamente** el Worker ya desplegado desde Cloudflare. Hasta ejecutar estos pasos **TEST63 NO está activo**.

1. Ir a Cloudflare → Compute → Workers & Pages → Worker `ricos-sid-community`.
2. Entrar en **Settings → Variables and Secrets → Add**, crear **Secret** con nombre exacto `BETA_EDIT_KEY`. Pegar **en Cloudflare** la clave elegida por el propietario, no en el repo. Guardar y desplegar si lo pide.
3. Ir a **Edit code**, reemplazar el código actual por la versión **`community/api/worker.js`** de GitHub y pulsar **Deploy**. Antes, conservar copia de la versión WORKER TEST62 desplegada por si hay que revertir.
4. Abrir `https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities`, verificar que responde: `{"format":"ricos-community-capabilities","version":1,"betaKeyRequired":true,"editMode":"remove-only","configured":true}`. No incluye el valor del secret.
5. En GitHub Pages, crear una playlist de prueba usando clave: debe publicarse para todos. Sin clave o con clave errónea: **403**, ninguna escritura D1.
6. Reproducir lista pública y quitar una canción: no cambiar D1 todavía; recargar restaura.
7. Quitar canción, pulsar SAVE CHANGES, ingresar la clave: PUT debe devolver éxito y otro navegador debe ver el cambio.
8. Verificar que la lista original GitHub no se puede modificar permanentemente, que no se cambian nombre/autor y que AUTO/reproducción siguen operativos.
9. Solo tras verificar esos pasos anotar **TEST63 PASS**.

### Otros detalles

- **No hay que añadir tablas D1 nuevas** para este modelo de clave compartida. El código antiguo de claves por usuario *nunca se desplegó*; no intentar crear `playlist_edit_keys`.
- Para rotar la clave, modificar `BETA_EDIT_KEY` en Cloudflare sin tocar GitHub.
- Evitar guardar la clave en almacenamiento local o añadirla a la URL.
- Las comprobaciones de formato, límite de 5 publicaciones/hora por hash IP, máximo de 2.000 SID y límite de payload siguen vigentes. El límite de 5 envíos/hora afecta nuevas playlists, no las ediciones.
- La clave de seis dígitos es apropiada solo como **control beta básico**, no como un esquema de autenticación robusto: probar con público amplio exige medidas antiabuso más fuertes.
