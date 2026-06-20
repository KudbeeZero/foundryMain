# Foundry Command Deck — Design System

Owned by **E09 (Riya)**. The Deck has one visual language: a premium dark
command-center where **gradients are the signature** and **hexagons replace
circles**. Components reference tokens only — never inline hex.

## Color system

All colors live in `apps/web/src/styles/tokens.css` and are resolved through
helpers in `apps/web/src/lib/format.ts`. Never hard-code a color in a component.

### Ramps

| Token group | What it is | Example |
|---|---|---|
| `--grad-brand` | Forge identity, molten orange → magenta | brand flourishes |
| `--grad-st-<status>` | One 2-stop ramp per Beacon status | sigils, pips, panels |
| `--grad-e01` … `--grad-e10` | One accent gradient per employee | sigils, panel spines |
| `--e01` … `--e10` | Solid accent per employee | borders, text accents |

### Helpers (`lib/format.ts`)

- `statusColor(status)` → solid status var (glow, text).
- `statusGradient(status)` → status ramp (fills).
- `employeeGradient(id)` / `employeeAccent(id)` → per-employee ramp / solid, keyed
  off the agent id (`E01`…`E10`), falling back to the brand ramp.
- `isLiveStatus(status)` → animate while `running | thinking | editing`.
- `initials(name)` → two-letter monogram for a Sigil.

## Objects (no more circles)

### Forge Sigil — `components/Sigil.tsx`

The signature employee token: a **beveled hexagon** filled with the employee's
accent gradient, wrapped in a status-colored ring that glows while they're live.
Replaces avatar/status circles.

```tsx
<Sigil id="E01" name="Maya" status="running" size={46} />
```

### StatusPip — `components/StatusPip.tsx`

A small **gradient hexagon** that replaces the old round status dot. Pulses on
live statuses. Used inside `StatusBadge` and the `BeaconPill`.

```tsx
<StatusPip status="thinking" size={9} />
```

## Gradient color panels

Cards carry the employee gradient as a faint full-bleed wash (`::before`,
~10% opacity) plus a bright **accent spine** (`::after`, the gradient) and a
status-colored glow. Set two custom properties on the card and the CSS does the
rest:

```tsx
<article style={{ "--g": employeeGradient(e.id), "--ringc": statusColor(e.status) }} />
```

Applied in `TeamDashboard.module.css` and `RosterBoard.module.css`.

## Team Dashboard — `components/TeamDashboard.tsx`

The "log on and see each other's jobs" surface, mounted as the hero panel under
the Beacon pill in `App.tsx`. One gradient panel per employee showing the Sigil,
name/role/level, live status, the **current job** (work-order title, or
"Available"), the active tool, and last-activity time. Driven entirely by
`selectEmployees(state)` — real Beacon data, no separate store.

## Rules

1. **Tokens only.** No inline hex in components; add a token if one is missing.
2. **Hexagons, not circles**, for entity/status marks.
3. **Gradients carry meaning** — status ramps for state, employee ramps for identity.
4. **Glow = live.** Pulsing/ring glow is reserved for active statuses.
