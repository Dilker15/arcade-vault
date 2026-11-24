"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { validateContact, type ContactInput, type ContactResult } from "@/lib/contact";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
const DEFAULT_FROM = "onboarding@resend.dev";

// IP → timestamps de los envíos que salieron dentro de la ventana.
// Vive en el proceso: se pierde al reiniciar y no se comparte entre instancias.
const recentSends = new Map<string, number[]>();

// Devuelve los envíos vigentes de esa IP y descarta de paso los caducados,
// para que el Map no crezca sin techo en un proceso de larga vida.
function hitsInWindow(ip: string, now: number): number[] {
  const fresh = (recentSends.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length > 0) recentSends.set(ip, fresh);
  else recentSends.delete(ip);
  return fresh;
}

async function resolveIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "local";
}

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  // 1. Honeypot: el bot recibe éxito y se marcha. No se envía nada.
  if (input.website.trim()) return { ok: true };

  // 2. Validación de servidor: este Server Action se puede invocar sin el formulario.
  const errors = validateContact(input);
  if (Object.keys(errors).length > 0) return { ok: false, reason: "validation", errors };

  // 3. Límite por IP.
  const ip = await resolveIp();
  const now = Date.now();
  const hits = hitsInWindow(ip, now);
  if (hits.length >= RATE_MAX) return { ok: false, reason: "rate_limit" };

  // 4. Configuración.
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  if (!apiKey || !to) {
    const missing = !apiKey ? "RESEND_API_KEY" : "CONTACT_TO_EMAIL";
    console.error(`[contacto] falta la variable de entorno ${missing}`);
    return { ok: false, reason: "config" };
  }

  const name = input.name.trim();
  const email = input.email.trim();
  const msg = input.msg.trim();

  // 5. Envío. Al cliente solo le llega el código del fallo: el detalle va al log.
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: process.env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_FROM,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n---\n\n${msg}\n`,
    });
    if (error) {
      console.error(`[contacto] Resend rechazó el envío: ${error.name} — ${error.message}`);
      return { ok: false, reason: "send_failed" };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[contacto] fallo al enviar: ${detail}`);
    return { ok: false, reason: "send_failed" };
  }

  // 6. Solo cuentan para el límite los envíos que llegaron a salir.
  recentSends.set(ip, [...hits, now]);
  return { ok: true };
}
