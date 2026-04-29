# 性能测试与质量门禁系统

**版本**: v1.0  
**最后更新**: 2026-04-23

---

## 概述

本系统提供集成至发布流程的自动化性能测试与质量门禁机制，在关键性能指标不达标时自动中断发布流程。

### 核心功能

1. **页面加载时间测试** - 测量 FCP、LCP、TTI 和总页面加载时间
2. **API 响应时间测试** - 监控核心 API 接口的响应时间、吞吐量和错误率
3. **内存泄漏检测** - 监测长时间运行场景下的 JavaScript 堆内存增长趋势
4. **打包体积分析** - 分析生产环境构建产物的体积和模块占比

### 质量门禁机制

当任何一项核心性能指标超出预设阈值时，系统会：
- 自动触发失败状态
- 阻止构建物进入后续发布或部署环节
- 提供明确的失败原因和优化建议

---

## 技术选型

### 1. 页面加载时间测试
- **工具**: Puppeteer + Chrome DevTools Protocol
- **指标**: 
  - FCP (First Contentful Paint) - 首次内容绘制
  - LCP (Largest Contentful Paint) - 最大内容绘制
  - TTI (Time to Interactive) - 可交互时间
  - Total Load Time - 总页面加载时间

### 2. API 响应时间测试
- **工具**: Node.js + 自定义脚本
- **指标**:
  - P50、P95、P99 分位数响应时间
  - 错误率

### 3. 内存泄漏检测
- **工具**: Puppeteer + Chrome DevTools Protocol
- **指标**:
  - 堆内存增长率 (MB/分钟)
  - 最大堆内存大小 (MB)

### 4. 打包体积分析
- **工具**: Node.js + fs + zlib
- **指标**:
  - 总打包体积
  - JavaScript 体积
  - CSS 体积
  - 单个 chunk 最大体积
  - 第三方依赖体积

---

## 配置文件

性能测试配置文件位于项目根目录：`performance.config.json`

### 配置结构

```json
{
  "pageLoad": {
    "enabled": true,
    "thresholds": {
      "fcp": { "warning": 1800, "error": 3000 },
      "lcp": { "warning": 2500, "error": 4000 },
      "tti": { "warning": 3800, "error": 5000 },
      "totalLoadTime": { "warning": 5000, "error": 8000 }
    },
    "testPages": [...]
  },
  "apiResponse": {
    "enabled": true,
    "thresholds": {
      "p50": { "warning": 200, "error": 500 },
      "p95": { "warning": 1000, "error": 2000 },
      "p99": { "warning": 2000, "error": 3000 },
      "errorRate": { "warning": 1, "error": 5 }
    },
    "testEndpoints": [...]
  },
  "memoryLeak": {
    "enabled": true,
    "thresholds": {
      "heapGrowthRate": { "warning": 5, "error": 10 },
      "maxHeapSize": { "warning": 150, "error": 200 }
    },
    "testScenarios": [...]
  },
  "bundleSize": {
    "enabled": true,
    "thresholds": {
      "totalSize": { "warning": 2048, "error": 3072 },
      "jsSize": { "warning": 1536, "error": 2048 },
      "cssSize": { "warning": 256, "error": 512 },
      "chunkSize": { "warning": 512, "error": 1024 },
      "vendorSize": { "warning": 1024, "error": 1536 }
    }
  }
}
```

### 阈值设定方法

#### 1. 基于行业标准
- **FCP**: < 1.8s (Good), 1.8-3.0s (Needs Improvement), > 3.0s (Poor)
- **LCP**: < 2.5s (Good), 2.5-4.0s (Needs Improvement), > 4.0s (Poor)
- **TTI**: < 3.8s (Good), 3.8-7.3s (Needs Improvement), > 7.3s (Poor)

#### 2. 基于历史数据
1. 运行性能测试收集基线数据
2. 计算平均值和标准差
3. 设置 warning = 平均值 + 1σ
4. 设置 error = 平均值 + 2σ

#### 3. 基于业务需求
- 根据用户体验要求设定
- 考虑目标用户的网络环境
- 参考竞品性能表现

---

## 使用方法

### 1. 安装依赖

性能测试需要 Puppeteer：

```bash
pnpm add -D puppeteer
```

### 2. 运行性能测试

#### 完整性能测试
```bash
pnpm test:performance
```

#### 单独运行某项测试
```bash
# 打包体积分析（不需要启动应用）
node scripts/performance/bundle-size-test.js

# 页面加载测试（需要先启动应用）
pnpm dev  # 在另一个终端
node scripts/performance/page-load-test.js

# 内存泄漏检测（需要先启动应用）
node scripts/performance/memory-leak-test.js

# API 响应测试（需要先启动应用）
node scripts/performance/api-response-test.js
```

### 3. 查看报告

性能测试报告保存在 `performance-reports/` 目录：

- **JSON 报告**: `{test-type}-{timestamp}.json`
- **HTML 报告**: `performance-report-{timestamp}.html`

打开 HTML 报告查看可视化结果：

```bash
open performance-reports/performance-report-*.html
```

---

## 集成到 CI/CD

### 1. 集成到发布前检查

性能测试已集成到发布前检查流程，但默认不启用。

要启用性能测试，修改 `scripts/pre-release-check.sh`：

```bash
# 在发布前检查中添加性能测试
echo "【7/7】性能测试..."
if pnpm test:performance > /tmp/performance-test.log 2>&1; then
  echo "✅ 性能测试通过"
else
  echo "❌ 性能测试失败"
  tail -50 /tmp/performance-test.log
  FAILED=1
  FAILED_CHECKS="${FAILED_CHECKS}\n  - 性能测试"
fi
```

### 2. CI/CD 配置示例

#### GitHub Actions

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main, release/*]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Run performance tests
        run: pnpm test:performance
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-reports/
```

#### GitLab CI

```yaml
performance-tests:
  stage: test
  script:
    - pnpm install
    - pnpm build
    - pnpm test:performance
  artifacts:
    when: always
    paths:
      - performance-reports/
  only:
    - main
    - /^release\/.*$/
```

---

## 报告样式示例

### HTML 报告结构

HTML 报告采用白色极简风格，包含以下部分：

1. **总览卡片** - 显示各项测试的通过/失败状态
2. **页面加载时间表格** - 展示各页面的 FCP、LCP、TTI 指标
3. **打包体积分析表格** - 展示 JS、CSS、Assets 的体积分布
4. **内存泄漏检测表格** - 展示各场景的内存增长情况
5. **API 响应时间表格** - 展示各接口的 P50、P95、P99 指标

### JSON 报告结构

```json
{
  "type": "page-load",
  "timestamp": "2026-04-23T15:30:00.000Z",
  "baseUrl": "http://localhost:5173",
  "thresholds": {...},
  "results": [
    {
      "name": "登录页",
      "path": "/login",
      "priority": "high",
      "metrics": {
        "fcp": 1200,
        "lcp": 1800,
        "tti": 2500,
        "totalLoadTime": 3000
      },
      "status": "pass",
      "warnings": [],
      "errors": []
    }
  ],
  "summary": {
    "total": 5,
    "passed": 4,
    "warnings": 1,
    "failed": 0,
    "errors": 0
  }
}
```

---

## 故障排查

### 1. Puppeteer 安装失败

**问题**: Puppeteer 下载 Chromium 失败

**解决方案**:
```bash
# 使用国内镜像
export PUPPETEER_DOWNLOAD_HOST=https://npmmirror.com/mirrors
pnpm add -D puppeteer
```

### 2. 页面加载测试失败

**问题**: 应用未启动

**解决方案**:
```bash
# 先启动应用
pnpm dev

# 在另一个终端运行测试
pnpm test:performance
```

### 3. 内存泄漏误报

**问题**: 正常的内存增长被误判为泄漏

**解决方案**:
- 调整 `performance.config.json` 中的阈值
- 增加 `heapGrowthRate.warning` 和 `heapGrowthRate.error` 的值
- 减少测试迭代次数

### 4. 打包体积超标

**问题**: 打包体积超出阈值

**解决方案**:
1. 分析最大的文件：查看报告中的"最大的 5 个文件"
2. 优化第三方依赖：
   - 使用 tree-shaking
   - 按需导入（如 lodash-es）
   - 移除未使用的依赖
3. 代码分割：
   - 使用动态 import
   - 配置 Vite 的 manualChunks
4. 压缩优化：
   - 启用 gzip/brotli 压缩
   - 使用 terser 压缩 JS

---

## 最佳实践

### 1. 定期运行性能测试
- 每次发布前必须运行
- 每周运行一次基线测试
- PR 合并前运行（CI/CD 集成）

### 2. 监控性能趋势
- 保留历史报告数据
- 定期分析性能变化趋势
- 及时发现性能退化

### 3. 设置合理的阈值
- 不要设置过于严格的阈值
- 根据实际情况调整
- 区分 warning 和 error

### 4. 优化性能问题
- 优先修复 error 级别的问题
- 逐步优化 warning 级别的问题
- 记录优化措施和效果

---

## 参考资料

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Puppeteer Documentation](https://pptr.dev/)

---

**最后更新**: 2026-04-23
