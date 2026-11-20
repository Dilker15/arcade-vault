# SPEC 02 — Landing y Acerca de

> **Status:** implemented
> **Depends on:** SPEC 01
> **Date:** 2026-11-20
> **Objective:** Portar la landing (`home.jsx`) y la pantalla de Acerca de/Contacto (`about.jsx`) de `references/templates/home-about/` a rutas reales de Next, moviendo la biblioteca a `/biblioteca` y ampliando el Nav a cuatro secciones, sin agregar funcionalidad nueva.

---

## Por qué existe esta spec

SPEC 01 portó las 5 pantallas de producto (biblioteca, detalle, reproductor, auth, salón) y dejó `/` ocupado por la biblioteca. La carpeta `references/templates/home-about/` agrega dos pantallas de presentación — una landing de marketing y una página de Acerca de con formulario de contacto — y, crucialmente, un `nav.jsx` de **cuatro** links donde `home` es la pantalla raíz. Eso obliga a reubicar la biblioteca y a reapuntar los enlaces internos que hoy asumen que `/` es el vault. Esta spec cubre ese movimiento completo.

El CSS de la plantilla (`home-about/styles.css`, 1744 líneas) es el `styles.css` base **más un bloque aditivo al final**: ninguna regla nueva pisa selectores ya portados a `app/globals.css`. Dentro de ese bloque, las secciones `GAMEPAD` y `Theme variants` (líneas 1151–1620, clases `.gp*`, `.dp*`, `.ab*`) no las consume ningún JSX de la carpeta — son de otra variante de diseño y quedan fuera.

---

## Scope

**In:**

- Nueva ruta `/` con la landing completa de `home.jsx`: hero a altura de pantalla con las 8 siluetas pixel flotantes, sección `// 01` de 4 features, `// 02` con riel de 6 mini-cards, banda de 3 estadísticas, `// 03` de actividad en vivo (ticker + top jugadores), `// 04` de precios con FAQ, y CTA final.
- Nueva ruta `/acerca-de` con `about.jsx`: hero de misión, fila de 3 destacados, divider de 24 píxeles animados y bloque de contacto con formulario.
- Mover la biblioteca de `/` a `/biblioteca`, sin cambios en su contenido ni en su comportamiento (buscador, chips de categoría, estado vacío "NO HAY RESULTADOS").
- `Nav` ampliado a 4 links (Inicio, Biblioteca, Salón de la Fama, Acerca de) con estado activo por ruta, igual que `home-about/nav.jsx`, incluidos los dos links nuevos en el panel móvil.
- Reapuntar a `/biblioteca` los 5 enlaces internos que hoy van a `/`: "VOLVER AL VAULT" del detalle y del reproductor, "VOLVER A LA BIBLIOTECA" del salón, y los dos redirects de `/auth` (iniciar sesión / crear cuenta / invitado).
- Formulario de contacto con validación de campos no vacíos (animación `shake` al fallar) y terminal falsa `VAULT-OS` de éxito, calcado del original: no envía nada a ningún destino.
- Animaciones de entrada por scroll (`IntersectionObserver` sobre `.reveal`, threshold 0.12) en ambas pantallas.
- Datos del ticker y del top de jugadores portados a `lib/games.ts` como `TICKER` y `TOP_PLAYERS` tipados.
- Secciones `HOME PAGE`, `ABOUT PAGE`, `ACTIVITY` y `PRICING` del CSS de la plantilla, añadidas a `app/globals.css`.
- Bloque `@media (prefers-reduced-motion: reduce)` que neutraliza reveal, flotación de siluetas y pulsos dejando el contenido visible.

**Out of scope (para futuras specs):**

- Las secciones `GAMEPAD` y `Theme variants` del CSS (líneas 1151–1620) y cualquier componente de gamepad: no existe markup para ellas en la plantilla.
- Envío real del formulario de contacto (endpoint, correo, almacenamiento del mensaje).
- Validación de formato de correo electrónico: el original solo exige que el campo no esté vacío.
- Conectar las cifras del landing (ticker, top jugadores, "12+ JUEGOS", "MILES DE PARTIDAS") a datos reales: siguen siendo contenido fijo, igual que el original.
- `metadata` por ruta (títulos y descripciones propias): las nuevas rutas heredan la de `app/layout.tsx`.
- Mecánica de juego real, backend, créditos reales, autenticación real y leaderboard global, que siguen fuera por SPEC 01.
- Tests automatizados (el repo no tiene suite configurada).

---

## Data model

Solo se añaden dos colecciones de contenido fijo a `lib/games.ts`. No hay cambios en persistencia: `av_user` y `av_scores` siguen tal como los definió SPEC 01.

```ts
// lib/games.ts (añadidos)

export interface TickerEntry {
  player: string;  // "NEONFOX"
  game: string;    // título corto, ej. "Caída"
  score: number;
  ago: string;     // "hace 2 min"
  color: "cyan" | "magenta" | "yellow" | "green";
}

export const TICKER: TickerEntry[]; // las 7 filas de home.jsx, en el mismo orden

export interface TopPlayer {
  rank: number;    // 1..5
  player: string;
  score: number;
}

export const TOP_PLAYERS: TopPlayer[]; // las 5 filas de home.jsx, en el mismo orden
```

El resto del contenido del landing (features, estadísticas, plan de precios, FAQ, destacados de Acerca de) se queda como markup en su página: es copy, no datos consultables, y nada más lo consume.

---

## Implementation plan

1. Añadir a `app/globals.css` las secciones `HOME PAGE` y `ABOUT PAGE` (líneas 928–1150 de `references/templates/home-about/styles.css`) y `ACTIVITY` y `PRICING` (líneas 1621–1744), omitiendo el rango 1151–1620. Cerrar con un bloque `@media (prefers-reduced-motion: reduce)` que ponga `animation: none` y `transition: none` en `.reveal`, `.silo`, `.pulse` y `.div-pixels span`, y fuerce `.reveal { opacity: 1; transform: none; }`. Verificación manual: `npm run build` pasa y las 5 pantallas de SPEC 01 se ven idénticas (el bloque es aditivo).
2. Añadir a `lib/games.ts` los tipos `TickerEntry`/`TopPlayer` y las constantes `TICKER`/`TOP_PLAYERS`, portadas 1:1 desde los arrays inline de `home.jsx`.
3. Crear `components/reveal-observer.tsx` (cliente): componente sin markup que al montar observa todos los `.reveal` del documento con `IntersectionObserver` (threshold 0.12), añade la clase `in` al entrar en viewport, deja de observar ese elemento y desconecta el observer al desmontar. Réplica del hook `useReveal` del original.
4. Mover la biblioteca y crear la landing en el mismo paso, para que `/` nunca quede roto:
   - `app/page.tsx` actual → `app/biblioteca/page.tsx`, sin tocar su contenido.
   - Nuevo `app/page.tsx` como server component con las 6 secciones del landing, `<RevealObserver />` al inicio, las siluetas y los iconos de feature como SVG inline, `GAMES.slice(0, 6)` en el riel de mini-cards, `TICKER` y `TOP_PLAYERS` en la sección de actividad, y `<Link>` en lugar de los `onClick={() => navigate(...)}` del original (explorar/ver todos → `/biblioteca`, crear cuenta/empezar gratis → `/auth`, ver salón → `/salon`, mini-cards → `/juego/[id]`).

   Verificación manual: `/` muestra la landing y `/biblioteca` la biblioteca con buscador, chips y estado vacío intactos.
5. Crear `components/contact-form.tsx` (cliente): estado `{ name, email, msg }`, estado `sent` y estado `shake`; al enviar, si algún campo está vacío activa `shake` por 400 ms y no envía; si están los tres, reemplaza el formulario por la terminal `VAULT-OS` con el nombre en mayúsculas y el botón "ENVIAR OTRO MENSAJE" que limpia todo.
6. Crear `app/acerca-de/page.tsx` como server component: hero (`kicker` + título + párrafo de misión), `highlight-row` de 3 destacados con sus SVG inline, `about-divider` con los 24 `<span>` y sus `animationDelay` escalonados, bloque de contacto con el intro y los 3 `tip` de la izquierda, `<ContactForm />` a la derecha, y `<RevealObserver />`.
7. Actualizar `components/nav.tsx`: 4 links — Inicio (`/`), Biblioteca (`/biblioteca`), Salón de la Fama (`/salon`), Acerca de (`/acerca-de`) — con el activo resuelto por `usePathname()`, donde Biblioteca también está activa en `/juego/*`; añadir Inicio y Acerca de al panel móvil, conservando el link de sesión y el contador de créditos. El logo sigue apuntando a `/`, que ahora es la landing (igual que el original).
8. Reapuntar los enlaces que asumían `/` = biblioteca: `app/juego/[id]/page.tsx:68` y `components/game-player.tsx:134` ("VOLVER AL VAULT"), `app/salon/page.tsx:104` ("VOLVER A LA BIBLIOTECA") y los dos `router.push("/")` de `app/auth/page.tsx` (líneas 18 y 23) pasan a `/biblioteca`. Verificación manual: ninguna de las 5 acciones deja al usuario en la landing.

---

## Acceptance criteria

- [ ] `/` renderiza la landing completa: hero con siluetas, `// 01` features, `// 02` riel de 6 mini-cards, banda de 3 estadísticas, `// 03` actividad, `// 04` precios y CTA final, sin errores de consola.
- [ ] `/biblioteca` renderiza la biblioteca con el mismo aspecto y comportamiento que tenía en `/`: buscar un título inexistente muestra "NO HAY RESULTADOS" y cambiar de categoría filtra el grid sin recargar.
- [ ] `/acerca-de` renderiza el hero de misión, los 3 destacados, el divider de píxeles y el bloque de contacto.
- [ ] El Nav muestra 4 links; "Inicio" está activo solo en `/`, "Biblioteca" en `/biblioteca` y en `/juego/*`, "Salón de la Fama" en `/salon` y "Acerca de" en `/acerca-de`.
- [ ] En viewport <840px el panel móvil lista los 4 links más el de sesión, y tocar cualquiera navega y cierra el panel.
- [ ] Los CTA del landing navegan correctamente: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" → `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS" → `/auth`; "VER SALÓN" → `/salon`; cada mini-card → `/juego/[id]` del juego correspondiente.
- [ ] Al hacer scroll en `/` y en `/acerca-de`, las secciones con clase `reveal` aparecen con la transición de entrada una sola vez (no se reinicia al volver a subir).
- [ ] Con `prefers-reduced-motion: reduce` activo en el sistema, todo el contenido de `/` y `/acerca-de` es visible sin animaciones de entrada ni elementos en movimiento.
- [ ] Enviar el formulario de contacto con algún campo vacío no muestra la terminal y dispara la animación `shake`; con los 3 campos llenos, el formulario se reemplaza por la terminal `VAULT-OS` que incluye el nombre en mayúsculas.
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los 3 campos vacíos.
- [ ] Iniciar sesión, crear cuenta o entrar como invitado en `/auth` redirige a `/biblioteca`, no a `/`.
- [ ] "VOLVER AL VAULT" en el detalle y en el modal de fin de partida, y "VOLVER A LA BIBLIOTECA" en el salón, llevan a `/biblioteca`.
- [ ] `app/globals.css` no contiene ninguna regla `.gp*`, `.dp*` ni `.ab*`.
- [ ] `npm run build` termina sin errores de TypeScript ni de lint.

---

## Decisions

- **Sí:** la landing ocupa `/` y la biblioteca se mueve a `/biblioteca`. Es lo que define el `nav.jsx` de la plantilla (logo e "Inicio" van al landing) y es la convención normal para una página de presentación. El costo es acotado y conocido: 5 enlaces internos a reapuntar.
- **Sí:** `app/page.tsx` y `app/acerca-de/page.tsx` como server components, con las únicas islas de cliente estrictamente necesarias (`RevealObserver` y `ContactForm`). Las ~340 líneas de markup del landing son estáticas y no tienen por qué viajar al bundle del cliente; además mantiene el patrón de SPEC 01, que dejó el detalle como server component.
- **Sí:** el observer de scroll va en un componente sin markup (`RevealObserver`) que busca `.reveal` en el DOM, en vez de un wrapper que envuelva cada sección. Así las páginas conservan exactamente las mismas clases que el original y no hay que reestructurar el markup.
- **Sí:** `TICKER` y `TOP_PLAYERS` en `lib/games.ts`. SPEC 01 ya estableció ese módulo como el hogar de todos los datos mock tipados; dejarlos inline rompería la convención.
- **No:** mover features, estadísticas, precios y FAQ a `lib/`. Es copy de marketing que solo consume su propia página; convertirlo en datos añade indirección sin ningún consumidor que lo justifique.
- **Sí:** omitir las secciones `GAMEPAD` y `Theme variants` del CSS. Ningún JSX de la carpeta usa esas clases; portarlas dejaría ~470 líneas muertas en `globals.css`. Si más adelante aparece el componente, se porta junto con su CSS en su propia spec.
- **Sí:** omitir los `<span className="tp-bar"><span className="tp-fill" style={{width}}/></span>` de las filas del top de jugadores. El CSS de la plantilla solo define `.tp-bar { position: absolute; }` y **no define `.tp-fill`**, así que esos spans no pintan nada: la barra de fondo que se ve en el original viene de `.top-row::before`. Omitirlos es visualmente idéntico y evita markup inerte.
- **Sí:** respetar `prefers-reduced-motion`, que el original ignora. Son ~10 líneas de CSS y el landing es la pantalla con más movimiento del sitio (siluetas en bucle, reveal, pulsos).
- **No:** validar formato de correo en el formulario de contacto. El original solo exige campo no vacío; agregar validación es funcionalidad nueva fuera de pedido.
- **Sí:** redirigir a `/biblioteca` después de autenticarse, en vez de a `/`. Mantiene el destino útil que tenía antes del cambio de rutas: quien acaba de entrar quiere jugar, no volver al landing.
- **No:** `metadata` propia por ruta. Las nuevas rutas heredan la de `app/layout.tsx`, igual que las de SPEC 01; unificar títulos y descripciones por pantalla es trabajo de una spec de SEO.
- **Ruta en español `/acerca-de`**, consistente con `/salon` y `/juego/[id]` de SPEC 01.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Mover `app/page.tsx` a `app/biblioteca/page.tsx` deja enlaces internos apuntando al landing sin que nada falle en build (son rutas válidas, solo destino equivocado) | El paso 8 enumera las 5 ubicaciones exactas con archivo y línea; el criterio de aceptación las verifica una por una navegando. |
| `IntersectionObserver` no existe durante el render en servidor, y un `.reveal` que nunca recibe `.in` queda invisible (`opacity: 0`) | El observer vive en un componente cliente que solo corre en `useEffect`. El bloque de `prefers-reduced-motion` fuerza `.reveal { opacity: 1 }`, y si el observer fallara el contenido seguiría oculto solo para quien no tiene reduced-motion: por eso el criterio de aceptación exige verificar el scroll en ambas pantallas. |
| Las flags experimentales `cacheComponents`/`partialPrefetching` pueden interferir con las dos islas de cliente nuevas | Marcar `"use client"` explícitamente en `RevealObserver` y `ContactForm`, y dejar las páginas como server components puros sin estado. |
| El bloque de CSS nuevo introduce selectores genéricos (`.kicker`, `.section-head`, `.section-title`, `.reveal`) que podrían afectar pantallas existentes | Verificado: en la plantilla esos selectores solo existen dentro del bloque nuevo y no aparecen en el markup de SPEC 01. El paso 1 pide revisar las 5 pantallas anteriores tras añadir el CSS. |
| El hero del landing usa `min-height: calc(100vh - 60px)` asumiendo un nav de 60px | Es el alto real del `.av-nav` ya portado en `globals.css`; si se cambiara el nav habría que ajustar esa resta. |

---

## What is **not** in this spec

- El componente de gamepad y su CSS (`.gp*`, `.dp*`, `.ab*`).
- Envío real del formulario de contacto.
- Datos reales detrás de las cifras del landing (ticker, top jugadores, estadísticas).
- `metadata`/SEO por ruta.
- Todo lo que SPEC 01 ya dejó fuera: mecánica de juego real, backend, créditos reales, autenticación real, leaderboard global e internacionalización.

Cada uno de estos, si se necesita, va en su propia spec.
