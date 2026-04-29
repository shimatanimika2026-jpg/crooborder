import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { task_id, device_ids } = await req.json();

    // 查询任务信息
    const { data: task, error: taskError } = await supabase
      .from('ota_tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      throw new Error('任务不存在');
    }

    if (!task.rollback_enabled) {
      throw new Error('该任务未启用回滚功能');
    }

    // 查询需要回滚的设备
    let query = supabase
      .from('ota_task_devices')
      .select('*')
      .eq('task_id', task_id)
      .eq('status', 'failed');

    if (device_ids && device_ids.length > 0) {
      query = query.in('device_id', device_ids);
    }

    const { data: devices, error: devicesError } = await query;

    if (devicesError) throw devicesError;

    if (!devices || devices.length === 0) {
      throw new Error('没有需要回滚的设备');
    }

    const results = [];

    for (const device of devices) {
      try {
        // 查询设备的上一个版本
        const { data: history } = await supabase
          .from('device_firmware_history')
          .select('version_code, firmware_version_id')
          .eq('device_id', device.device_id)
          .eq('success', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!history) {
          throw new Error('未找到可回滚的版本');
        }

        // 查询固件信息
        const { data: firmware } = await supabase
          .from('firmware_versions')
          .select('*')
          .eq('id', history.firmware_version_id)
          .single();

        if (!firmware) {
          throw new Error('固件版本不存在');
        }

        // 更新设备状态为回滚中
        await supabase
          .from('ota_task_devices')
          .update({
            status: 'downloading',
            rollback_at: new Date().toISOString(),
          })
          .eq('id', device.id);

        // 记录回滚日志
        await supabase.from('ota_logs').insert({
          task_id: task.id,
          device_id: device.device_id,
          device_code: device.device_code,
          log_type: 'warning',
          log_stage: 'rollback',
          message: `开始回滚到版本: ${history.version_code}`,
          details: {
            failed_version: device.target_version,
            rollback_version: history.version_code,
            error_message: device.error_message,
          },
        });

        // 发送回滚指令到设备
        // 实际项目中通过MQTT/WebSocket发送
        console.log(`向设备 ${device.device_code} 发送回滚指令`);

        // 模拟回滚成功
        await supabase
          .from('ota_task_devices')
          .update({
            status: 'rolled_back',
            completed_at: new Date().toISOString(),
          })
          .eq('id', device.id);

        // 记录固件历史
        await supabase.from('device_firmware_history').insert({
          device_id: device.device_id,
          device_code: device.device_code,
          firmware_version_id: firmware.id,
          version_code: firmware.version_code,
          upgrade_type: 'rollback',
          task_id: task.id,
          previous_version: device.target_version,
          success: true,
          tenant_id: task.tenant_id,
        });

        results.push({
          device_code: device.device_code,
          status: 'rolled_back',
          rollback_version: history.version_code,
        });
      } catch (error) {
        console.error(`回滚设备 ${device.device_code} 失败:`, error);
        
        await supabase.from('ota_logs').insert({
          task_id: task.id,
          device_id: device.device_id,
          device_code: device.device_code,
          log_type: 'error',
          log_stage: 'rollback',
          message: `回滚失败: ${error.message}`,
        });

        results.push({
          device_code: device.device_code,
          status: 'rollback_failed',
          error: error.message,
        });
      }
    }

    // 更新任务的回滚统计
    const rolledBackCount = results.filter(r => r.status === 'rolled_back').length;
    
    await supabase
      .from('ota_tasks')
      .update({
        failed_count: task.failed_count - rolledBackCount,
      })
      .eq('id', task_id);

    return new Response(
      JSON.stringify({
        success: true,
        task_id,
        devices_rolled_back: rolledBackCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('固件回滚失败:', error);
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
