# Logseq Git Sync v0.2

## Cambios principales

- Sincronización al recuperar foco real de Windows (incluye Alt+Tab), además de `visibilitychange`.
- Auto Commit & Sync tras cambios de Logseq con debounce configurable (10 s por defecto).
- Periodic Safety Sync configurable (60 s por defecto) aunque Logseq siga abierto en primer plano.
- Auto Commit & Sync al minimizar/ocultar Logseq.
- Startup sync y graph-change sync usan `commitAndSync` cuando el auto-commit del plugin está activo.
- Mensaje claro cuando la rama actual no tiene upstream, indicando `git push -u origin <branch>`.
- Limpieza de listeners/timers al descargar el plugin.

## Ajustes recomendados para la prueba

- Auto Sync on Startup: ON
- Auto Sync on Focus: ON
- Auto Sync when Graph Changes: ON
- Auto Commit & Sync after Changes: ON
- Auto Commit Delay: 10 s
- Periodic Safety Sync: ON
- Periodic Sync Interval: 60 s
- Auto Commit & Sync when Hidden: ON
- Git Auto Commit nativo de Logseq: OFF

## Archivos a reemplazar

- `src/main.tsx`
- `src/helper/constants.ts`
- `src/helper/sync.ts`

No hace falta modificar `git.ts`, `util.ts`, `package.json` ni el workflow de CI para esta iteración.
