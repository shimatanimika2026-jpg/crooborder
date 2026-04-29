# 生产计划管理模块 API 文档

## 技术架构说明

本系统使用 **Supabase** 作为后端服务,而非 Spring Boot。Supabase 提供:
- PostgreSQL 数据库
- 自动生成的 REST API
- 实时订阅 (WebSocket)
- Edge Functions (Deno)
- 行级安全策略 (RLS)

## 数据库表结构

### 1. production_plans (生产计划表)

```sql
CREATE TABLE production_plans (
  id SERIAL PRIMARY KEY,
  plan_code TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('annual', 'monthly', 'weekly')),
  plan_period_start DATE NOT NULL,
  plan_period_end DATE NOT NULL,
  production_quantity INTEGER NOT NULL,
  delivery_date DATE NOT NULL,
  responsible_person_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_cn_approval', 'pending_jp_approval', 
    'approved', 'rejected', 'executing', 'completed', 'cancelled'
  )),
  current_version INTEGER NOT NULL DEFAULT 1,
  tenant_id TEXT NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. production_plan_versions (计划版本表)

```sql
CREATE TABLE production_plan_versions (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  change_description TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_data JSONB,
  new_data JSONB,
  UNIQUE(plan_id, version_number)
);
```

### 3. production_plan_approvals (审批记录表)

```sql
CREATE TABLE production_plan_approvals (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('cn_manager', 'jp_manager')),
  approver_id UUID REFERENCES profiles(id),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_comment TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## REST API 使用示例

### 1. 查询生产计划列表

```typescript
// GET /rest/v1/production_plans
const { data, error } = await supabase
  .from('production_plans')
  .select('*')
  .eq('tenant_id', 'CN')
  .order('created_at', { ascending: false })
  .limit(50);
```

### 2. 查询计划详情(含关联数据)

```typescript
// GET /rest/v1/production_plans?id=eq.1&select=*,orders:production_orders(*)
const { data, error } = await supabase
  .from('production_plans')
  .select(`
    *,
    orders:production_orders(*)
  `)
  .eq('id', planId)
  .maybeSingle();
```

### 3. 创建生产计划

```typescript
// POST /rest/v1/production_plans
const { data, error } = await supabase
  .from('production_plans')
  .insert({
    plan_code: 'PLAN-2026-001',
    plan_type: 'monthly',
    plan_period_start: '2026-05-01',
    plan_period_end: '2026-05-31',
    production_quantity: 1000,
    delivery_date: '2026-06-15',
    tenant_id: 'CN',
    status: 'draft',
  })
  .select()
  .single();
```

### 4. 更新计划(触发版本控制)

```typescript
// PATCH /rest/v1/production_plans?id=eq.1
const { data, error } = await supabase
  .from('production_plans')
  .update({
    production_quantity: 1200,
    current_version: plan.current_version + 1,
    updated_by: userId,
  })
  .eq('id', planId)
  .select()
  .single();

// 同时创建版本记录
await supabase
  .from('production_plan_versions')
  .insert({
    plan_id: planId,
    version_number: plan.current_version + 1,
    change_description: '调整生产数量',
    changed_by: userId,
    previous_data: { production_quantity: 1000 },
    new_data: { production_quantity: 1200 },
  });
```

### 5. 提交审批

```typescript
// 更新计划状态
await supabase
  .from('production_plans')
  .update({ status: 'pending_cn_approval' })
  .eq('id', planId);

// 创建审批记录
await supabase
  .from('production_plan_approvals')
  .insert({
    plan_id: planId,
    version_number: plan.current_version,
    approver_role: 'cn_manager',
    approval_status: 'pending',
  });
```

### 6. 审批操作

```typescript
// PATCH /rest/v1/production_plan_approvals?id=eq.1
const { error } = await supabase
  .from('production_plan_approvals')
  .update({
    approval_status: 'approved',
    approver_id: userId,
    approved_at: new Date().toISOString(),
    approval_comment: '同意',
  })
  .eq('id', approvalId);

// 更新计划状态
await supabase
  .from('production_plans')
  .update({ status: 'approved' })
  .eq('id', planId);
```

## 实时订阅 (WebSocket)

### 订阅计划变更

```typescript
// 订阅特定计划的变更
const channel = supabase
  .channel(`plan-${planId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'production_plans',
      filter: `id=eq.${planId}`,
    },
    (payload) => {
      console.log('计划变更:', payload);
      if (payload.eventType === 'UPDATE') {
        // 更新UI
        setPlan(payload.new);
        // 显示通知
        toast.info('计划已更新');
      }
    }
  )
  .subscribe();

// 取消订阅
channel.unsubscribe();
```

### 订阅审批通知

```typescript
// 订阅审批记录变更
const approvalChannel = supabase
  .channel('plan-approvals')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'production_plan_approvals',
    },
    (payload) => {
      console.log('新的审批请求:', payload);
      // 推送通知给审批人
      if (payload.new.approver_role === userRole) {
        toast.info('您有新的审批请求');
      }
    }
  )
  .subscribe();
```

## 行级安全策略 (RLS)

### 租户隔离策略

```sql
-- 中方用户只能访问CN数据
CREATE POLICY "cn_users_access_cn_plans" ON production_plans
  FOR ALL TO authenticated
  USING (
    tenant_id = 'CN' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tenant_id IN ('CN', 'BOTH')
    )
  );

-- 日方用户只能访问JP数据
CREATE POLICY "jp_users_access_jp_plans" ON production_plans
  FOR ALL TO authenticated
  USING (
    tenant_id = 'JP' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tenant_id IN ('JP', 'BOTH')
    )
  );

-- 高层可访问全部数据
CREATE POLICY "executives_access_all_plans" ON production_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tenant_id = 'BOTH'
    )
  );
```

## 通知推送

### 使用 Supabase Edge Function 发送通知

```typescript
// supabase/functions/send-plan-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { planId, type, recipients } = await req.json();

  // 发送微信企业号通知
  await fetch('https://qyapi.weixin.qq.com/cgi-bin/message/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      touser: recipients.join('|'),
      msgtype: 'text',
      text: {
        content: `生产计划 ${planId} 需要您审批`,
      },
    }),
  });

  // 发送Line通知(日方)
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('LINE_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify({
      to: recipients[0],
      messages: [{
        type: 'text',
        text: `生産計画 ${planId} の承認が必要です`,
      }],
    }),
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 调用通知函数

```typescript
await supabase.functions.invoke('send-plan-notification', {
  body: {
    planId: plan.plan_code,
    type: 'approval_request',
    recipients: ['user1', 'user2'],
  },
});
```

## 性能优化

### 1. 使用物化视图

```sql
CREATE MATERIALIZED VIEW production_plan_overview AS
SELECT 
  p.id AS plan_id,
  p.plan_code,
  p.plan_type,
  p.production_quantity,
  p.status AS plan_status,
  COUNT(o.id) AS total_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'completed') AS completed_orders,
  SUM(o.production_quantity) AS total_production_quantity,
  SUM(o.production_quantity) FILTER (WHERE o.status = 'completed') AS completed_quantity,
  ROUND(
    COALESCE(
      SUM(o.production_quantity) FILTER (WHERE o.status = 'completed')::NUMERIC / 
      NULLIF(SUM(o.production_quantity), 0) * 100,
      0
    ),
    2
  ) AS completion_rate
FROM production_plans p
LEFT JOIN production_orders o ON p.id = o.plan_id
GROUP BY p.id;

-- 定期刷新
REFRESH MATERIALIZED VIEW production_plan_overview;
```

### 2. 添加索引

```sql
CREATE INDEX idx_plans_tenant_status ON production_plans(tenant_id, status);
CREATE INDEX idx_plans_period ON production_plans(plan_period_start, plan_period_end);
CREATE INDEX idx_orders_plan_id ON production_orders(plan_id);
CREATE INDEX idx_approvals_plan_id ON production_plan_approvals(plan_id);
```

## 前端集成示例

### React Hook 封装

```typescript
// hooks/useProductionPlan.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { ProductionPlan } from '@/types/database';

export function useProductionPlan(planId: string) {
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan();
    const channel = subscribeToChanges();
    return () => {
      channel.unsubscribe();
    };
  }, [planId]);

  const loadPlan = async () => {
    const { data, error } = await supabase
      .from('production_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (!error) setPlan(data);
    setLoading(false);
  };

  const subscribeToChanges = () => {
    return supabase
      .channel(`plan-${planId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'production_plans',
        filter: `id=eq.${planId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setPlan(payload.new as ProductionPlan);
        }
      })
      .subscribe();
  };

  return { plan, loading, refresh: loadPlan };
}
```

## 与 Spring Boot 对比

| 功能 | Supabase | Spring Boot |
|------|----------|-------------|
| REST API | 自动生成 | 需手动编写 Controller |
| 实时通知 | 内置 Realtime | 需集成 WebSocket |
| 认证授权 | 内置 Auth + RLS | 需集成 Spring Security |
| 数据库迁移 | SQL 文件 | Flyway/Liquibase |
| 部署 | 云托管 | 需自建服务器 |
| 开发效率 | 高 | 中 |

## 总结

Supabase 提供了完整的后端即服务(BaaS)能力,无需编写 Spring Boot 代码即可实现:
- ✅ RESTful API
- ✅ 实时 WebSocket 订阅
- ✅ 行级安全策略
- ✅ Edge Functions (Serverless)
- ✅ 自动生成的 API 文档

所有功能通过 Supabase JavaScript 客户端调用,前端代码更简洁高效。
