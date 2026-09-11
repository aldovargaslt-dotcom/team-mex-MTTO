# Andon notify — Evolution (lab only)

Optional outbound adapter behind `NotifyPort`. Default is **noop**. This is **not** production WhatsApp.

Evolution API talks to WhatsApp via **Baileys** (unofficial). That can violate WhatsApp Terms of Service and get the number banned. Use a **throwaway number**, a throwaway group (`…@g.us`), and a disposable Evolution instance. Do not put a staff or customer number here.

| Env                     | Role                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `ANDON_NOTIFY_PROVIDER` | `noop` (default) or `evolution`                             |
| `EVOLUTION_BASE_URL`    | Evolution server origin (no trailing path required)         |
| `EVOLUTION_API_KEY`     | Evolution `apikey` header                                   |
| `EVOLUTION_INSTANCE`    | Instance name in `POST /message/sendText/{instance}`        |
| `ANDON_WA_GROUP_JID`    | Group JID; `number` in the JSON body. Must end with `@g.us` |

When `ANDON_NOTIFY_PROVIDER=evolution` and those values are set, Andon still persists `whatsapp_salidas` (existing stub) and then POSTs `{ number, text }` to the group. HTTP errors are logged and **do not** block opening an aviso.

When the provider is `noop` (or Evolution env is incomplete), behavior stays the Andon v0 default from PR #5 (stub/log; Twilio only if `ANDON_NOTIFY_PROVIDER=twilio`).
