# Andon WhatsApp ops checklist v0

Estado: aceptado (PR #5). Outbound a **teléfonos ops**, no a un grupo WhatsApp.
MUST 1–3 (A1 skip, filtros, Enterado 44px) no dependen de un envío live.

## Must

- [x] Fan-out Twilio sobre `ANDON_OPS_PHONES` (E.164 separados por coma). Un POST `Messages.json` por número. **No** JID de grupo / `@g.us`.
- [x] Env requerido (vacío → stub/noop, sin secretos en repo):
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_FROM`
  - `ANDON_OPS_PHONES`
- [x] Env opcional: `TWILIO_STATUS_CALLBACK_URL`, `ANDON_WA_TEMPLATE_AVISO`, `ANDON_WA_TEMPLATE_REMIND`
- [x] Puerto `AndonNotifier` (`WhatsAppPort`). El motor (`andon-engine`) no importa Twilio ni el SDK.
- [x] Adaptador HTTP plano — **sin** `import 'twilio'`. SDK, si existiera, solo viviría en el adapter; v0 no lo usa.
- [x] Sin inbound WhatsApp / sin ack. Enterado es in-app (`POST /andon/avisos/:id/enterado`).
- [x] Copy UI/API: **teléfonos ops**, no “grupo WhatsApp”.

## Don’t

- Hardcodear SID, token o teléfonos.
- Prometer envío live si el env está incompleto (default persist/log).
- Bloquear apertura de aviso Andon si Twilio responde 5xx.
- Meta Groups / grupo WA como destino v0.

## Dónde

| Pieza | Archivo |
|--------|---------|
| Puerto | `api/src/andon/ports.ts` (`AndonNotifier`) |
| Factory (stub vs Twilio) | `api/src/andon/andon-notifier.factory.ts` |
| Adapter | `api/src/andon/twilio-whatsapp.adapter.ts` |
| Tests HTTP fake | `api/src/andon/twilio-whatsapp.adapter.spec.ts` |
| Env documentado | `api/.env.example` |
