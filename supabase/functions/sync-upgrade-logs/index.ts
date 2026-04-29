import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 同步日志到日本工厂服务器
async function syncLogsToJapan(logs: any[]): Promise<boolean> {
  try {
    const japanServerUrl = Deno.env.get('JAPAN_SERVER_URL');
    const japanApiKey = Deno.env.get('JAPAN_API_KEY');

    if (!japanServerUrl || !japanApiKey) {
      console.warn('日本服务器配置未设置');
      return false;
    }

    // 发送日志到日本服务器
    const response = await fetch(`${japanServerUrl}/api/ota-logs/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${japanApiKey}`,
      },
      body: JSON.stringify({
        logs,
        timestamp: new Date().toISOString(),
        source: 'china-factory',
      }),
    });

    if (!response.ok) {
      throw new Error(`同步失败: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('同步日志到日本失败:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查询未同步的日志
    const { data: logs, error: logsError } = await supabase
      .from('ota_logs')
      .select('*')
      .eq('synced_to_japan', false)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (logsError) throw logsError;

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '没有需要同步的日志',
          synced_count: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 同步日志到日本
    const syncSuccess = await syncLogsToJapan(logs);

    if (syncSuccess) {
      // 标记日志为已同步
      const logIds = logs.map(log => log.id);
      
      await supabase
        .from('ota_logs')
        .update({
          synced_to_japan: true,
          synced_at: new Date().toISOString(),
        })
        .in('id', logIds);

      return new Response(
        JSON.stringify({
          success: true,
          synced_count: logs.length,
          message: `成功同步 ${logs.length} 条日志到日本工厂`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // 同步失败,记录错误但不标记为已同步
      return new Response(
        JSON.stringify({
          success: false,
          error: '同步到日本工厂失败',
          pending_count: logs.length,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('同步日志失败:', error);
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
