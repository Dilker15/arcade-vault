#!/usr/bin/env bash
# PostToolUse hook: formatea archivos de React (.tsx/.jsx) y Markdown (.md/.mdx)
# despues de que Claude los escribe o edita.
#   - React:    eslint --fix  y luego  prettier --write
#   - Markdown: prettier --write
# Nunca bloquea el turno: si algo falla, solo reporta via systemMessage.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ESLINT="$ROOT/node_modules/.bin/eslint"
PRETTIER="$ROOT/node_modules/.bin/prettier"

file="$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')"
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

run_eslint=0
case "$file" in
  *.tsx | *.jsx) run_eslint=1 ;;
  *.md | *.mdx) run_eslint=0 ;;
  *) exit 0 ;;
esac

notes=""

if [ "$run_eslint" = 1 ] && [ -x "$ESLINT" ]; then
  if ! eslint_out="$("$ESLINT" --fix "$file" 2>&1)"; then
    notes="ESLint reporto problemas no auto-corregibles:"$'\n'"$eslint_out"
  fi
fi

if [ -x "$PRETTIER" ]; then
  if ! prettier_out="$("$PRETTIER" --write --log-level warn "$file" 2>&1)"; then
    notes="${notes:+$notes$'\n'}Prettier fallo:"$'\n'"$prettier_out"
  fi
fi

if [ -n "$notes" ]; then
  jq -n --arg m "${notes:0:4000}" '{systemMessage: $m}'
fi

exit 0
