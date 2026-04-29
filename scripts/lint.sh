#!/bin/bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "${PROJECT_ROOT}"

pnpm exec tsgo -p tsconfig.check.json
pnpm exec biome lint
node scripts/verify-database-contract.cjs
bash .rules/check.sh
pnpm exec tailwindcss -i ./src/index.css -o /dev/null 2>&1 | grep -E '^(CssSyntaxError|Error):.*' || true
bash .rules/testBuild.sh
