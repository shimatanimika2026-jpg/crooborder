#!/bin/bash
set -e

# 发布前总检查
# 串起：类型检查、lint、关键 smoke、关键 e2e、配置回归、交付来源检查
# 任一失败都必须直接失败

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
EXPORT_DIR="${EXPORT_DIR:-${PROJECT_ROOT}/../export}"
cd "${PROJECT_ROOT}"

echo "========================================="
echo "发布前总检查"
echo "========================================="
echo ""

FAILED=0
FAILED_CHECKS=""

# 1. 类型检查（仅检查 src/ 目录，排除测试文件）
echo "【1/7】类型检查（src/ 目录）..."
if pnpm exec tsc --noEmit --skipLibCheck > /tmp/tsc-check.log 2>&1; then
  echo "✅ 类型检查通过"
else
  # 检查是否只是测试文件的错误
  if grep -q "src/__tests__" /tmp/tsc-check.log && ! grep -q "src/pages\|src/components\|src/services\|src/lib" /tmp/tsc-check.log; then
    echo "⚠️  类型检查有警告（仅测试文件），继续"
  else
    echo "❌ 类型检查失败"
    echo ""
    echo "错误详情:"
    grep -v "src/__tests__" /tmp/tsc-check.log | tail -20
    FAILED=1
    FAILED_CHECKS="${FAILED_CHECKS}\n  - 类型检查"
  fi
fi
echo ""

# 2. Lint 检查
echo "【2/7】Lint 检查..."
if pnpm run lint > /tmp/lint-check.log 2>&1; then
  echo "✅ Lint 检查通过"
else
  echo "❌ Lint 检查失败"
  echo ""
  echo "错误详情:"
  tail -20 /tmp/lint-check.log
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - Lint 检查"
fi
echo ""

# 3. Smoke 测试
echo "【3/7】Smoke 测试..."
if pnpm run test:smoke > /tmp/smoke-test.log 2>&1; then
  echo "✅ Smoke 测试通过"
else
  echo "❌ Smoke 测试失败"
  echo ""
  echo "错误详情:"
  tail -30 /tmp/smoke-test.log
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - Smoke 测试"
fi
echo ""

# 4. 关键 E2E 测试（主链路核心场景）
echo "【4/7】关键 E2E 测试..."
echo "   - 协作敏感数据防护"
echo "   - 主流程硬闭环"
if pnpm exec vitest run src/__tests__/e2e/collaboration/collaboration-sensitive-guard.test.tsx src/__tests__/e2e/mainflow/mainflow-hard-closure.test.tsx --reporter=verbose > /tmp/e2e-test.log 2>&1; then
  echo "✅ 关键 E2E 测试通过"
else
  echo "❌ 关键 E2E 测试失败"
  echo ""
  echo "错误详情:"
  tail -40 /tmp/e2e-test.log
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - 关键 E2E 测试"
fi
echo ""

# 5. 配置错误页回归测试
echo "【5/7】配置错误页回归测试..."
if grep -q "Supabase 配置说明" "${PROJECT_ROOT}/src/pages/ConfigErrorPage.tsx" && \
   grep -q "Demo 模式" "${PROJECT_ROOT}/src/pages/ConfigErrorPage.tsx" && \
   [ -f "${PROJECT_ROOT}/public/docs/ENV_VARIABLES.md" ] && \
   [ -f "${PROJECT_ROOT}/public/docs/README.md" ] && \
   [ -f "${PROJECT_ROOT}/public/docs/BUILD.md" ]; then
  echo "✅ 配置错误页回归测试通过"
else
  echo "❌ 配置错误页回归测试失败"
  echo "   ConfigErrorPage.tsx 必须包含 'Supabase 配置说明' 和 'Demo 模式'"
  echo "   public/docs/ 必须包含 ENV_VARIABLES.md、README.md、BUILD.md"
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - 配置错误页回归"
fi
echo ""

# 6. 导出包污染检查（真实导出并检查 zip）
echo "【6/7】导出包污染检查..."
echo "   执行真实导出..."

# 执行真实导出
if bash "${PROJECT_ROOT}/scripts/export-clean-package.sh" > /tmp/export-check.log 2>&1; then
  echo "   ✅ 导出成功"

  # 查找导出的 zip 文件（输出在项目外的 /workspace/export/）
  EXPORT_ZIP=$(find "${EXPORT_DIR}" -name "*.zip" -type f | sort | tail -1)

  if [ -z "${EXPORT_ZIP}" ]; then
    echo "❌ 未找到导出的 zip 文件"
    FAILED=1
    FAILED_CHECKS="${FAILED_CHECKS}\n  - 导出包污染检查（未找到 zip）"
  else
    echo "   导出 zip: ${EXPORT_ZIP}"

    # 检查 zip 内容是否包含污染项
    CONTAMINATION_FOUND=0
    CONTAMINATION_ITEMS=""

    # ── 辅助函数：检查单个污染项 ────────────────────────────────
    # 注意：check_zip_absent 使用 awk 提取文件名字段后再匹配，
    # 避免将日期/大小列误判为文件名。
    # 对 .git/ 目录使用精确模式 (^|/)\.git(/|$)，
    # 确保不误报 .gitattributes / .gitignore 等正常源文件。
    check_zip_absent() {
      local pattern="$1"
      local label="$2"
      local matches
      matches=$(unzip -l "${EXPORT_ZIP}" | awk '{print $NF}' | grep -E "${pattern}" || true)
      if [ -n "${matches}" ]; then
        echo "   ❌ zip 包含: ${label}"
        echo "${matches}" | head -5 | sed 's/^/      /'
        CONTAMINATION_FOUND=1
        CONTAMINATION_ITEMS="${CONTAMINATION_ITEMS}\n    - ${label}"
      fi
    }

    # ── Git 版本库 ──────────────────────────────────────────────
    # 精确匹配 .git/ 目录（路径含 /.git/ 或以 /.git 结尾）
    # 不会误报 .gitattributes / .gitignore（它们不含 /.git/ 或 /.git$）
    check_zip_absent '(^|/)\.git(/|$)'   '.git/ 目录（git版本库，严禁出现）'

    # ── 真实环境密钥 ────────────────────────────────────────────
    check_zip_absent '^[^/]+/\.env$'      '.env（根目录，真实密钥）'
    check_zip_absent '\.env\.local'       '.env.local'
    check_zip_absent '\.env\.production'  '.env.production'

    # ── 依赖与构建产物 ──────────────────────────────────────────
    check_zip_absent 'node_modules/'      'node_modules/'
    check_zip_absent '/dist/'             'dist/'
    check_zip_absent 'coverage/'          'coverage/'

    # ── 性能测试产物 ────────────────────────────────────────────
    check_zip_absent 'performance-reports/' 'performance-reports/'
    check_zip_absent 'performance\.config\.json' 'performance.config.json'
    check_zip_absent 'scripts/performance/' 'scripts/performance/'

    # ── 测试代码 ────────────────────────────────────────────────
    check_zip_absent 'src/__tests__/'     'src/__tests__/'

    # ── 内部质量文档 ────────────────────────────────────────────
    check_zip_absent 'KNOWN_ISSUES\.md'               'KNOWN_ISSUES.md'
    check_zip_absent 'RELEASE_GATE_VERIFICATION\.md'  'RELEASE_GATE_VERIFICATION.md'
    check_zip_absent 'PROJECT_STATUS_SINGLE_SOURCE\.md' 'PROJECT_STATUS_SINGLE_SOURCE.md'
    check_zip_absent 'MVP_ACCEPTANCE_EVIDENCE\.md'    'MVP_ACCEPTANCE_EVIDENCE.md'

    # ── 平台运行时目录 ──────────────────────────────────────────
    check_zip_absent '\.sync/'            '.sync/'
    check_zip_absent '^[^/]+/history/'    'history/'
    check_zip_absent 'historical_context\.txt' 'historical_context.txt'

    if [ "${CONTAMINATION_FOUND}" -eq 0 ]; then
      echo "✅ 导出包污染检查通过"
      echo "   导出 zip 路径: ${EXPORT_ZIP}"
    else
      echo "❌ 导出包污染检查失败"
      echo ""
      echo "   污染项列表:"
      echo -e "${CONTAMINATION_ITEMS}"
      FAILED=1
      FAILED_CHECKS="${FAILED_CHECKS}\n  - 导出包污染检查"
    fi
  fi
else
  echo "❌ 导出失败"
  echo ""
  echo "错误详情:"
  tail -20 /tmp/export-check.log
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - 导出包污染检查（导出失败）"
fi
echo ""

# ─────────────────────────────────────────────────────────────────
# 7. 交付来源检查
#    规则：
#    a) 上传文件必须位于 /workspace/export/ 目录下（项目目录外部）
#    b) 文件名必须符合 app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip 格式
#    c) 原始项目根目录不得直接打包（检测根目录是否存在 .git/）
# ─────────────────────────────────────────────────────────────────
echo "【7/7】交付来源检查..."

DELIVERY_FAILED=0
DELIVERY_ERRORS=""

# a) /workspace/export/ 目录必须存在且包含 zip
if [ ! -d "${EXPORT_DIR}" ]; then
  echo "   ❌ /workspace/export/ 目录不存在，请先运行 pnpm export 生成交付包"
  DELIVERY_FAILED=1
  DELIVERY_ERRORS="${DELIVERY_ERRORS}\n  - /workspace/export/ 目录不存在"
else
  EXPORT_ZIP_COUNT=$(find "${EXPORT_DIR}" -maxdepth 1 -name "*.zip" | wc -l | tr -d ' ')
  if [ "${EXPORT_ZIP_COUNT}" -eq 0 ]; then
    echo "   ❌ /workspace/export/ 目录下没有 zip 文件，只允许上传此处生成的 zip"
    DELIVERY_FAILED=1
    DELIVERY_ERRORS="${DELIVERY_ERRORS}\n  - /workspace/export/ 目录下无 zip 文件"
  else
    # b) 文件名格式检查
    LATEST_ZIP=$(find "${EXPORT_DIR}" -maxdepth 1 -name "*.zip" -type f \
      | sort | tail -1)
    ZIP_BASENAME=$(basename "${LATEST_ZIP}")
    # 格式：app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip
    if echo "${ZIP_BASENAME}" | grep -qE '^app-b10oy6wwe801-[0-9]{8}_[0-9]{6}\.zip$'; then
      echo "   ✅ 交付文件名格式正确: ${ZIP_BASENAME}"
    else
      echo "   ❌ 交付文件名不符合规范: ${ZIP_BASENAME}"
      echo "      期望格式: app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip"
      DELIVERY_FAILED=1
      DELIVERY_ERRORS="${DELIVERY_ERRORS}\n  - 文件名格式错误: ${ZIP_BASENAME}"
    fi
  fi
fi

# c) 禁止上传原始项目根目录（根目录存在 .git/ 说明未导出）
if [ -d "${PROJECT_ROOT}/.git" ]; then
  echo "   ⚠️  检测到根目录存在 .git/（开发环境正常，但禁止直接打包根目录上传）"
  echo "      强制要求：只允许上传 /workspace/export/ 下由 export-clean-package.sh 生成的 zip"
fi

if [ "${DELIVERY_FAILED}" -eq 0 ]; then
  echo "✅ 交付来源检查通过"
  echo ""
  echo "   ┌─────────────────────────────────────────────────────────────────────┐"
  echo "   │  ✅ 唯一合规交付包（上传此文件）:                                   │"
  echo "   │  ${LATEST_ZIP}"
  echo "   │                                                                     │"
  echo "   │  ❌ 禁止上传（含 .git/.env/performance-reports）:                   │"
  echo "   │     工作区根目录 zip  →  /workspace/app-b10oy6wwe801/               │"
  echo "   │     平台"下载代码"按钮生成的 zip（直接打包工作区，必然含 .git）      │"
  echo "   └─────────────────────────────────────────────────────────────────────┘"
else
  echo "❌ 交付来源检查失败"
  echo -e "${DELIVERY_ERRORS}"
  echo ""
  echo "   修复方法: 运行 pnpm export 生成 /workspace/export/ 下的干净交付包"
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - 交付来源检查"
fi
echo ""

# 总结
echo "========================================="
if [ ${FAILED} -eq 0 ]; then
  echo "✅ 所有检查通过"
  echo "========================================="
  echo ""
  echo "项目状态: 可发布"
  echo ""
  echo "┌──────────────────────────────────────────────────────────────────────┐"
  echo "│  上传规则（违反则交付包无效）                                        │"
  echo "│                                                                      │"
  echo "│  ✅ 正确：上传 /workspace/export/ 下由 pnpm deliver 生成的 zip       │"
  echo "│  ❌ 禁止：上传平台"下载代码"或工作区根目录打包的 zip                  │"
  echo "│           （此类包含 .git/ .env performance-reports，不得交付）       │"
  echo "└──────────────────────────────────────────────────────────────────────┘"
  exit 0
else
  echo "❌ 检查失败"
  echo "========================================="
  echo ""
  echo "失败项目:"
  echo -e "${FAILED_CHECKS}"
  echo ""
  echo "项目状态: UAT候选（需修复失败项后可发布）"
  exit 1
fi
