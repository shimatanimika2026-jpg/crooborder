#!/bin/bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
EXPORT_DIR="${EXPORT_DIR:-${PROJECT_ROOT}/../export}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="app-b10oy6wwe801-${TIMESTAMP}"
STAGE_DIR="${EXPORT_DIR}/${PACKAGE_NAME}"
ARCHIVE_TMP="/tmp/git-archive-${TIMESTAMP}.zip"
PACKAGE_PATH="${EXPORT_DIR}/${PACKAGE_NAME}.zip"

create_zip() {
  local source_dir="$1"
  local output_zip="$2"

  if command -v zip >/dev/null 2>&1; then
    (
      cd "$(dirname "${source_dir}")"
      zip -r "${output_zip}" "$(basename "${source_dir}")" > /dev/null
    )
    return
  fi

  local source_dir_win
  local output_zip_win
  source_dir_win=$(cygpath -w "${source_dir}")
  output_zip_win=$(cygpath -w "${output_zip}")

  powershell.exe -NoProfile -Command \
    "if (Test-Path -LiteralPath '${output_zip_win}') { Remove-Item -LiteralPath '${output_zip_win}' -Force }; Compress-Archive -LiteralPath '${source_dir_win}' -DestinationPath '${output_zip_win}' -CompressionLevel Optimal"
}

ensure_absent() {
  local target="$1"
  if [ -e "${STAGE_DIR}/${target}" ] || [ -L "${STAGE_DIR}/${target}" ]; then
    echo "Found forbidden item in export stage: ${target}" >&2
    exit 1
  fi
}

echo "Exporting clean delivery package..."
echo "  source: ${PROJECT_ROOT}"
echo "  export: ${EXPORT_DIR}"

rm -rf "${EXPORT_DIR}"
mkdir -p "${STAGE_DIR}"

cd "${PROJECT_ROOT}"
git archive HEAD --format=zip -o "${ARCHIVE_TMP}"
unzip -q "${ARCHIVE_TMP}" -d "${STAGE_DIR}"
rm -f "${ARCHIVE_TMP}"

find "${STAGE_DIR}" -maxdepth 5 -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true

for path in \
  KNOWN_ISSUES.md \
  RELEASE_GATE_VERIFICATION.md \
  PROJECT_STATUS_SINGLE_SOURCE.md \
  MVP_ACCEPTANCE_EVIDENCE.md \
  SMOKE_TEST_FIX_REPORT.md \
  TEST_RESULTS.md \
  UAT_TEST_SCRIPT.md \
  historical_context.txt \
  vite.config.dev.ts \
  scripts/verify-release.sh \
  scripts/pre-release-check.sh \
  scripts/performance-test.sh; do
  [ -e "${STAGE_DIR}/${path}" ] && rm -rf "${STAGE_DIR:?}/${path}"
done

[ -d "${STAGE_DIR}/docs/archive" ] && rm -rf "${STAGE_DIR}/docs/archive"
[ -d "${STAGE_DIR}/scripts/performance" ] && rm -rf "${STAGE_DIR}/scripts/performance"
[ -d "${STAGE_DIR}/src/__tests__" ] && rm -rf "${STAGE_DIR}/src/__tests__"

for target in \
  .git \
  .env \
  .env.local \
  .env.production \
  .sync \
  history \
  node_modules \
  dist \
  dist-ssr \
  output \
  export \
  archive \
  coverage \
  performance-reports \
  performance.config.json \
  scripts/performance \
  scripts/performance-test.sh \
  scripts/verify-release.sh \
  scripts/pre-release-check.sh \
  KNOWN_ISSUES.md \
  RELEASE_GATE_VERIFICATION.md \
  PROJECT_STATUS_SINGLE_SOURCE.md \
  MVP_ACCEPTANCE_EVIDENCE.md \
  SMOKE_TEST_FIX_REPORT.md \
  TEST_RESULTS.md \
  UAT_TEST_SCRIPT.md \
  docs/archive \
  src/__tests__ \
  historical_context.txt; do
  ensure_absent "${target}"
done

cat > "${STAGE_DIR}/MANIFEST.txt" <<EOF
package: ${PACKAGE_NAME}
generated_at_utc: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
source_commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)
export_method: git archive + cleanup + zip verification
EOF

create_zip "${STAGE_DIR}" "${PACKAGE_PATH}"
rm -rf "${STAGE_DIR}"

ZIP_GIT_DIRS=$(unzip -l "${PACKAGE_PATH}" | awk '{print $NF}' | grep -E "(^|/)\\.git(/|$)" || true)
ZIP_ENV=$(unzip -l "${PACKAGE_PATH}" | awk '{print $NF}' | grep -E "^[^/]+/\\.env$" || true)
ZIP_PERF=$(unzip -l "${PACKAGE_PATH}" | awk '{print $NF}' | grep -E "^[^/]+/performance-reports/" || true)

if [ -n "${ZIP_GIT_DIRS}" ] || [ -n "${ZIP_ENV}" ] || [ -n "${ZIP_PERF}" ]; then
  echo "Export package is polluted. Removing ${PACKAGE_PATH}" >&2
  rm -f "${PACKAGE_PATH}"
  exit 1
fi

echo "Export complete:"
echo "  ${PACKAGE_PATH}"
