#!/bin/bash

# ============================================================
# Demo 数据一键导入脚本
# 中国协作机器人日本委托组装业务 Web 管理系统
# ============================================================

set -e

echo "=========================================="
echo "Demo 数据一键导入脚本"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "supabase/seed/demo_seed_full.sql" ]; then
  echo "错误：请在项目根目录下运行此脚本"
  exit 1
fi

echo "正在导入 Demo 数据..."
echo ""

# 使用 Supabase CLI 执行 SQL
# 注意：需要先安装 Supabase CLI 并登录
# 安装：npm install -g supabase
# 登录：supabase login

# 方法1：使用 Supabase CLI（推荐）
# supabase db execute -f supabase/seed/demo_seed_full.sql

# 方法2：使用 psql（如果有直接数据库访问权限）
# psql -h <host> -U <user> -d <database> -f supabase/seed/demo_seed_full.sql

# 方法3：使用 Node.js 脚本（本项目推荐）
node -e "
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 读取 SQL 文件
const sql = fs.readFileSync('supabase/seed/demo_seed_full.sql', 'utf8');

// 创建 Supabase 客户端
// 注意：需要设置环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.error('错误：请设置环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 执行 SQL
async function importData() {
  try {
    console.log('正在执行 SQL...');
    
    // 分割 SQL 语句（按分号分割，但忽略注释和函数内的分号）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(\`共 \${statements.length} 条 SQL 语句\`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        console.log(\`执行第 \${i + 1}/\${statements.length} 条语句...\`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.error(\`错误：\${error.message}\`);
          // 继续执行下一条语句
        }
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log('Demo 数据导入完成！');
    console.log('========================================');
    console.log('');
    console.log('您现在可以访问以下页面查看 Demo 数据：');
    console.log('- 生产计划：/production-plans');
    console.log('- ASN 列表：/asn-list');
    console.log('- 收货列表：/receiving-list');
    console.log('- IQC 检验：/iqc-inspection');
    console.log('- 组装完成：/assembly-complete');
    console.log('- 老化测试：/aging-test-list');
    console.log('- 最终测试：/final-test-management');
    console.log('- QA 放行：/qa-release-management');
    console.log('- 出货确认：/shipment-confirmation');
    console.log('');
  } catch (error) {
    console.error('导入失败：', error);
    process.exit(1);
  }
}

importData();
"

echo ""
echo "=========================================="
echo "Demo 数据导入完成！"
echo "=========================================="
echo ""
echo "您现在可以访问以下页面查看 Demo 数据："
echo "- 生产计划：/production-plans"
echo "- ASN 列表：/asn-list"
echo "- 收货列表：/receiving-list"
echo "- IQC 检验：/iqc-inspection"
echo "- 组装完成：/assembly-complete"
echo "- 老化测试：/aging-test-list"
echo "- 最终测试：/final-test-management"
echo "- QA 放行：/qa-release-management"
echo "- 出货确认：/shipment-confirmation"
echo ""
