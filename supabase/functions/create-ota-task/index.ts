import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOTATaskRequest {
  task_name: string;
  firmware_version_id: number;
  target_type: 'all' | 'batch' | 'single';
  target_filter?: {
    device_ids?: number[];
    production_line?: string;
    firmware_version?: string;
  };
  schedule_type: 'immediate' | 'scheduled';
  scheduled_at?: string;
  rollback_enabled?: boolean;
  auto_rollback_on_failure?: boolean;
  failure_threshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 获取用户信息
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('未授权');
    }

    const requestData: CreateOTATaskRequest = await req.json();

    // 验证固件版本
    const { data: firmwareVersion, error: fvError } = await supabase
      .from('firmware_versions')
      .select('*')
      .eq('id', requestData.firmware_version_id)
      .eq('is_active', true)
      .maybeSingle();

    if (fvError || !firmwareVersion) {
      throw new Error('固件版本不存在或已停用');
    }

    // 生成任务编号
    const taskCode = `OTA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 查询目标设备
    let targetDevices = [];
    
    if (requestData.target_type === 'all') {
      // 查询所有设备
      const { data: devices } = await supabase
        .from('cobot_devices')
        .select('id, device_code, device_name, current_firmware_version')
        .eq('is_active', true);
      
      targetDevices = devices || [];
    } else if (requestData.target_type === 'batch' && requestData.target_filter) {
      // 批量查询
      let query = supabase
        .from('cobot_devices')
        .select('id, device_code, device_name, current_firmware_version')
        .eq('is_active', true);

      if (requestData.target_filter.production_line) {
        query = query.eq('production_line', requestData.target_filter.production_line);
      }

      if (requestData.target_filter.firmware_version) {
        query = query.eq('current_firmware_version', requestData.target_filter.firmware_version);
      }

      const { data: devices } = await query;
      targetDevices = devices || [];
    } else if (requestData.target_type === 'single' && requestData.target_filter?.device_ids) {
      // 单台或指定设备
      const { data: devices } = await supabase
        .from('cobot_devices')
        .select('id, device_code, device_name, current_firmware_version')
        .in('id', requestData.target_filter.device_ids);
      
      targetDevices = devices || [];
    }

    if (targetDevices.length === 0) {
      throw new Error('未找到符合条件的设备');
    }

    // 创建OTA任务
    const { data: task, error: taskError } = await supabase
      .from('ota_tasks')
      .insert({
        task_code: taskCode,
        task_name: requestData.task_name,
        firmware_version_id: requestData.firmware_version_id,
        target_type: requestData.target_type,
        target_filter: requestData.target_filter || null,
        schedule_type: requestData.schedule_type,
        scheduled_at: requestData.scheduled_at || null,
        status: requestData.schedule_type === 'immediate' ? 'running' : 'pending',
        total_devices: targetDevices.length,
        rollback_enabled: requestData.rollback_enabled ?? true,
        auto_rollback_on_failure: requestData.auto_rollback_on_failure ?? true,
        failure_threshold: requestData.failure_threshold ?? 3,
        created_by: user.id,
        tenant_id: 'tenant-001',
        started_at: requestData.schedule_type === 'immediate' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // 创建任务设备关联
    const taskDevices = targetDevices.map((device: any) => ({
      task_id: task.id,
      device_id: device.id,
      device_code: device.device_code,
      device_name: device.device_name,
      current_version: device.current_firmware_version || 'unknown',
      target_version: firmwareVersion.version_code,
      status: 'pending',
    }));

    const { error: devicesError } = await supabase
      .from('ota_task_devices')
      .insert(taskDevices);

    if (devicesError) throw devicesError;

    // 记录日志
    await supabase.from('ota_logs').insert({
      task_id: task.id,
      device_id: 0,
      device_code: 'system',
      log_type: 'info',
      log_stage: 'pre_upgrade',
      message: `OTA任务创建成功: ${task.task_name}`,
      details: {
        target_devices: targetDevices.length,
        firmware_version: firmwareVersion.version_code,
      },
    });

    // 如果是立即执行,触发升级
    if (requestData.schedule_type === 'immediate') {
      // 调用执行升级的Edge Function
      await supabase.functions.invoke('execute-ota-upgrade', {
        body: { task_id: task.id },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        task,
        target_devices: targetDevices.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('创建OTA任务失败:', error);
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
