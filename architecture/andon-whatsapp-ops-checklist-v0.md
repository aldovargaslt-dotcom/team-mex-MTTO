# Andon WhatsApp ops checklist v0

Estado: **Twilio aparcado** (sin demo gratis). Default outbound = **noop/log**.
MUST 1–3 no dependen de WhatsApp. Enterado es in-app.

## Must

- [x] Puerto `AndonNotifier` / `NotifyPort` (`WhatsAppPort`). El motor no importa adapters.
- [x] Default **noop/log** (stub). No promete envío live ni grupo WA.
- [x] Twilio **opcional y aparcado**: solo si `ANDON_NOTIFY_PROVIDER=twilio` **y** SID/token/from/`ANDON_OPS_PHONES`. HTTP plano, sin SDK.
- [x] Fan-out a teléfonos ops E.164 si se desaparca — **no** grupo `@g.us`.
- [x] Env opcional (apagado): `TWILIO_STATUS_CALLBACK_URL`, `ANDON_WA_TEMPLATE_AVISO`, `ANDON_WA_TEMPLATE_REMIND`
- [x] Sin inbound WhatsApp / sin ack. `POST /andon/avisos/:id/enterado`.
- [x] Copy: Enterado in-app; no “grupo WhatsApp”, no “Twilio envía”.

## Don’t

- Activar Twilio por el solo hecho de tener credenciales en env.
- Prometer envío live / grupo WA en UI.
- Bloquear MUST 1–3 o la apertura de aviso si un adapter HTTP falla.
- Implementar Telegram/Discord hasta que Aldo elija.

## Dónde

| Pieza | Archivo |
|--------|---------|
| Puerto | `api/src/andon/ports.ts` |
| Factory (default noop) | `api/src/andon/andon-notifier.factory.ts` |
| Adapter Twilio (parked) | `api/src/andon/twilio-whatsapp.adapter.ts` |
