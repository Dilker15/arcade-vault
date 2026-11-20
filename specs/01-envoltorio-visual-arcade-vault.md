# SPEC 01 — Envoltorio visual de Arcade Vault

> **Status:** implemented
> **Depends on:** —
> **Date:** 2026-11-16
> **Objective:** Portar las 5 pantallas de `references/templates/` (biblioteca, detalle, reproductor, autenticación, salón de la fama) a rutas reales de Next.js App Router, manteniendo el aspecto y la interacción tal cual el original pero sin implementar ninguna mecánica de juego real.

---

## Por qué existe esta spec

El tema global (`app/globals.css`, fuentes vía `next/font`) ya quedó portado en una tarea anterior. Esta spec cubre el siguiente paso: la "cáscara" de pantallas y navegación. El original (`references/templates/*.jsx`) es una SPA de React con routing por hash y un único árbol de estado en `app.jsx`; aquí se decide cómo trasladar eso al modelo de rutas de Next sin inventar funcionalidad nueva.

---

## Scope

**In:**

- 5 rutas reales: biblioteca (`/`), detalle de juego (`/juego/[id]`), reproductor (`/juego/[id]/jugar`), autenticación (`/auth`) y salón de la fama (`/salon`).
- Barra de navegación (`Nav`) con estado activo por ruta, botón de sesión, contador de créditos estático y menú móvil deslizante (<840px), igual que `nav.jsx`.
- Footer estático igual al de `app.jsx` (`© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`).
- Catálogo de juegos, categorías y generador de puntuaciones de ejemplo (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados 1:1 a un módulo de datos tipado.
- Sesión de usuario simulada (login de invitado sin validar) persistida en `localStorage` bajo la clave `av_user`.
- Guardado de puntaje final en `localStorage` bajo la clave `av_scores`, solo como demostración visual (toast "PUNTUACIÓN GUARDADA").
- Pantalla de reproductor puramente cosmética: la misma animación CSS de arena (nave, enemigos, grid con perspectiva) y el mismo incremento de puntaje falso vía `setInterval`, sin mecánica de juego real.
- Estados vacíos y de error visual ya presentes en el original: "NO HAY RESULTADOS" en biblioteca, 404 real de Next si `/juego/[id]` no existe.
- Responsive y accesibilidad ya cubiertos por `globals.css` (media queries existentes, foco visible por defecto del navegador).

**Out of scope (para futuras specs):**

- Cualquier mecánica de juego real (física, colisiones, niveles jugables).
- Backend, API o base de datos: todo el estado vive en `localStorage` del navegador.
- Sistema de créditos/monedas real (el contador "CRÉDITOS · 03" queda como valor decorativo fijo).
- Autenticación real (passwords, OAuth con Google/GitHub, verificación de email).
- Leaderboard global real: las tablas de puntuaciones siguen siendo datos sembrados (`seededScores`), desconectados de lo que el usuario guarda en `av_scores`.
- Internacionalización (todo el copy queda en español, igual que el original).
- Tests automatizados (el repo no tiene suite configurada).

---

## Data model

```ts
// lib/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS: "cover-bricks", "cover-tetro", ...
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string; // ej. "12.4K"
}

export const GAMES: Game[]; // los mismos 8 juegos de data.jsx
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export const PLAYERS: string[]; // nombres mock para el leaderboard

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/session.ts
export interface Session {
  name: string;
}

// localStorage keys (idénticas al original)
const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

export interface SavedScoreEntry {
  game: string; // Game.id
  score: number;
  name: string;
  at: number; // Date.now()
}
```

`Session` y `SavedScoreEntry` viven solo en `localStorage` del navegador; no hay versionado de esquema porque no hay nada que migrar (dato descartable y regenerable).

---

## Implementation plan

1. Crear `lib/games.ts` con los tipos `Game`/`ScoreRow` y los datos `GAMES`, `CATS`, `PLAYERS` y la función `seededScores`, portados 1:1 desde `data.jsx`. Verificación manual: `npm run build` sigue pasando con el módulo importado pero sin usar.
2. Crear `lib/session.tsx`: contexto de cliente `SessionProvider` + hook `useSession()` que exponen `{ user, login(name), logout(), saveScore(entry) }`, leyendo/escribiendo `av_user` y `av_scores` en `localStorage` (con guardas `typeof window !== "undefined"` para evitar desajuste de hidratación).
3. Actualizar `app/layout.tsx`: envolver `children` con `SessionProvider`, renderizar `<Nav />` antes del contenido y el footer estático después, replicando el marco de `app.jsx`.
4. Crear `components/nav.tsx` (cliente): logo, links "Biblioteca"/"Salón de la Fama" resaltando el activo con `usePathname()`, contador de créditos estático, botón de sesión (nombre + cerrar sesión, o "Iniciar Sesión" que enlaza a `/auth`), botón hamburguesa y panel móvil deslizante con los mismos links.
5. Crear `components/game-card.tsx` (cliente): la tarjeta de juego con el efecto de inclinación 3D al mover el mouse (`tiltRef`), portada por categoría, mejor puntuación y botón "JUGAR".
6. Reemplazar `app/page.tsx` por la pantalla Biblioteca: hero con título parpadeante, buscador por nombre, chips de categoría, grid de `GameCard` y estado vacío "NO HAY RESULTADOS". Verificación manual: filtrar por categoría y buscar un juego que no existe muestra el estado vacío.
7. Crear `app/juego/[id]/page.tsx` (Detalle): portada, tags, descripción larga, `stat-strip` (partidas/mejor global/dificultad), leaderboard estático vía `seededScores(id)`, botones "Jugar ahora" (→ `/juego/[id]/jugar`) y "Volver al vault". Si el `id` no existe en `GAMES`, llamar a `notFound()`.
8. Crear `app/juego/[id]/jugar/page.tsx` (Reproductor, cliente): HUD (jugador/puntaje/vidas/nivel), pantalla CRT con la misma arena animada en CSS, incremento de puntaje falso por intervalo mientras no esté pausado/terminado, botones Pausa/Fin/Salir, y modal de fin de juego que permite guardar el puntaje (`useSession().saveScore`) mostrando el mismo toast "PUNTUACIÓN GUARDADA".
9. Crear `app/auth/page.tsx` (cliente): tarjeta con tabs "Iniciar sesión"/"Crear cuenta", formulario sin validación que llama a `login(nombre || "PLAYER1")` y redirige a `/`, botón "Jugar como invitado" (logout + redirige a `/`), botones sociales Google/GitHub decorativos sin acción.
10. Crear `app/salon/page.tsx` (cliente): tabs por juego, podio (oro/plata/bronce) y tabla de 12 filas vía `seededScores`, más la fila "tu mejor marca" cuando hay sesión iniciada, igual que `salon.jsx`.

---

## Acceptance criteria

- [ ] Las 5 rutas (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon`) cargan sin errores de consola y respetan el tema de `globals.css`.
- [ ] El `Nav` resalta "Biblioteca" como activo tanto en `/` como en `/juego/[id]` y `/juego/[id]/jugar`, y "Salón de la Fama" como activo en `/salon`.
- [ ] En viewport <840px el link de navegación y el contador de créditos se ocultan y aparece la hamburguesa; al tocarla se abre el panel lateral con los mismos links.
- [ ] En Biblioteca, escribir un texto que no coincide con ningún título muestra "NO HAY RESULTADOS"; cambiar de categoría filtra el grid sin recargar la página.
- [ ] Visitar `/juego/id-invalido` devuelve la página 404 de Next.
- [ ] En Detalle, el botón "Jugar ahora" navega a `/juego/[id]/jugar` y "Volver al vault" navega a `/`.
- [ ] En Reproductor, el puntaje sube solo mientras no está en pausa ni terminado; "PAUSA" detiene el incremento y cambia su etiqueta a "REANUDAR"; "FIN" abre el modal de fin de juego con el puntaje final mostrado.
- [ ] Guardar el puntaje en el modal de fin de juego persiste una entrada en `localStorage["av_scores"]` y reemplaza el formulario por el toast "▸ PUNTUACIÓN GUARDADA_".
- [ ] En `/auth`, enviar el formulario de "Iniciar sesión" o "Crear cuenta" con cualquier valor crea una sesión (`localStorage["av_user"]`) y redirige a `/`; "Jugar como invitado" limpia la sesión y también redirige a `/`.
- [ ] Tras iniciar sesión, el `Nav` muestra el nombre de usuario en vez de "Iniciar Sesión", y recargar la página mantiene la sesión.
- [ ] En `/salon`, cambiar de tab de juego actualiza el podio y la tabla; si hay sesión iniciada aparece la fila adicional "TU MEJOR MARCA EN {juego}".
- [ ] `npm run build` termina sin errores de TypeScript ni de lint.

---

## Decisions

- **Sí:** rutas reales de App Router en vez de hash routing. Más idiomático en Next, URLs compartibles, cada pantalla es independiente en vez de un único árbol de estado como en `app.jsx`.
- **Sí:** estado de sesión vía React Context (`SessionProvider`) en `app/layout.tsx` en vez de pasar `user`/`navigate` como props. Las páginas de App Router son árboles separados; un contexto en el layout es la forma natural de compartir sesión entre rutas sin repetir lógica de `localStorage` en cada página.
- **Sí:** las tablas de puntuaciones siguen siendo mock (`seededScores`), desconectadas de `av_scores`. Igual que el original; conectar el leaderboard real a lo guardado por el usuario es trabajo de otra spec (requeriría agregación y orden real).
- **Sí:** formulario de auth sin ninguna validación, calcado del original. Es solo la cáscara visual; validar campos es una funcionalidad nueva fuera de pedido.
- **No:** mantener el router por hash de una sola página. Se descarta porque no aprovecha el App Router y complica el deploy/SEO sin ningún beneficio para esta spec.
- **No:** conectar los botones sociales (Google/GitHub) a proveedores reales. Quedan decorativos, como en el original.
- **Sí:** usar `notFound()` de Next para un `id` de juego inexistente en vez de renderizar `null` (como hacía `detalle.jsx`). Es una mejora menor y gratuita del manejo de rutas, no agrega alcance nuevo.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` no está disponible durante el render en servidor (SSR) y puede causar desajuste de hidratación | Leer `av_user`/`av_scores` solo dentro de `useEffect`/al montar en el cliente, nunca durante el render inicial del lado servidor. |
| Las flags experimentales `cacheComponents`/`partialPrefetching` de `next.config.ts` pueden tratar como servidor un componente que en realidad necesita interactividad | Marcar explícitamente `"use client"` en `Nav`, `GameCard`, Biblioteca, Reproductor, Auth y Salón (todos usan `useState`/`useEffect`/eventos), dejando Detalle como server component ya que no necesita estado. |
| `localStorage` deshabilitado (modo privado/incógnito) | Envolver lectura/escritura en try/catch como hace el original; si falla, la sesión y el guardado de puntaje simplemente no persisten entre recargas, sin romper la pantalla. |

---

## What is **not** in this spec

- Mecánica de juego real para cualquiera de los 8 juegos del catálogo.
- Backend, API o persistencia fuera del navegador.
- Sistema de créditos/monedas real.
- Autenticación real (validación de credenciales, OAuth, recuperación de contraseña).
- Leaderboard global conectado a los puntajes guardados por los usuarios.
- Internacionalización o soporte multi-idioma.

Cada uno de estos, si se necesita, va en su propia spec.
