# Huellitas — Plan de desarrollo

## Fase 0 — Fundaciones
- [ ] Init: create-expo-app con TypeScript + expo-router. ESLint+Prettier.
- [ ] Supabase local (supabase init/start) + proyecto vinculado.
- [ ] Migración 0001: schema multi-ciudad completo + RLS + seed Rosario.
- [ ] Sistema de theming light/dark (src/theme) + componentes base
      (Button, Badge, Card, Input, EmptyState).
- [ ] CI básico: typecheck + lint + tests en cada commit (GitHub Actions).

## Fase 1 — MVP
### Sprint 1: Explorar (solo lectura)
- [ ] Pantalla inicio: toggle mapa/lista, filtros (tipo, especie, radio, fecha).
- [ ] Mapa con pines por color de estado + clustering básico.
- [ ] RPC posts_nearby + hook usePosts con paginación.
- [ ] Detalle de publicación con galería.
### Sprint 2: Publicar
- [ ] Auth (email, Google, Apple) + perfil con WhatsApp.
- [ ] Flujo Reportar en 3 pasos (tipo → fotos+datos → pin en mapa).
- [ ] Subida de fotos comprimidas a Storage (pipeline post_media con
      auto-aprobación; moderación IA llega en Fase 2 sin migrar).
- [ ] Botón contactar por WhatsApp (solo autenticados).
- [ ] SafetySheet: consejos de seguridad personal antes del primer
      contacto (lugar público, ir acompañado, no compartir domicilio).
### Sprint 3: Gestionar
- [ ] Mis publicaciones: editar, resolver, archivar.
- [ ] Comentarios (con ubicación opcional).
- [ ] Compartir publicación (deep link universal).
- [ ] Denunciar contenido + bloquear usuario (requisito stores).
### Sprint 4: Pulir y lanzar
- [ ] Onboarding, estados vacíos, manejo de errores global, Sentry.
- [ ] Auditoría completa de security-auditor y performance-analyst.
- [ ] Auto-archivado a 60 días (Edge Function programada).
- [ ] EAS build de producción + fichas de store.

## Fase 2 — Comunidad (post-lanzamiento)
- [ ] Push por zona (zone_alerts + Edge Function fan-out).
- [ ] Moderación IA activa: Edge Function con API de visión que
      aprueba/rechaza media (contenido +18, violento o irrelevante).
- [ ] Videos cortos en publicaciones (máx 30s, thumbnail, moderación
      por keyframes).
- [ ] Safety reforzado: recordatorio de seguridad al detectar
      coordinación de encuentro, opción de redondear ubicación del
      post a la cuadra.
- [ ] Feed de reencuentros ("finales felices").
- [ ] Sugerencias de coincidencia por filtros.
- [ ] Selector de ciudad (la arquitectura ya lo soporta).

## Fase 3 — Inteligencia
- [ ] Matching de fotos con embeddings (pgvector).
- [ ] Adopciones y tránsitos. Red de veterinarias.
