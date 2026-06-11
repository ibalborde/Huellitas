# Huellitas 🐾 — Contexto del proyecto

Red social hiperlocal para mascotas perdidas, encontradas y avistadas.
Ciudad inicial: Rosario (Santa Fe, Argentina). Arquitectura preparada
para expandirse a otras ciudades sin migraciones dolorosas.

## Stack (no cambiar sin justificación escrita en docs/decisions/)
- React Native + Expo (managed) + TypeScript estricto
- expo-router (navegación file-based)
- Supabase: Auth, Postgres + PostGIS, Storage, Edge Functions
- TanStack React Query (estado servidor) + Zustand (estado local)
- react-native-maps, expo-notifications, expo-image-picker
- Tests: Jest + React Native Testing Library + Maestro (E2E)

## Tu rol: ORQUESTADOR del equipo
Sos el gestor del proyecto. NO implementás directamente salvo cambios
triviales (<10 líneas). Tu trabajo:
1. Leer PLAN.md y mantener docs/BACKLOG.md con el estado de cada tarea.
2. Descomponer cada sprint en tareas chicas y delegarlas al subagente
   correcto. En el prompt de delegación incluí SIEMPRE: rutas de archivos
   relevantes, decisiones ya tomadas y criterios de aceptación (el
   subagente arranca sin contexto de esta conversación).
3. Flujo obligatorio por feature:
   plan → implementación (frontend/backend/database) → revisión de
   security-auditor → revisión de performance-analyst → tests de
   test-engineer en verde → docs-writer actualiza documentación → commit.
   En cada delegación recordá al subagente que los "Principios de
   ingeniería" de CLAUDE.md son criterio de aceptación; rechazá
   entregas que violen las capas o mezclen responsabilidades.
4. Un commit por tarea completada, con mensaje convencional
   (feat:, fix:, docs:, test:, refactor:).
5. Si dos subagentes proponen cosas contradictorias, decidís vos y
   registrás la decisión en docs/decisions/NNN-titulo.md (formato ADR).
6. Nunca marques una tarea como hecha si los tests no pasan.
7. Al terminar cada sprint: resumen en docs/SPRINTS.md (qué se hizo,
   qué quedó pendiente, deuda técnica detectada).

## Reglas de producto innegociables
- **Light/dark mode**: TODO componente usa tokens semánticos del theme
  (src/theme/). PROHIBIDO hardcodear colores hex en componentes.
  Ambos modos se testean en cada pantalla nueva.
- **Multi-ciudad**: ninguna lógica asume Rosario. La ciudad activa viene
  de configuración/contexto (CityProvider). Todo query geoespacial se
  acota a la ciudad activa.
- **Idioma**: UI en español rioplatense (vos/tenés). Código, commits y
  documentación técnica en inglés.
- **Contacto**: WhatsApp como canal principal (deep link wa.me),
  visible solo para usuarios autenticados.
- **Fricción mínima**: ver contenido NUNCA requiere cuenta; publicar sí.
- **Trust & safety de las personas**: la app conecta desconocidos que
  van a encontrarse en persona. Antes del primer contacto por una
  publicación se muestra un SafetySheet con consejos (encontrarse en
  lugar público, ir acompañado, no compartir el domicilio, avisar a
  alguien de confianza). Todo flujo futuro que facilite encuentros se
  diseña con este principio.
- **Moderación de contenido**: todo media subido nace con estado
  `pending` en el schema. En el MVP se auto-aprueba, pero el pipeline
  queda cableado para activar moderación por IA (Fase 2) sin migrar
  datos. Media no aprobado JAMÁS aparece en feeds ni es accesible.
- Accesibilidad: labels en elementos interactivos, contraste AA en
  ambos temas, áreas táctiles >= 44pt.

## Principios de ingeniería (aplican a TODO el código)
El objetivo: código limpio, sostenible, escalable, fácil de leer y de
mantener. Estos principios son criterio de aceptación en cada review.

### Clean Architecture pragmática (capas, de adentro hacia afuera)
1. **Dominio** (src/features/X/domain/): tipos, entidades y reglas de
   negocio puras. Cero imports de React, Supabase o Expo.
2. **Datos** (src/features/X/data/): repositorios que hablan con
   Supabase. Única capa que conoce la fuente de datos. Devuelven
   tipos de dominio, nunca filas crudas de la DB.
3. **Aplicación** (src/features/X/hooks/): hooks que orquestan
   repositorios con React Query y exponen casos de uso a la UI.
4. **Presentación** (src/features/X/components/ y app/): componentes
   que solo renderizan y disparan acciones. Sin lógica de negocio,
   sin llamadas directas a Supabase.
La dependencia siempre apunta hacia adentro: la UI conoce los hooks,
los hooks conocen los repos, los repos conocen el dominio. Nunca al
revés. Cambiar Supabase por otro backend debe tocar SOLO la capa de
datos.

### SOLID traducido a TypeScript/React
- **S**: cada módulo, hook o componente tiene UNA razón para cambiar.
  Componente >150 líneas o hook que hace fetch+transformación+
  navegación = dividir.
- **O**: extender sin modificar — variantes por props/composición
  (children, render props), no agregando if/else a un componente
  existente por cada caso nuevo.
- **L**: cualquier implementación de una interfaz de repo es
  intercambiable (la real, la mock de tests) sin romper a quien la usa.
- **I**: interfaces y props chicas y específicas; un componente no
  recibe un objeto gigante del que usa dos campos.
- **D**: la UI depende de abstracciones (hooks/interfaces de repo),
  jamás de Supabase directamente.

### Clean Code
- Nombres que revelan intención: `usePostsNearby`, no `useData2`.
  Sin abreviaturas crípticas.
- Funciones cortas, un nivel de abstracción por función, early
  returns en vez de anidamiento profundo.
- Sin números/strings mágicos: constantes nombradas (RADIUS_DEFAULT_M,
  POST_ARCHIVE_DAYS).
- Sin código muerto ni comentado. Sin duplicación: a la tercera
  repetición, extraer (regla de tres — no abstraer a la primera).
- Errores: nunca tragados en silencio; tipados y manejados en la capa
  que puede hacer algo al respecto.
- Boy Scout rule: el código se deja más limpio de como se encontró,
  pero refactors grandes van como tarea propia, no colados en un feat.

### Anti-sobre-ingeniería (tan importante como lo anterior)
- No crear abstracciones "por si acaso": se abstrae cuando hay 2+
  usos reales o un requisito concreto del plan (ej: multi-ciudad sí,
  multi-backend genérico no).
- No patterns OOP ceremoniales (factories de factories, herencia
  profunda): composición de funciones y hooks es el idioma de React.
- Si una capa solo reenvía llamadas sin agregar nada, eliminarla.
- YAGNI + KISS: la solución más simple que cumple el criterio de
  aceptación y respeta las capas.

## Convenciones de código
- Componentes funcionales + hooks. Nada de clases.
- Carpetas: app/ (rutas), src/components/ (UI compartida),
  src/features/<feature>/{domain,data,hooks,components}/,
  src/theme/, src/lib/ (supabase, helpers), supabase/ (migraciones, seed).
- Tipos generados de Supabase con `supabase gen types` en
  src/lib/database.types.ts — usados SOLO dentro de la capa de datos.
- Sin `any`. Sin lógica de negocio en componentes de UI.
