#!/bin/bash
# ============================================
# UAT测试账号创建脚本（使用Supabase CLI）
# ============================================
# 前提条件: 已安装Supabase CLI
# 安装命令: npm install -g supabase
# ============================================

# 配置信息
PROJECT_URL="https://backend.appmiaoda.com/projects/supabase303525095589064704"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkxNzkzMjIyLCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJzdWIiOiJzZXJ2aWNlX3JvbGUifQ.VwfBgo-KV23MpkqgmmGJmWCWOMvDTGZx_W_v2ZXIB70"

# 用户信息
EMAIL="uat_test@miaoda.com"
PASSWORD="Test@2026"
FULL_NAME="UAT Test User"
ROLE="executive"

echo "=========================================="
echo "创建UAT测试账号"
echo "=========================================="
echo "邮箱: $EMAIL"
echo "角色: $ROLE"
echo ""

# 创建Auth用户
echo "步骤1: 创建Auth用户..."
RESPONSE=$(curl -s -X POST "${PROJECT_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"${FULL_NAME}\",
      \"role\": \"${ROLE}\"
    }
  }")

echo "Auth用户创建响应:"
echo "$RESPONSE" | jq '.'

# 提取User ID
USER_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$USER_ID" == "null" ] || [ -z "$USER_ID" ]; then
  echo ""
  echo "❌ Auth用户创建失败！"
  echo "错误信息: $(echo "$RESPONSE" | jq -r '.message')"
  exit 1
fi

echo ""
echo "✓ Auth用户创建成功！"
echo "User ID: $USER_ID"

# 创建Profile记录
echo ""
echo "步骤2: 创建Profile记录..."

PROFILE_SQL="INSERT INTO profiles (id, email, full_name, role, language_preference, tenant_id, created_at, updated_at) VALUES ('${USER_ID}', '${EMAIL}', '${FULL_NAME}', '${ROLE}', 'zh-CN', 'JP', NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW();"

# 注意: 这里需要实际的数据库连接来执行SQL
# 如果使用Supabase CLI，可以使用: supabase db execute
echo "需要执行的SQL:"
echo "$PROFILE_SQL"

echo ""
echo "=========================================="
echo "账号创建完成！"
echo "=========================================="
echo "邮箱: $EMAIL"
echo "密码: $PASSWORD"
echo "角色: $ROLE"
echo "User ID: $USER_ID"
echo ""
echo "请使用以下信息登录测试:"
echo "URL: https://app-b10oy6wwe801.appmiaoda.com/login"
echo ""
