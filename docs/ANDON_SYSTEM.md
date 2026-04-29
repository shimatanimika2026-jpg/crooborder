# 日本组装执行模块 (Andon系统) 完整文档

## 系统概述

本模块实现了日本制造业标准的Andon(安灯)系统,用于实时监控生产线工位状态、标准作业指导和异常管理。

## 核心功能

### 1. 电子看板 (Andon Board)
- **实时工位状态监控**: 绿灯(正常)/黄灯(注意)/红灯(停止)
- **多产线视图**: 支持按产线筛选工位
- **状态统计**: 实时显示各状态工位数量
- **自动刷新**: 使用Supabase Realtime实现≤5秒延迟
- **异常告警**: 红灯状态自动弹出通知

### 2. 工位详情页面
- **工位信息**: 编号、产线、类型、二维码
- **状态控制**: 一键切换绿/黄/红灯状态
- **SOP查看**: 双语标准作业指导书
- **异常上报**: 一键上报异常(带类型和描述)

### 3. 标准作业指导书 (SOP)
- **多媒体支持**: 视频、图片、PDF
- **双语内容**: 中文/日文自动切换
- **按工位类型分类**: 组装/检验/包装/测试

### 4. 异常上报
- **异常类型**: 设备故障/质量问题/物料短缺/安全隐患/其他
- **详细描述**: 文本输入框
- **自动停线**: 上报后自动切换为红灯
- **实时通知**: 异常信息实时推送

## 数据库表结构

### work_stations (工位表)

```sql
CREATE TABLE work_stations (
  id SERIAL PRIMARY KEY,
  station_code TEXT UNIQUE NOT NULL,           -- 工位编号
  station_name_zh TEXT NOT NULL,               -- 中文名称
  station_name_ja TEXT NOT NULL,               -- 日文名称
  production_line TEXT NOT NULL,               -- 产线
  station_type TEXT NOT NULL,                  -- 工位类型
  andon_status TEXT NOT NULL DEFAULT 'green',  -- Andon状态
  current_task_id INTEGER,                     -- 当前任务
  operator_id UUID,                            -- 操作员
  qr_code TEXT UNIQUE,                         -- 二维码
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**字段说明**:
- `station_type`: assembly(组装) | inspection(检验) | packaging(包装) | testing(测试)
- `andon_status`: green(正常) | yellow(注意) | red(停止)

### sop_documents (SOP文档表)

```sql
CREATE TABLE sop_documents (
  id SERIAL PRIMARY KEY,
  sop_code TEXT UNIQUE NOT NULL,
  title_zh TEXT NOT NULL,
  title_ja TEXT NOT NULL,
  station_type TEXT NOT NULL,
  content_type TEXT NOT NULL,                  -- video | image | pdf | mixed
  video_url_zh TEXT,
  video_url_ja TEXT,
  images_zh TEXT[],
  images_ja TEXT[],
  pdf_url_zh TEXT,
  pdf_url_ja TEXT,
  description_zh TEXT,
  description_ja TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### work_station_status_logs (状态变更日志表)

```sql
CREATE TABLE work_station_status_logs (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## API使用示例

### 1. 查询所有工位

```typescript
const { data, error } = await supabase
  .from('work_stations')
  .select('*')
  .eq('is_active', true)
  .order('station_code', { ascending: true });
```

### 2. 更新工位状态

```typescript
const { error } = await supabase
  .from('work_stations')
  .update({ andon_status: 'red' })
  .eq('id', stationId);
```

### 3. 查询工位相关SOP

```typescript
const { data, error } = await supabase
  .from('sop_documents')
  .select('*')
  .eq('station_type', 'assembly')
  .eq('is_active', true);
```

### 4. 上报异常

```typescript
const { error } = await supabase
  .from('assembly_anomalies')
  .insert({
    task_id: taskId,
    anomaly_type: 'equipment_failure',
    description: '机械臂无法启动',
    severity: 'high',
    status: 'reported',
    reported_by: userId,
  });
```

## 实时订阅 (Supabase Realtime)

### 订阅所有工位状态变更

```typescript
const channel = supabase
  .channel('work-stations-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'work_stations',
    },
    (payload) => {
      console.log('工位状态变更:', payload);
      
      // 更新UI
      if (payload.eventType === 'UPDATE') {
        updateStationInList(payload.new);
      }
      
      // 红灯告警
      if (payload.new.andon_status === 'red') {
        showAlert(`${payload.new.station_name_zh} 异常停线!`);
      }
    }
  )
  .subscribe();
```

### 订阅特定工位

```typescript
const channel = supabase
  .channel(`station-${stationId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'work_stations',
      filter: `id=eq.${stationId}`,
    },
    (payload) => {
      setStation(payload.new);
    }
  )
  .subscribe();
```

## 前端组件

### 1. AndonBoardPage (电子看板页面)

**路径**: `/assembly/andon`

**功能**:
- 显示所有工位的实时状态
- 按产线筛选
- 状态统计卡片
- 点击工位跳转详情页

**关键代码**:
```typescript
// Andon灯颜色
const getAndonColor = (status: string) => {
  const colorMap = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  return colorMap[status];
};

// 实时订阅
useEffect(() => {
  const channel = supabase
    .channel('work-stations-changes')
    .on('postgres_changes', { ... }, handleChange)
    .subscribe();
  
  return () => channel.unsubscribe();
}, []);
```

### 2. WorkStationDetailPage (工位详情页面)

**路径**: `/assembly/stations/:id`

**功能**:
- 显示工位详细信息
- 状态控制按钮(绿/黄/红)
- SOP文档列表
- 异常上报对话框

**关键代码**:
```typescript
// 状态切换
const handleStatusChange = async (newStatus: 'green' | 'yellow' | 'red') => {
  await supabase
    .from('work_stations')
    .update({ andon_status: newStatus })
    .eq('id', stationId);
};

// 异常上报
const handleReportAnomaly = async () => {
  await supabase.from('assembly_anomalies').insert({
    anomaly_type,
    description,
    severity: 'high',
  });
  
  // 自动切换红灯
  await handleStatusChange('red');
};
```

## 二维码扫描功能

### 工位二维码格式

每个工位都有唯一的二维码,格式为:
```
QR-WS-JP-A01
```

### 扫描跳转

扫描二维码后,跳转到工位详情页:
```typescript
// 扫描结果: QR-WS-JP-A01
const stationCode = qrResult;

// 查询工位ID
const { data } = await supabase
  .from('work_stations')
  .select('id')
  .eq('qr_code', stationCode)
  .maybeSingle();

// 跳转详情页
navigate(`/assembly/stations/${data.id}`);
```

### 移动端扫码

使用手机浏览器或App扫描工位二维码,可直接打开工位详情页面,查看SOP和上报异常。

## 日式简洁UI设计

### 设计原则

1. **极简主义**: 去除不必要的装饰,专注信息传达
2. **清晰层级**: 通过字号、字重、间距构建信息层级
3. **温和对比**: 避免强烈对比,确保长时间观看舒适
4. **大量留白**: 提供视觉呼吸空间
5. **Andon颜色**: 使用工业标准的绿/黄/红三色

### 颜色系统

```css
/* Andon灯颜色 */
--andon-green: #22c55e;   /* 正常运行 */
--andon-yellow: #eab308;  /* 需要注意 */
--andon-red: #ef4444;     /* 停线异常 */

/* 背景色 */
--background: 0 0% 100%;  /* 白色背景 */
--muted: 0 0% 96%;        /* 浅灰背景 */

/* 文字色 */
--foreground: 0 0% 9%;    /* 深灰文字 */
--muted-foreground: 0 0% 45%; /* 次要文字 */
```

### 组件样式

```tsx
// 工位卡片
<Card className="cursor-pointer transition-all hover:shadow-lg">
  {/* Andon灯 */}
  <div className={`h-12 w-12 rounded-full ${getAndonColor(status)} animate-pulse`} />
  
  {/* 状态文字 */}
  <p className="font-normal">{getStatusText(status)}</p>
</Card>

// 状态按钮
<Button variant="outline" onClick={() => handleStatusChange('green')}>
  <div className="flex items-center gap-2">
    <div className="h-3 w-3 rounded-full bg-green-500" />
    正常
  </div>
</Button>
```

## 性能优化

### 1. 实时更新优化

```typescript
// 使用Supabase Realtime替代轮询
// ❌ 不推荐: 轮询
setInterval(() => {
  loadStations();
}, 5000);

// ✅ 推荐: Realtime订阅
supabase.channel('stations').on('postgres_changes', ...).subscribe();
```

### 2. 状态管理优化

```typescript
// 局部更新,避免重新加载整个列表
setStations((prev) =>
  prev.map((station) =>
    station.id === updatedStation.id ? updatedStation : station
  )
);
```

### 3. 图片懒加载

```tsx
// SOP图片懒加载
<img src={imageUrl} loading="lazy" alt="SOP" />
```

## 移动端适配

### 响应式布局

```tsx
// 工位网格: 手机1列,平板2列,桌面4列
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {stations.map(station => <StationCard key={station.id} />)}
</div>
```

### 触摸优化

```tsx
// 增大点击区域
<Button size="lg" className="min-h-[48px]">
  异常上报
</Button>
```

## 多语言支持

### 自动切换

```typescript
// 根据用户语言偏好自动显示
const stationName = i18n.language === 'ja-JP' 
  ? station.station_name_ja 
  : station.station_name_zh;
```

### 翻译键

```json
{
  "assembly": {
    "andonBoard": "電子看板",
    "workStation": "工程",
    "green": "正常",
    "yellow": "注意",
    "red": "停止",
    "anomalyReport": "異常報告"
  }
}
```

## 使用流程

### 操作员视角

1. **打开电子看板**: 访问 `/assembly/andon`
2. **查看工位状态**: 绿灯正常,黄灯注意,红灯停止
3. **扫描二维码**: 手机扫描工位二维码
4. **查看SOP**: 观看标准作业视频/图片
5. **上报异常**: 发现问题点击"异常上报"
6. **填写详情**: 选择异常类型,填写描述
7. **提交**: 系统自动切换红灯,通知管理员

### 管理员视角

1. **监控看板**: 实时查看所有工位状态
2. **接收告警**: 红灯自动弹出通知
3. **查看详情**: 点击工位查看异常信息
4. **处理异常**: 到现场处理问题
5. **恢复生产**: 问题解决后切换绿灯

## 扩展功能建议

### 1. 工时统计
- 记录每个工位的作业时间
- 计算标准工时与实际工时差异
- 生成效率分析报表

### 2. 视频监控集成
- 在工位详情页嵌入实时视频流
- 异常上报时自动截图
- 录像回放功能

### 3. 语音播报
- 红灯时自动语音播报异常
- 支持中日双语播报
- 可调节音量和播报频率

### 4. 数据分析
- 异常类型Pareto图
- 工位停线时间统计
- 产线效率OEE计算

### 5. 移动App
- 原生iOS/Android App
- 推送通知
- 离线缓存SOP

## 总结

本模块完整实现了日本制造业标准的Andon系统,具备:
- ✅ 实时工位状态监控
- ✅ 三色Andon灯(绿/黄/红)
- ✅ 双语SOP查看
- ✅ 一键异常上报
- ✅ 二维码扫描
- ✅ 实时通知推送
- ✅ 日式简洁UI
- ✅ 移动端适配

系统基于Supabase Realtime实现≤5秒延迟的实时同步,满足精益生产(TPS)的严格要求。
