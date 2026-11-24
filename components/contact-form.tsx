"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendContactMessage } from "@/app/acerca-de/actions";
import { CONTACT_LIMITS, validateContact, type ContactErrors } from "@/lib/contact";

const EMPTY_FORM = { name: "", email: "", msg: "", website: "" };

type FailReason = "rate_limit" | "config" | "send_failed";

const ERROR_COPY: Record<FailReason, { line: string; fail: string }> = {
  rate_limit: {
    line: "[ERROR] Límite de envíos alcanzado.",
    fail: "> DEMASIADOS ENVÍOS DESDE ESTA CONEXIÓN. VUELVE A INTENTARLO EN UNOS MINUTOS.",
  },
  config: {
    line: "[ERROR] Servicio de correo no configurado.",
    fail: "> EL BUZÓN NO ESTÁ DISPONIBLE AHORA MISMO. TU MENSAJE NO SE HA ENVIADO.",
  },
  send_failed: {
    line: "[ERROR] Transmisión interrumpida.",
    fail: "> NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO DE NUEVO.",
  },
};

export function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [failed, setFailed] = useState<FailReason | null>(null);
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  const triggerShake = () => {
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 400);
  };

  // Al escribir, se borra el error de ese campo: el mensaje antiguo ya no describe
  // lo que hay en el input.
  const update = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (field in prev ? { ...prev, [field]: undefined } : prev));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const localErrors = validateContact(form);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      triggerShake();
      return;
    }

    setErrors({});
    startTransition(async () => {
      const result = await sendContactMessage(form);
      if (result.ok) {
        setSent(form.name.trim());
        return;
      }
      if (result.reason === "validation") {
        setErrors(result.errors);
        triggerShake();
        return;
      }
      setFailed(result.reason);
    });
  };

  const reset = () => {
    setSent(null);
    setFailed(null);
    setErrors({});
    setForm(EMPTY_FORM);
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit} noValidate>
      {sent ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={reset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : failed ? (
        <div className="terminal-success error">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // ERROR</span>
          </div>
          <div className="term-body">
            <div className="line err">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line err">{ERROR_COPY[failed].line}</div>
            <div className="line fail">
              {ERROR_COPY[failed].fail}
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={() => setFailed(null)}>
                REINTENTAR
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="px_kai"
              maxLength={CONTACT_LIMITS.nameMax}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
            />
            {errors.name && (
              <span className="field-error" id="contact-name-error">
                {errors.name}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="jugador@vault.gg"
              maxLength={CONTACT_LIMITS.emailMax}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
            />
            {errors.email && (
              <span className="field-error" id="contact-email-error">
                {errors.email}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              rows={5}
              value={form.msg}
              onChange={(e) => update("msg", e.target.value)}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={CONTACT_LIMITS.msgMax}
              aria-invalid={Boolean(errors.msg)}
              aria-describedby={errors.msg ? "contact-msg-error" : undefined}
            ></textarea>
            {errors.msg && (
              <span className="field-error" id="contact-msg-error">
                {errors.msg}
              </span>
            )}
          </div>

          {/* Honeypot: fuera de pantalla, sin foco ni lectura. Si llega lleno, el
              Server Action responde éxito y no envía nada. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">No rellenes este campo</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
          </div>

          <button
            className="btn xl press"
            type="submit"
            disabled={pending}
            style={{ width: "100%", opacity: pending ? 0.6 : 1 }}
          >
            {pending ? "ENVIANDO…" : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
