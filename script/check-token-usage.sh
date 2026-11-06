#!/usr/bin/env bash
# Fails on literal hex colors or Tailwind default-palette color classes in web/src
# outside globals.css and the allowlist. Use tokens from globals.css instead.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../web/src"
# Allowlist: JS-side color consumers that cannot read CSS variables.
ALLOW='^(\./app/globals\.css|\./app/workspace\.css|\./components/analysis/AnalysisCharts\.tsx|\./lib/maintenance-type\.ts|\./components/SignaturePad\.tsx):'
hex=$(grep -rnIE '#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b' --include=*.tsx --include=*.ts --include=*.css . | grep -vE "$ALLOW" | grep -vE '&#[0-9]|href="#|href=\{?.#|"#[a-z-]+"|`#|#[a-z][a-z-]{3,}' || true)
pal=$(grep -rnIE '(bg|text|border|ring|fill|stroke|from|to|via|divide|outline)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]{2,3}' --include=*.tsx --include=*.ts . | grep -vE "$ALLOW" || true)
if [ -n "$hex$pal" ]; then
  echo "Literal colors found; use tokens from web/src/app/globals.css:" >&2
  printf '%s\n%s\n' "$hex" "$pal" | sed '/^$/d' | cut -c1-200 >&2
  exit 1
fi
echo "token usage OK"
