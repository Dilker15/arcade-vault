// Validación del formulario de contacto de /acerca-de.
// Módulo puro y sin imports: lo consumen el cliente (components/contact-form.tsx)
// y el servidor (app/acerca-de/actions.ts), que valida otra vez porque el
// Server Action se puede invocar sin pasar por el formulario.

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "Escribe tu nombre.";
  } else if (name.length > CONTACT_LIMITS.nameMax) {
    errors.name = `Máximo ${CONTACT_LIMITS.nameMax} caracteres.`;
  }

  const email = input.email.trim();
  if (!email) {
    errors.email = "Escribe tu correo electrónico.";
  } else if (email.length > CONTACT_LIMITS.emailMax) {
    errors.email = `Máximo ${CONTACT_LIMITS.emailMax} caracteres.`;
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Ese correo no tiene un formato válido.";
  }

  const msg = input.msg.trim();
  if (!msg) {
    errors.msg = "Escribe tu mensaje.";
  } else if (msg.length < CONTACT_LIMITS.msgMin) {
    errors.msg = `Cuéntanos algo más: mínimo ${CONTACT_LIMITS.msgMin} caracteres.`;
  } else if (msg.length > CONTACT_LIMITS.msgMax) {
    errors.msg = `Máximo ${CONTACT_LIMITS.msgMax} caracteres.`;
  }

  return errors;
}
