# SPEC 03 — Envío de correo del formulario de contacto

> **Status:** implemented
> **Depends on:** SPEC 02
> **Date:** 2026-11-24
> **Objective:** Hacer que el formulario de `/acerca-de` envíe el mensaje de verdad a un buzón fijo mediante Resend desde un Server Action, con validación real, honeypot, límite por IP y una terminal de error cuando el envío falla.

---

## Por qué existe esta spec

La SPEC 02 portó el formulario de contacto calcado del original: valida que los campos no estén vacíos, dispara `shake` y, si pasa, reemplaza el formulario por la terminal `VAULT-OS` de éxito. Ese éxito es falso: no hay destino, no se envía nada y el mensaje se pierde. La propia SPEC 02 dejó "envío real del formulario de contacto" explícitamente fuera de alcance. Esta spec cierra ese hueco.

Que el envío sea real cambia dos decisiones de la SPEC 02. La primera es la validación: "solo campo no vacío" era aceptable cuando nada salía del navegador, pero un buzón real recibe lo que le manden, así que esta spec reabre esa decisión y añade formato de correo y límites de longitud. La segunda es el estado de error: hasta ahora el formulario no podía fallar, y ahora sí.

Es también el primer código de servidor del proyecto. SPEC 01 y 02 no tienen backend: `av_user` y `av_scores` viven en `localStorage` y todas las páginas son estáticas. Aquí aparecen la primera variable de entorno, la primera dependencia de terceros y el primer Server Action.

---

## Scope

**In:**

- Dependencia `resend` y Server Action `sendContactMessage` en `app/acerca-de/actions.ts` que envía el mensaje con la API de Resend.
- Correo en texto plano a un buzón fijo (`CONTACT_TO_EMAIL`), remitente configurable (`CONTACT_FROM_EMAIL`, por defecto el dominio de pruebas `onboarding@resend.dev`) y `reply-to` con el correo del visitante.
- Validación compartida en `lib/contact.ts`, ejecutada en el cliente antes de enviar y **otra vez** en el Server Action: campos no vacíos, formato de correo, nombre ≤ 80 caracteres y mensaje entre 10 y 2.000.
- Mensajes de error por campo bajo cada `input`/`textarea`, además de la animación `shake` que ya existe.
- Campo honeypot oculto (`website`): si llega con contenido, el Server Action responde éxito y no envía nada.
- Límite de 3 envíos por IP cada 10 minutos, en un `Map` en memoria del proceso.
- Estado de envío en el botón: `ENVIANDO…` y deshabilitado mientras el Server Action está en vuelo, con `useTransition`.
- Variante de error de la terminal `VAULT-OS`: mismo marco en magenta, líneas `[ERROR]` y botón `REINTENTAR` que vuelve al formulario **conservando lo escrito**.
- Fallo explícito cuando falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`: se registra en el log del servidor y el usuario ve la terminal de error.
- `.env.example` con las tres variables documentadas y la excepción correspondiente en `.gitignore`.
- CSS nuevo en `app/globals.css` para la terminal de error, el error por campo y el honeypot.

**Out of scope (para futuras specs):**

- Correo de confirmación al visitante.
- Plantilla HTML del correo: va en texto plano.
- Guardar los mensajes en base de datos, archivo o cualquier almacenamiento.
- Captcha (Turnstile, hCaptcha) y límite de envíos persistente o compartido entre instancias.
- Verificar un dominio propio en Resend y los registros DNS que eso exige.
- Adjuntos, campo de asunto y selector de motivo del mensaje.
- Reutilizar el envío desde otros formularios o exponerlo como endpoint HTTP público.
- Internacionalización de los mensajes de error: van en español, como el resto del sitio.
- Tests automatizados (el repo no tiene suite configurada).

---

## Data model

No se introduce persistencia. Los tipos nuevos viven en `lib/contact.ts` y describen el intercambio entre formulario y Server Action.

```ts
// lib/contact.ts

export interface ContactInput {
  name: string;
  email: string;
  msg: string;
  website: string; // honeypot: siempre vacío si lo envía una persona
}

// clave de campo → mensaje en español, solo los campos con error
export type ContactErrors = Partial<Record<"name" | "email" | "msg", string>>;

export type ContactResult =
  | { ok: true }
  | { ok: false; reason: "validation"; errors: ContactErrors }
  | { ok: false; reason: "rate_limit" | "config" | "send_failed" };

export const CONTACT_LIMITS = {
  nameMax: 80,
  emailMax: 254,
  msgMin: 10,
  msgMax: 2000,
} as const;

export function validateContact(input: ContactInput): ContactErrors;
```

Reglas de `validateContact`, aplicadas sobre los valores con `trim()`:

- `name`: no vacío y ≤ `nameMax`.
- `email`: no vacío, ≤ `emailMax` y casa con `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- `msg`: longitud entre `msgMin` y `msgMax`.
- `website` no se valida aquí: lo revisa el Server Action por separado, porque un honeypot lleno no es un error del usuario.

Variables de entorno (ninguna con prefijo `NEXT_PUBLIC_`, todas de servidor):

| Variable | Obligatoria | Por defecto |
| --- | --- | --- |
| `RESEND_API_KEY` | sí | — |
| `CONTACT_TO_EMAIL` | sí | — |
| `CONTACT_FROM_EMAIL` | no | `onboarding@resend.dev` |

Límite por IP: `Map<string, number[]>` a nivel de módulo, con los timestamps de los envíos de cada IP. Ventana de 10 minutos, máximo 3. Las entradas con todos los timestamps caducados se borran al consultarlas.

Formato del correo:

- Asunto: `[Arcade Vault] Mensaje de <nombre>`
- Cuerpo (`text`): líneas `Nombre:`, `Correo:`, separador, y el mensaje tal cual.
- `replyTo`: el correo del visitante.

---

## Implementation plan

1. Instalar `resend` (`npm install resend`), crear `.env.example` con las tres variables y un comentario por cada una, y añadir `!.env.example` a `.gitignore` justo debajo de `.env*` para que el ejemplo sí se versione. Crear el `.env.local` local con la key real. Verificación manual: `npm run dev` arranca y `git status` muestra `.env.example` como archivo nuevo y **no** muestra `.env.local`.
2. Crear `lib/contact.ts` con `ContactInput`, `ContactErrors`, `ContactResult`, `CONTACT_LIMITS` y `validateContact`. Módulo puro, sin imports: lo consumen cliente y servidor. Verificación manual: `npm run build` pasa.
3. Añadir a `app/globals.css`, al final del bloque de `ABOUT PAGE`, tres cosas: `.terminal-success.error` (borde y sombra con `var(--magenta)` en lugar de `var(--green)`) junto a `.term-body .line.err` y `.term-body .fail` para las líneas de fallo; `.field-error` (texto en `var(--magenta)`, `font-size: 10px`, `var(--mono)`) para el error por campo; y `.hp-field` con `position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;` más `aria-hidden` y `tabIndex={-1}` en el markup, para que el honeypot no sea alcanzable por teclado ni por lector de pantalla. Verificación manual: `/acerca-de` se ve igual que antes (las tres reglas son nuevas y nada las usa todavía).
4. Crear `app/acerca-de/actions.ts` con `"use server"` y la función `sendContactMessage(input: ContactInput): Promise<ContactResult>`, en este orden:
   1. Si `input.website.trim()` no está vacío, devolver `{ ok: true }` sin enviar nada.
   2. `validateContact(input)`; si hay errores, devolver `{ ok: false, reason: "validation", errors }`.
   3. Resolver la IP con `await headers()` leyendo `x-forwarded-for` (primer valor) y, en su defecto, `x-real-ip`; sin ninguna de las dos, usar la clave `"local"`. Si la IP ya tiene 3 envíos en los últimos 10 minutos, devolver `{ ok: false, reason: "rate_limit" }`.
   4. Si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL`, registrar `console.error` nombrando la variable ausente y devolver `{ ok: false, reason: "config" }`.
   5. Enviar con `resend.emails.send({ from, to, replyTo, subject, text })`. Si la llamada lanza o devuelve `error`, registrar el error en el servidor y devolver `{ ok: false, reason: "send_failed" }`.
   6. En el éxito, registrar el timestamp en el `Map` y devolver `{ ok: true }`.

   Ningún mensaje del proveedor ni valor de entorno viaja en la respuesta: el cliente solo recibe `reason`. Verificación manual: con la key real en `.env.local`, enviar el formulario y ver el correo en el buzón de `CONTACT_TO_EMAIL`.
5. Reescribir `components/contact-form.tsx` sobre el estado que ya tiene:
   - Añadir `website` al estado del formulario y su `input` oculto con `className="hp-field"`.
   - Estado `errors: ContactErrors` y `failed: boolean`; `useTransition` para el `pending`.
   - En `onSubmit`: `validateContact` en el cliente; si hay errores, pintarlos bajo cada campo, disparar `shake` y no llamar al servidor. Si no hay, `startTransition` con `await sendContactMessage(form)`.
   - Según el resultado: `ok` → `setSent(nombre)` como hoy; `validation` → pintar `errors` y `shake`; `rate_limit`, `config` y `send_failed` → `setFailed(true)`.
   - Botón: `disabled={pending}` y texto `ENVIANDO…` mientras está en vuelo.
   - Terminal de error: `.terminal-success.error`, título `VAULT-OS // ERROR`, líneas `[ERROR]` con el texto propio de cada `reason` (demasiados envíos / servicio no configurado / fallo de transmisión) y botón `REINTENTAR` que hace `setFailed(false)` **sin tocar `form`**.
   - La terminal de éxito y el botón `ENVIAR OTRO MENSAJE` se quedan tal cual, salvo que el reset también limpie `website` y `errors`.

   Verificación manual: recorrer los casos de aceptación de abajo.

---

## Acceptance criteria

- [ ] Enviar el formulario con nombre, un correo válido y un mensaje de ≥10 caracteres entrega un correo en el buzón de `CONTACT_TO_EMAIL`, con asunto `[Arcade Vault] Mensaje de <nombre>` y el nombre, el correo y el mensaje en el cuerpo.
- [ ] Responder a ese correo desde el cliente de correo dirige la respuesta al correo que escribió el visitante, no al remitente del sistema.
- [ ] Tras un envío correcto, el formulario se reemplaza por la terminal `VAULT-OS` verde con el nombre en mayúsculas, igual que antes de esta spec.
- [ ] Mientras el envío está en vuelo, el botón muestra `ENVIANDO…` y está deshabilitado; pulsarlo repetidamente no dispara más de un envío.
- [ ] Con algún campo vacío no se llama al servidor: el formulario dispara `shake` y muestra el error bajo el campo en cuestión.
- [ ] Con `correo` igual a `hola@` o `hola.com` el envío se bloquea y aparece un error de formato bajo ese campo.
- [ ] Con un mensaje de menos de 10 caracteres el envío se bloquea y aparece el error bajo el `textarea`.
- [ ] Un mensaje de más de 2.000 caracteres se bloquea con su error; uno de exactamente 2.000 se envía.
- [ ] Invocar el Server Action directamente con datos inválidos (sin pasar por el formulario) devuelve `{ ok: false, reason: "validation" }` y no envía ningún correo.
- [ ] Rellenando el campo honeypot `website` por consola antes de enviar, el formulario muestra la terminal de éxito y **no** llega ningún correo al buzón.
- [ ] El campo honeypot no es visible, no recibe foco al tabular por el formulario y no lo anuncia un lector de pantalla.
- [ ] Al cuarto envío válido desde la misma IP en menos de 10 minutos aparece la terminal de error con el motivo de demasiados envíos; pasados los 10 minutos vuelve a funcionar.
- [ ] Quitando `RESEND_API_KEY` de `.env.local` y reiniciando el servidor, el envío muestra la terminal de error en magenta y el log del servidor nombra la variable ausente.
- [ ] Con una `RESEND_API_KEY` inválida, el envío muestra la terminal de error y la respuesta que recibe el navegador no contiene la key, el correo de destino ni el mensaje del proveedor.
- [ ] `REINTENTAR` en la terminal de error vuelve al formulario con los tres campos tal como los había escrito el usuario.
- [ ] `ENVIAR OTRO MENSAJE` en la terminal de éxito vuelve al formulario con los tres campos vacíos.
- [ ] `/acerca-de` sigue renderizando el hero, los 3 destacados y el divider de píxeles sin cambios visuales, y el resto de pantallas de SPEC 01 y 02 no se ven afectadas.
- [ ] `git status` no muestra `.env.local` como archivo sin seguimiento, y `.env.example` sí está versionado.
- [ ] `npm run build` y `npx eslint app lib components` terminan sin errores de TypeScript ni de lint.

---

## Decisions

- **Sí:** Resend como proveedor. Una sola key en entorno, SDK oficial y 3.000 correos al mes gratis. SMTP con Nodemailer exigiría cuatro variables y una contraseña de aplicación, y es lo primero que se rompe en despliegues serverless.
- **No:** Formspree, Web3Forms o similar. Evitan escribir servidor, pero el mensaje pasa por un tercero y se pierde el control del formato, del `reply-to` y del honeypot.
- **Sí:** Server Action en `app/acerca-de/actions.ts`. Es lo nativo del App Router, no publica un endpoint que haya que proteger aparte y el estado de carga vive en el mismo componente vía `useTransition`. Si algún día hay un segundo formulario, el Server Action se extrae a `lib/`; mientras haya un solo consumidor, vive junto a su página.
- **No:** Route Handler en `app/api/contact/route.ts`. Un endpoint público añade superficie de abuso para un solo formulario, y no se gana nada reutilizable hoy.
- **Sí:** validación compartida en `lib/contact.ts`, corriendo en los dos lados. El cliente da la respuesta inmediata; el servidor es el que manda, porque un Server Action se puede invocar sin pasar por el formulario.
- **Sí:** reabrir la decisión de la SPEC 02 de no validar formato de correo. Esa decisión era correcta mientras nada se enviaba. Ahora un correo mal escrito significa un mensaje al que nadie puede responder.
- **Sí:** honeypot `website` que devuelve **éxito** cuando viene lleno. Un bot que recibe un error reintenta o ajusta; uno que recibe éxito se marcha. El campo se llama `website` porque es el nombre que los bots esperan rellenar.
- **Sí:** límite de 3 por IP cada 10 minutos en un `Map` en memoria. Cero dependencias y frena el abuso manual. Se pierde al reiniciar el proceso y no se comparte entre instancias: aceptable para un formulario de contacto, y el día que no lo sea, será su propia spec con Redis o similar.
- **No:** captcha. Añade una cuenta de terceros, un script externo y una key nueva para un volumen que el honeypot más el límite por IP cubren de sobra.
- **Sí:** texto plano en el correo. Legible en cualquier cliente, imposible que se rompa y sin plantilla que mantener. Un correo HTML obligaría a generar además la versión texto.
- **Sí:** `onboarding@resend.dev` como remitente por defecto, configurable por `CONTACT_FROM_EMAIL`. Funciona sin verificar DNS, y Resend solo entrega a la dirección de la cuenta con ese remitente: suficiente para validar el flujo completo. El día que haya dominio propio, se cambia una variable sin tocar código.
- **No:** verificar un dominio propio en esta spec. Depende de registros DNS externos al repo y bloquearía la implementación por algo que no es código.
- **Sí:** terminal de error en magenta reusando `.terminal-success` con una clase modificadora. El lenguaje visual ya existe, `--magenta` ya está en el tema y son pocas líneas de CSS.
- **Sí:** `REINTENTAR` conserva lo escrito y `ENVIAR OTRO MENSAJE` lo limpia. En el fallo el usuario no hizo nada mal y perder su texto sería hostil; en el éxito el mensaje ya se fue.
- **No:** correo de confirmación al visitante. Duplica el contenido que hay que mantener y, con el remitente de pruebas, es lo primero que cae en spam.
- **No:** guardar los mensajes. El proyecto no tiene ninguna persistencia de servidor; elegir base de datos aquí abriría un tema entero por un formulario. El buzón es el registro.
- **Sí:** fallar explícito cuando faltan las variables de entorno, en lugar de un modo simulado en desarrollo. Un éxito falso es exactamente el problema que esta spec viene a arreglar.
- **No:** validar las variables al cargar el módulo y romper el arranque. Impediría levantar el proyecto a quien solo quiere ver la UI, y eso es la mayoría de las sesiones de trabajo en este repo.
- **Sí:** el cliente recibe solo un código (`reason`), nunca el mensaje del proveedor. Los errores de Resend pueden incluir detalles de la cuenta; el detalle va al log del servidor.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Con el remitente de pruebas, Resend solo entrega a la dirección de la cuenta: un `CONTACT_TO_EMAIL` distinto falla sin que sea un error de código | Documentado en `.env.example`. El criterio de aceptación verifica la llegada del correo, que es donde esto aparece. El cambio es una variable, no código. |
| `console.error` en el Server Action podría volcar al log un error del proveedor que contenga datos de la cuenta | Registrar solo `error.message`/`error.name`, nunca el objeto de respuesta completo ni la key. |
| El `Map` del límite por IP crece sin techo en un proceso de larga vida | Al consultar una IP se descartan sus timestamps caducados y, si no queda ninguno, se borra la entrada. Son como mucho 3 números por IP activa. |
| Detrás de un proxy, todas las peticiones pueden llegar con la misma IP y compartir el límite | Se lee `x-forwarded-for` (primer valor) antes que `x-real-ip`, que es lo que ponen Vercel y los proxies habituales. En local, sin ninguna de las dos cabeceras, la clave es `"local"`. |
| Las flags experimentales `cacheComponents` y `partialPrefetching` pueden interferir con el primer Server Action del proyecto | `app/acerca-de/page.tsx` sigue siendo server component estático y toda la interacción queda dentro de `ContactForm`, que ya es `"use client"`. Ante cualquier rareza, consultar `node_modules/next/dist/docs/` para la versión instalada antes de asumir comportamiento. |
| `.gitignore` tiene `.env*`, que también ignora `.env.example` | El paso 1 añade `!.env.example` y el criterio de aceptación lo verifica con `git status`. |
| El nombre del visitante va al asunto del correo sin escapar | El asunto es texto plano y `resend` lo codifica; se recorta el nombre a 80 caracteres en la validación, así que no hay forma de inyectar cabeceras. |
| `npm run lint` a secas no sirve como criterio: `references/templates/*.jsx` arrastra 25 problemas (`React is not defined`) previos a esta spec, y también falla en `main` | El criterio de aceptación acota el lint a `app`, `lib` y `components`, que es lo que esta spec toca. Excluir `references/` de `eslint.config.mjs` queda para su propia spec. |

---

## What is **not** in this spec

- Correo de confirmación al visitante y plantilla HTML del correo.
- Guardar los mensajes en base de datos o en archivo.
- Captcha y límite de envíos persistente o compartido entre instancias.
- Verificación del dominio propio en Resend y sus registros DNS.
- Adjuntos, asunto editable y selector de motivo.
- Exponer el envío como endpoint HTTP reutilizable.
- Todo lo que SPEC 01 y 02 ya dejaron fuera: mecánica de juego real, backend de juegos, créditos reales, autenticación real, leaderboard global, `metadata` por ruta e internacionalización.

Cada uno de estos, si se necesita, va en su propia spec.
