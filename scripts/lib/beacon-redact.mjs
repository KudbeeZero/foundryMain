// scripts/lib/beacon-redact.mjs — client-side redaction for the Claude Code →
// Beacon publishers (ROADMAP F5/F6/F7). Mirrors the server's sanitizeBeaconEvent
// (packages/shared/src/beacon.ts) so secrets are scrubbed *before* they leave the
// dev box, not only on arrival. The receiver re-redacts regardless — this is
// defense-in-depth, and the primary rule is: never collect secrets in the first
// place (no prompt bodies, no env/API keys, summaries not raw output).

const REDACTED = "«redacted»";

// Well-known secret shapes (longer/more specific first).
const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._\-]+/gi,
  /\bsk-[A-Za-z0-9._\-]{8,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9._\-]{20,}/g,
  /\b[A-Za-z0-9+/]{40}\b/g,
];

// KEY=value / SECRET: value / TOKEN=value / PASSWORD=value — keep the key, drop value.
const ENV_PAIR_PATTERN =
  /\b([A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD)[A-Z0-9_]*)\s*[=:]\s*\S+/gi;

// Keys whose value is always dropped, regardless of shape.
const SENSITIVE_KEY_PATTERN =
  /(key|secret|token|password|passwd|pwd|authorization|cookie|credential|prompt)/i;

// Benign telemetry keys the Deck shows verbatim ("tokens" contains "token").
const SAFE_METADATA_KEYS = new Set(["tokens"]);

export function redactText(input) {
  if (typeof input !== "string") return input;
  let out = input.replace(ENV_PAIR_PATTERN, (_m, key) => `${key}=${REDACTED}`);
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, REDACTED);
  return out;
}

function redactValue(value, keyIsSensitive) {
  if (keyIsSensitive) return REDACTED;
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, false));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const sensitive = !SAFE_METADATA_KEYS.has(k) && SENSITIVE_KEY_PATTERN.test(k);
      out[k] = redactValue(v, sensitive);
    }
    return out;
  }
  return value;
}

export function redactMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  return redactValue(metadata, false);
}

// A short, redacted, single-line summary of a value — never the raw blob.
export function summarize(value, max = 140) {
  let s;
  if (value == null) s = "";
  else if (typeof value === "string") s = value;
  else {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  s = redactText(s).replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
