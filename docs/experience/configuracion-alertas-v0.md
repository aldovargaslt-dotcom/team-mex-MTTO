# Experience Context — Configuración → Alertas (v0)

**Status:** PROPOSAL (gate for PR #68 / EWO-004 merge)  
**Screen:** `/configuracion/alertas`  
**Related:** SPEC `docs/specs/alert-catalog-v0.md` (Approved) · ADR-013 · EWO-004 · UX `docs/design/ux-alert-catalog-v0.md`  
**Rule:** No Experience Context → no final UI. This artifact must be accepted before merging UI polish PR #68.

IA locked for current work: **hub remains Configuración → Alertas** (not Unidades/Stock-only). Brief `ui-alertas-copy-botones-v0` secondary CTAs elsewhere remain allowed dual entry; they do not replace this hub in this proposal.

---

## experience

```yaml
experience:
  domain: shared_alerts   # cross-cutting capability; not a confirmed BC
  subdomain: alert_catalog_configuration
  primary_role: ADMIN_DIRECTIVO
  secondary_roles: [SUPERVISOR, LOGISTICA]
  primary_task: configure_alert_types_and_thresholds
  secondary_tasks:
    - discover_which_alert_types_exist_for_my_role
    - open_threshold_editor_for_a_type
    - deactivate_or_create_type  # Admin only
  environment: workshop_office_or_desk  # not yard floor primary
  device: desktop_primary  # Admin/Flota density; Supervisor may use ~390 for MTTO list+dialog
  frequency_of_use: low_to_medium  # setup / adjust, not every-minute monitoring
  operational_criticality: medium  # wrong thresholds → noise or missed avisos; not live dispatch
```

### Answers to required questions

| # | Question | Answer | Evidence / UNKNOWN |
|---|----------|--------|--------------------|
| 1 | Domain | Shared **Alert Catalog** configuration spanning Mantenimiento family (Andon, Inventario, Salud) and Flota family (sin-regreso). Not the Andon board, not the campanita inbox. | SPEC-ALERT-CATALOG-v0, ADR-013, GLOSSARY |
| 2 | Primary user | `ADMIN_DIRECTIVO` — owns type create/deactivate and override on all families | SPEC actors, EWO-004 |
| 3 | Secondary users | `SUPERVISOR` — MTTO family thresholds only; `LOGISTICA` — Flota family thresholds only | SPEC swimlane |
| 4 | Primary job on screen | See which alert **types** I can configure, then open the right type to set when the system should avisarme | SPEC goals, UX purpose |
| 5 | Decisions | Which type to open? Are thresholds still right? (Admin) Should this type be active? Should a new type exist? | Derived |
| 6 | Actions | Scan list → open type → edit thresholds → save; Admin: Nueva alerta / Desactivar | SPEC + EWO-004 |
| 7 | Info for decisions | Product name of type; family (Mantenimiento/Flota); active vs inactive (Admin); current threshold values in dialog | Hierarchy below |
| 8 | Secondary info | Owning module label; stable code; “edited in module vs catalog” mechanics | P2/P3 — audit said over-exposed |
| 9 | Operational context | Desk/admin configuration after seed; not live yard monitoring. Campanita delivery is a different surface (`/notificaciones`) | PRODUCT / GLOSSARY |
| 10 | Mistake impact | Too-low thresholds → alert noise; too-high / inactive → missed avisos; wrong family visibility → confusion. Need clear cancel, non-destructive defaults, Admin-only deactivate | UNKNOWN: exact recovery SOP / who gets paged |
| 11 | Frequency | Occasional (setup, policy change), not every shift start | UNKNOWN: real field cadence |
| 12 | Mode | **Configuring** (primary); light **administering** for Admin create/deactivate — not monitoring/executing | Task type |

---

## Domain

```yaml
domain:
  id: shared_alerts
  name: Alertas (catálogo)
  purpose: >-
    Single product place to see and configure alert types that feed the
    campanita, without merging Andon / Inventario / Salud / Flota emitters.
```

Domain UX notes:

- Product language: **Alertas** (config + inbox label).
- Top-nav **Alerta** remains Andon **board** (ops) — different task/surface.
- Emitters stay module-owned (ADR-013 façade).
- Must not override global Team Mex design system without flagged conflict.

---

## Roles & capabilities

```yaml
roles:
  ADMIN_DIRECTIVO:
    capabilities:
      - alerts.catalog.read_all
      - alerts.catalog.create_type
      - alerts.catalog.deactivate_type
      - alerts.thresholds.edit_all_families
    restrictions:
      - must_not_merge_emitter_schemas
      - must_not_configure_whatsapp_in_this_cut
  SUPERVISOR:
    capabilities:
      - alerts.catalog.read_mtto_family
      - alerts.thresholds.edit_andon
      - alerts.thresholds.edit_inventario_min_qty  # dual editor allowed
      - alerts.thresholds.edit_salud
    restrictions:
      - alerts.catalog.create_type
      - alerts.catalog.deactivate_type
      - alerts.thresholds.edit_flota
  LOGISTICA:
    capabilities:
      - alerts.catalog.read_flota_family
      - alerts.thresholds.edit_sin_regreso
    restrictions:
      - alerts.catalog.create_type
      - alerts.catalog.deactivate_type
      - alerts.thresholds.edit_mtto_family
```

UX derives from capabilities (what you can edit), not from showing every DB column.

---

## Task

```yaml
task:
  id: configure_alert_types_and_thresholds
  objective: >-
    Identify the alert type I am responsible for and set when the system
    should notify via campanita — without learning three product names
    (Andon / alertas schema / notifications).
  type: configuring
  not:
    - monitoring_live_exceptions  # that is Inicio / Andon board / campanita
    - executing_visit_wo
    - analyzing_fleet_kpi
```

---

## Decisions

1. Which alert types exist for **my** role?
2. Which type needs attention / adjustment now?
3. What thresholds (km, days, stock remaining, health, hours sin regreso) should apply?
4. (Admin) Should this type stay active? Should a new type be created?

---

## Information hierarchy

```yaml
information_priority:
  P0:
    - alert_type_product_name          # e.g. Mantenimiento vencido
    - role_visible_type_list           # swimlane result
    - threshold_values_in_editor       # when dialog open
  P1:
    - family_mantenimiento_vs_flota    # if shown, muted
    - inactive_state_for_admin         # only when inactive
    - primary_cta_nueva_alerta         # Admin list only
  P2:
    - owning_module_label              # optional muted
    - lede_explaining_campanita_link
  P3:
    - stable_code                      # MTTO_VENCIDO — mono muted / Admin dialog only
    - schema_or_edit_locus_mechanics   # MUST NOT be a list column
    - notify_provider_dual_stack
```

Anti-dump rule: codes, “dónde se edita”, and green Activa-on-every-row are P3/noise — EWO-004 polish targets.

---

## Decision model (this screen)

```text
1. understand_current_state  → see my types
2. identify_exception        → (Admin) inactive; (any) wrong thresholds — weak on list
3. inspect_context           → open type dialog
4. execute_action            → save thresholds / create / deactivate
5. confirm_result            → dialog close + list refresh
```

Not a live exception queue (that is Inicio / Andon / inbox).

---

## Actions

```yaml
actions:
  primary:
    Admin: Nueva alerta
    Supervisor_Logistica: open_row  # row is the action; zero orange
  secondary:
    - Guardar thresholds (outline if orange already used)
    - Cancelar
    - Desactivar / Reactivar (Admin, dangerSoft)
  out_of_scope_on_this_screen:
    - acknowledge_inbox_item
    - open_andon_board
    - register_flota_movement
```

---

## UX constraints

```yaml
ux_constraints:
  density: high
  primary_action_count: 1  # Admin list; 0 on Supervisor/Logística lists
  critical_information_above_fold: true  # type names
  progressive_disclosure: true  # thresholds in dialog; codes demoted
  minimize_navigation: true  # hub under Configuración; redirect /flota/alertas
  preserve_context: true
  menu_identity: Configuración → Alertas vs top-nav Alerta (Andon board)
  copy: taller_spanish_no_umbral_t_km_min_qty_regla
  pattern: PAGE_PATTERNS_3_list + 7_dialog
  design_system: Team_Mex_tokens_only
```

### Rule conflicts (explicit)

| Conflict | Resolution for this proposal |
|----------|------------------------------|
| Brief `ui-alertas-copy-botones-v0` prefers Configurar alertas on Unidades/Stock | Hub Configuración kept (SPEC). Dual entry OK; full brief-first rewrite **out of scope** until new decision |
| Top-nav **Alerta** vs page **Alertas** | Different surfaces; identity must be clear in chrome/lede |

---

## Anti-pattern checklist (pre-merge #68)

- [ ] No architecture column in list
- [ ] No code primacy in list scan
- [ ] No Activa green flood
- [ ] One orange Admin / zero on other roles’ lists
- [ ] No settings-sidebar SaaS chrome (subnav/breadcrumb OK)
- [ ] No Lucide-per-row
- [ ] Dialog button grammar matches design system
- [ ] Supports **configuring** task, not fake monitoring dashboard

---

## UNKNOWN / missing (do not invent)

1. Real-world frequency of threshold changes in the taller.
2. Whether Supervisors ever need read-only visibility of Flota types (currently no).
3. Operational SOP when Admin deactivates `STOCK_BAJO` but `min_qty` remains on ítems.
4. Whether Configuración will gain sibling pages (only Alertas location cue needed now).
5. Field confirmation that “Alertas” inbox label vs Andon board “Alerta” is clear to operators.

---

## Acceptance of this Experience Context

Human must mark **Accepted** before merging PR #68.  
After acceptance: re-check EWO-004 implementation against this context (UX review §14). If polish already matches, merge; if not, revise PR then merge.
