# 发货与物流跟踪模块完整文档

## 系统概述

本模块实现了完整的国际物流跟踪系统,集成第三方物流API(中远海运、FedEx等),提供实时地图轨迹、异常预警和多渠道通知推送。

## 核心功能

### 1. 第三方物流API集成
- **支持的物流商**: 中远海运、FedEx、DHL、UPS等
- **自动状态同步**: Edge Function定时调用物流API
- **数据标准化**: 统一不同物流商的数据格式
- **错误重试**: 自动重试失败的API调用

### 2. 实时地图轨迹
- **地图引擎**: Leaflet (开源,轻量)
- **轨迹回放**: 支持播放/暂停/重置
- **进度控制**: 滑块控制回放进度
- **标记点**: 显示所有物流事件位置
- **路径绘制**: 虚线连接各个节点

### 3. 异常预警引擎
- **延误检测**: 超过预计到达时间
- **清关扣货**: 海关扣留告警
- **长时间无更新**: 48小时无物流信息更新
- **自动分级**: critical/high/medium三级严重度

### 4. 多渠道通知推送
- **微信企业号**: 中方团队通知
- **Line Notify**: 日方团队通知
- **邮件**: 高严重度事件邮件通知
- **实时推送**: Supabase Realtime WebSocket

## 技术架构

### Edge Functions (Serverless)

#### 1. sync-logistics-status (物流状态同步)

**功能**: 定时调用第三方物流API,同步最新状态

**触发方式**:
- 定时任务: 每5分钟执行一次
- 手动触发: 用户点击"同步状态"按钮

**执行流程**:
```
1. 查询所有在途物流订单
2. 遍历每个订单,调用物流API
3. 更新logistics_tracking表
4. 插入新的logistics_events
5. 检测异常状态
6. 触发告警通知
```

**代码示例**:
```typescript
// 调用物流API
const apiResponse = await fetchLogisticsStatus(
  trackingNumber,
  shippingMethod
);

// 更新跟踪记录
await supabase
  .from('logistics_tracking')
  .upsert({
    tracking_number,
    current_status: apiResponse.current_status,
    current_location: apiResponse.current_location,
    latitude: apiResponse.latitude,
    longitude: apiResponse.longitude,
  });

// 检测异常
const anomalies = detectAnomalies(
  apiResponse.current_status,
  apiResponse.estimated_arrival,
  apiResponse.events
);

// 触发告警
if (anomalies.length > 0) {
  await supabase.functions.invoke('send-logistics-alert', {
    body: { anomaly },
  });
}
```

#### 2. send-logistics-alert (告警通知推送)

**功能**: 发送物流异常告警到微信/Line/邮件

**通知渠道**:
- **微信企业号**: 使用企业微信API
- **Line Notify**: 使用Line Notify API
- **邮件**: 使用SendGrid/AWS SES

**严重度策略**:
- **critical/high**: 发送所有渠道
- **medium**: 仅发送微信/Line
- **low**: 仅记录日志

**代码示例**:
```typescript
// 微信通知
await fetch(
  `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
  {
    method: 'POST',
    body: JSON.stringify({
      touser: '@all',
      msgtype: 'text',
      text: {
        content: `【物流异常告警】\n发货单号: ${alert.shipping_code}\n异常类型: ${alert.message}`,
      },
    }),
  }
);

// Line通知
await fetch('https://notify-api.line.me/api/notify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    message: `【物流異常警報】\n発送番号: ${alert.shipping_code}`,
  }),
});
```

### 前端组件

#### 1. LogisticsMap (地图组件)

**文件**: `/src/components/logistics/LogisticsMap.tsx`

**功能**:
- 显示物流轨迹地图
- 标记所有物流事件位置
- 绘制运输路径
- 轨迹回放控制

**关键代码**:
```typescript
// 初始化地图
const map = L.map(container).setView([31.2304, 121.4737], 4);

// 添加OpenStreetMap图层
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 创建标记
events.forEach((event, index) => {
  const icon = L.divIcon({
    html: `<div class="w-8 h-8 rounded-full bg-primary">${index + 1}</div>`,
  });
  
  L.marker([event.latitude, event.longitude], { icon })
    .addTo(map)
    .bindPopup(event.description);
});

// 绘制路径
const coordinates = events.map(e => [e.latitude, e.longitude]);
L.polyline(coordinates, {
  color: '#3b82f6',
  weight: 3,
  dashArray: '10, 10',
}).addTo(map);
```

**轨迹回放**:
```typescript
// 播放控制
const [isPlaying, setIsPlaying] = useState(false);
const [currentStep, setCurrentStep] = useState(0);

useEffect(() => {
  if (isPlaying) {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= events.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }
}, [isPlaying]);
```

#### 2. LogisticsDetailPage (详情页面)

**文件**: `/src/pages/LogisticsDetailPage.tsx`

**功能**:
- 显示发货单详细信息
- 实时地图轨迹
- 物流事件时间线
- 手动同步状态按钮
- 实时订阅状态更新

**实时订阅**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`logistics-${id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'logistics_tracking',
    }, (payload) => {
      setTracking(payload.new);
      toast.info('物流信息已更新');
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'logistics_events',
    }, (payload) => {
      setEvents(prev => [...prev, payload.new]);
    })
    .subscribe();

  return () => channel.unsubscribe();
}, [id]);
```

## 数据库表结构

### shipping_orders (发货单表)

```sql
CREATE TABLE shipping_orders (
  id SERIAL PRIMARY KEY,
  shipping_code TEXT UNIQUE NOT NULL,
  tracking_number TEXT UNIQUE NOT NULL,
  shipping_method TEXT NOT NULL,  -- sea | air | land | express
  shipping_date DATE NOT NULL,
  estimated_arrival DATE NOT NULL,
  actual_arrival DATE,
  current_status TEXT NOT NULL,   -- preparing | shipped | in_transit | customs | arrived | delayed
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### logistics_tracking (物流跟踪表)

```sql
CREATE TABLE logistics_tracking (
  id SERIAL PRIMARY KEY,
  shipping_order_id INTEGER REFERENCES shipping_orders(id),
  tracking_number TEXT NOT NULL,
  current_status TEXT NOT NULL,
  current_location TEXT NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  estimated_arrival TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tracking_number)
);
```

### logistics_events (物流事件表)

```sql
CREATE TABLE logistics_events (
  id SERIAL PRIMARY KEY,
  tracking_number TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- picked_up | in_transit | customs | delayed | customs_hold | arrived
  location TEXT NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 异常预警规则

### 1. 延误检测

```typescript
if (currentStatus === 'delayed') {
  anomalies.push({
    type: 'delayed',
    severity: 'high',
    message: '货物运输延误',
  });
}
```

### 2. 清关扣货

```typescript
if (currentStatus === 'customs_hold') {
  anomalies.push({
    type: 'customs_hold',
    severity: 'critical',
    message: '货物被海关扣留',
  });
}
```

### 3. 超期未到达

```typescript
const daysUntilArrival = Math.ceil(
  (new Date(estimatedArrival).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
);

if (daysUntilArrival < 0) {
  anomalies.push({
    type: 'overdue',
    severity: 'high',
    message: `货物已超期${Math.abs(daysUntilArrival)}天未到达`,
  });
}
```

### 4. 长时间无更新

```typescript
const lastEvent = events[events.length - 1];
const hoursSinceLastUpdate = Math.ceil(
  (Date.now() - new Date(lastEvent.occurred_at).getTime()) / (1000 * 60 * 60)
);

if (hoursSinceLastUpdate > 48) {
  anomalies.push({
    type: 'no_update',
    severity: 'medium',
    message: `物流信息${hoursSinceLastUpdate}小时未更新`,
  });
}
```

## 第三方API集成

### 中远海运 API

```typescript
async function fetchCOSCOStatus(trackingNumber: string) {
  const response = await fetch(
    `https://api.cosco.com/tracking?number=${trackingNumber}`,
    {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('COSCO_API_KEY')}`,
      },
    }
  );
  
  const data = await response.json();
  
  return {
    tracking_number: data.containerNumber,
    current_status: mapCOSCOStatus(data.status),
    current_location: data.currentLocation,
    latitude: data.latitude,
    longitude: data.longitude,
    events: data.events.map(e => ({
      event_type: mapCOSCOEventType(e.type),
      location: e.location,
      latitude: e.lat,
      longitude: e.lng,
      description: e.description,
      occurred_at: e.timestamp,
    })),
  };
}
```

### FedEx API

```typescript
async function fetchFedExStatus(trackingNumber: string) {
  const response = await fetch(
    'https://apis.fedex.com/track/v1/trackingnumbers',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('FEDEX_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
      }),
    }
  );
  
  const data = await response.json();
  const shipment = data.output.completeTrackResults[0].trackResults[0];
  
  return {
    tracking_number: trackingNumber,
    current_status: mapFedExStatus(shipment.latestStatusDetail.code),
    current_location: shipment.latestStatusDetail.scanLocation.city,
    latitude: shipment.latestStatusDetail.scanLocation.latitude,
    longitude: shipment.latestStatusDetail.scanLocation.longitude,
    events: shipment.scanEvents.map(e => ({
      event_type: mapFedExEventType(e.eventType),
      location: e.scanLocation.city,
      latitude: e.scanLocation.latitude,
      longitude: e.scanLocation.longitude,
      description: e.eventDescription,
      occurred_at: e.date,
    })),
  };
}
```

## 定时任务配置

### Supabase Cron Jobs

在Supabase Dashboard中配置定时任务:

```sql
-- 每5分钟同步一次物流状态
SELECT cron.schedule(
  'sync-logistics-status',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sync-logistics-status',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### 或使用外部Cron服务

使用GitHub Actions、AWS EventBridge等:

```yaml
# .github/workflows/sync-logistics.yml
name: Sync Logistics Status

on:
  schedule:
    - cron: '*/5 * * * *'  # 每5分钟

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://your-project.supabase.co/functions/v1/sync-logistics-status \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## 环境变量配置

需要在Supabase Dashboard中配置以下环境变量:

```bash
# 微信企业号
WECHAT_ACCESS_TOKEN=your_wechat_token
WECHAT_AGENT_ID=your_agent_id

# Line Notify
LINE_ACCESS_TOKEN=your_line_token

# 物流API
COSCO_API_KEY=your_cosco_key
FEDEX_ACCESS_TOKEN=your_fedex_token
DHL_API_KEY=your_dhl_key
```

## 性能优化

### 1. 批量更新

```typescript
// 批量插入物流事件
const eventsToInsert = apiResponse.events.filter(
  event => !existingEvents.includes(event.id)
);

await supabase
  .from('logistics_events')
  .insert(eventsToInsert);
```

### 2. 缓存策略

```typescript
// 缓存物流API响应(5分钟)
const cacheKey = `logistics:${trackingNumber}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchLogisticsAPI(trackingNumber);
await redis.setex(cacheKey, 300, JSON.stringify(data));
return data;
```

### 3. 地图性能

```typescript
// 使用聚合标记(大量标记时)
const markers = L.markerClusterGroup();
events.forEach(event => {
  markers.addLayer(L.marker([event.latitude, event.longitude]));
});
map.addLayer(markers);
```

## 使用流程

### 操作员视角

1. **查看物流列表**: 访问 `/logistics`
2. **点击查看详情**: 进入物流详情页
3. **查看地图轨迹**: 在地图上查看货物位置
4. **播放轨迹回放**: 点击播放按钮查看运输过程
5. **手动同步**: 点击"同步状态"获取最新信息

### 管理员视角

1. **监控物流状态**: 查看所有在途货物
2. **接收异常告警**: 微信/Line收到通知
3. **查看异常详情**: 点击查看具体异常信息
4. **联系物流商**: 根据异常类型采取行动
5. **更新状态**: 问题解决后状态自动更新

## 扩展功能建议

### 1. 预测到达时间
- 使用机器学习预测实际到达时间
- 基于历史数据和实时路况
- 提供置信区间

### 2. 路径优化
- 分析历史路径数据
- 推荐最优运输路线
- 计算成本和时效

### 3. 多式联运
- 支持海运+陆运组合
- 自动切换不同物流商
- 统一跟踪界面

### 4. 区块链溯源
- 使用区块链记录关键节点
- 防篡改物流数据
- 提供可信证明

## 总结

本模块完整实现了国际物流跟踪系统,具备:
- ✅ 第三方物流API集成(中远海运、FedEx等)
- ✅ 实时地图轨迹显示(Leaflet)
- ✅ 轨迹回放功能
- ✅ 异常预警引擎(延误、清关扣货等)
- ✅ 多渠道通知推送(微信、Line、邮件)
- ✅ 实时状态同步(Supabase Realtime)
- ✅ 定时任务(Edge Function Cron)

系统基于Supabase Serverless架构,无需维护服务器,自动扩展,满足国际物流业务的严格要求。
