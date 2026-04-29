import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 模拟向设备发送OTA指令
async function sendOTACommandToDevice(
  deviceCode: string,
  firmwareUrl: string,
  firmwareHash: string,
  taskId: number
): Promise<boolean> {
  try {
    // 实际项目中,这里应该通过MQTT、WebSocket或HTTP API向设备发送升级指令
    // 设备收到指令后开始下载和安装固件
    
    console.log(`向设备 ${deviceCode} 发送OTA指令`);
    console.log(`固件URL: ${firmwareUrl}`);
    console.log(`固件Hash: ${firmwareHash}`);
    console.log(`任务ID: ${taskId}`);

    // 模拟MQTT消息
    const otaCommand = {
      command: 'ota_upgrade',
      task_id: taskId,
      firmware_url: firmwareUrl,
      firmware_hash: firmwareHash,
      timestamp: Date.now(),
    };

    // 实际代码示例:
    // await mqttClient.publish(`device/${deviceCode}/ota/command`, JSON.stringify(otaCommand));
    
    return true;
  } catch (error) {
    console.error(`向设备 ${deviceCode} 发送OTA指令失败:`, error);
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

    const { task_id } = await req.json();

    // 查询任务信息
    const { data: task, error: taskError } = await supabase
      .from('ota_tasks')
      .select(`
        *,
        firmware_versions (
          version_code,
          file_url,
          file_hash
        )
      `)
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      throw new Error('任务不存在');
    }

    // 查询待升级设备
    const { data: devices, error: devicesError } = await supabase
      .from('ota_task_devices')
      .select('*')
      .eq('task_id', task_id)
      .eq('status', 'pending');

    if (devicesError) throw devicesError;

    if (!devices || devices.length === 0) {
      throw new Error('没有待升级的设备');
    }

    const results = [];

    // 逐个设备发送升级指令
    for (const device of devices) {
      try {
        // 记录开始下载
        await supabase
          .from('ota_task_devices')
          .update({
            status: 'downloading',
            download_started_at: new Date().toISOString(),
          })
          .eq('id', device.id);

        // 记录日志
        await supabase.from('ota_logs').insert({
          task_id: task.id,
          device_id: device.device_id,
          device_code: device.device_code,
          log_type: 'info',
          log_stage: 'downloading',
          message: `开始下载固件: ${task.firmware_versions.version_code}`,
          details: {
            firmware_url: task.firmware_versions.file_url,
            current_version: device.current_version,
            target_version: device.target_version,
          },
        });

        // 发送OTA指令到设备
        const success = await sendOTACommandToDevice(
          device.device_code,
          task.firmware_versions.file_url,
          task.firmware_versions.file_hash,
          task.id
        );

        if (success) {
          results.push({
            device_code: device.device_code,
            status: 'command_sent',
          });
        } else {
          // 发送失败,标记为失败
          await supabase
            .from('ota_task_devices')
            .update({
              status: 'failed',
              error_message: '发送OTA指令失败',
              completed_at: new Date().toISOString(),
            })
            .eq('id', device.id);

          await supabase.from('ota_logs').insert({
            task_id: task.id,
            device_id: device.device_id,
            device_code: device.device_code,
            log_type: 'error',
            log_stage: 'downloading',
            message: '发送OTA指令失败',
          });

          results.push({
            device_code: device.device_code,
            status: 'failed',
          });
        }
      } catch (error) {
        console.error(`处理设备 ${device.device_code} 失败:`, error);
        results.push({
          device_code: device.device_code,
          status: 'error',
          error: error.message,
        });
      }
    }

    // 更新任务状态
    await supabase
      .from('ota_tasks')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', task_id);

    return new Response(
      JSON.stringify({
        success: true,
        task_id,
        devices_processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('执行OTA升级失败:', error);
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
