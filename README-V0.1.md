# Logseq Git Sync - iteración 0.1

Archivos modificados respecto a `haydenull/logseq-plugin-git` v1.7.0:

- `src/main.tsx`
- `src/helper/constants.ts`
- `src/helper/git.ts`
- `src/helper/sync.ts` (nuevo)

## Objetivo de esta iteración

Añadir una sincronización Git segura y automática sin hacer merges/rebases silenciosos.

### Comportamiento

- Local = remoto: no hace nada.
- Local detrás y working tree limpio: `git pull --ff-only`.
- Local por delante: `git push`.
- Local y remoto divergentes: avisa y se detiene.
- Local con cambios sin commit + remoto por delante: avisa y se detiene.
- `Commit & Push` pasa a usar `Commit & Sync`: commitea si hace falta y después ejecuta la sincronización segura.
- Puede sincronizar al arrancar, al volver a Logseq y al cambiar de graph.
- `Auto Push` usa `commitAndSync` cuando Logseq pasa a segundo plano.

## Ajustes nuevos

- Auto Sync on Startup (default: true)
- Auto Sync when Logseq Becomes Visible (default: true)
- Auto Sync when Graph Changes (default: true)
- Sync Now (botón manual)

## Importante para la primera prueba

Mantener por ahora el Git Auto Commit nativo de Logseq tal como está. Esta iteración no añade todavía sincronización periódica tras cada cambio; eso se abordará después de validar que los pulls externos se reflejan correctamente en Logseq.

No activar simultáneamente el plugin original del Marketplace y este fork durante la prueba si ambos conservan el mismo `logseq.id` (`logseq-git`).
