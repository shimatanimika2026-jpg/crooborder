import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogisticsAPIResponse {
  tracking_number: string;
  current_status: string;
  current_location: string;
  latitude: number;
  longitude: number;
  estimated_arrival: string;
  events: Array<{
    event_type: string;
    location: string;
    latitude: number;
    longitude: number;
    description: string;
    occurred_at: string;
  }>;
}

// 模拟调用第三方物流API
async function fetchLogisticsStatus(
  trackingNumber: string,
  shippingMethod: string
): Promise<LogisticsAPIResponse | null> {
  try {
    // 实际项目中,这里应该调用真实的物流API
    // 例如: FedEx API, 中远海运API等
    
    // 模拟API响应
    const mockResponse: LogisticsAPIResponse = {
      tracking_number: trackingNumber,
      current_status: 'in_transit',
      current_location: '上海港',
      latitude: 31.2304,
      longitude: 121.4737,
      estimated_arrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          event_type: 'picked_up',
          location: '深圳工厂',
          latitude: 22.5431,
          longitude: 114.0579,
          description: '货物已从工厂提取',
          occurred_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          event_type: 'in_transit',
          location: '上海港',
          latitude: 31.2304,
          longitude: 121.4737,
          description: '货物已到达上海港,准备装船',
          occurred_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };

    // 随机模拟延误情况(10%概率)
    if (Math.random() < 0.1) {
      mockResponse.current_status = 'delayed';
      mockResponse.events.push({
        event_type: 'delayed',
        location: mockResponse.current_location,
        latitude: mockResponse.latitude,
        longitude: mockResponse.longitude,
        description: '因天气原因,货物延误',
        occurred_at: new Date().toISOString(),
      });
    }

    // 随机模拟清关扣货(5%概率)
    if (Math.random() < 0.05) {
      mockResponse.current_status = 'customs_hold';
      mockResponse.events.push({
        event_type: 'customs_hold',
        location: '东京海关',
        latitude: 35.6762,
        longitude: 139.6503,
        description: '货物被海关扣留,需要补充文件',
        occurred_at: new Date().toISOString(),
      });
    }

    return mockResponse;
  } catch (error) {
    console.error('调用物流API失败:', error);
    return null;
  }
}

// 检测异常状态
function detectAnomalies(
  currentStatus: string,
  estimatedArrival: string,
  events: Array<{ event_type: string }>
): Array<{ type: string; severity: string; message: string }> {
  const anomalies = [];

  // 检测延误
  if (currentStatus === 'delayed') {
    anomalies.push({
      type: 'delayed',
      severity: 'high',
      message: '货物运输延误',
    });
  }

  // 检测清关扣货
  if (currentStatus === 'customs_hold') {
    anomalies.push({
      type: 'customs_hold',
      severity: 'critical',
      message: '货物被海关扣留',
    });
  }

  // 检测预计到达时间超期
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

  // 检测长时间无更新
  const lastEvent = events[events.length - 1];
  if (lastEvent) {
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
  }

  return anomalies;
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查询所有在途物流
    const { data: shippingOrders, error: queryError } = await supabase
      .from('shipping_orders')
      .select('*')
      .in('current_status', ['preparing', 'shipped', 'in_transit', 'customs']);

    if (queryError) throw queryError;

    const results = [];

    for (const order of shippingOrders || []) {
      // 调用物流API获取最新状态
      const apiResponse = await fetchLogisticsStatus(
        order.tracking_number,
        order.shipping_method
      );

      if (!apiResponse) continue;

      // 更新物流跟踪记录
      const { error: updateError } = await supabase
        .from('logistics_tracking')
        .upsert({
          shipping_order_id: order.id,
          tracking_number: order.tracking_number,
          current_status: apiResponse.current_status,
          current_location: apiResponse.current_location,
          latitude: apiResponse.latitude,
          longitude: apiResponse.longitude,
          estimated_arrival: apiResponse.estimated_arrival,
          last_updated: new Date().toISOString(),
        });

      if (updateError) {
        console.error('更新物流跟踪失败:', updateError);
        continue;
      }

      // 插入新的物流事件
      for (const event of apiResponse.events) {
        // 检查事件是否已存在
        const { data: existingEvent } = await supabase
          .from('logistics_events')
          .select('id')
          .eq('tracking_number', order.tracking_number)
          .eq('event_type', event.event_type)
          .eq('occurred_at', event.occurred_at)
          .maybeSingle();

        if (!existingEvent) {
          await supabase.from('logistics_events').insert({
            tracking_number: order.tracking_number,
            event_type: event.event_type,
            location: event.location,
            latitude: event.latitude,
            longitude: event.longitude,
            description: event.description,
            occurred_at: event.occurred_at,
          });
        }
      }

      // 检测异常
      const anomalies = detectAnomalies(
        apiResponse.current_status,
        apiResponse.estimated_arrival,
        apiResponse.events
      );

      // 如果有异常,触发告警
      if (anomalies.length > 0) {
        for (const anomaly of anomalies) {
          // 调用通知服务
          await supabase.functions.invoke('send-logistics-alert', {
            body: {
              tracking_number: order.tracking_number,
              shipping_code: order.shipping_code,
              anomaly_type: anomaly.type,
              severity: anomaly.severity,
              message: anomaly.message,
            },
          });
        }
      }

      results.push({
        tracking_number: order.tracking_number,
        status: apiResponse.current_status,
        anomalies: anomalies.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('物流状态同步失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
