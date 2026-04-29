import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PartMaterial {
  part_type: string;
  part_no: string;
  batch_no: string;
  receiving_record_item_id: number;
  quantity: number;
}

interface CreateAssembledUnitRequest {
  finished_product_sn: string;
  product_model_id: number;
  control_box_sn: string;
  teaching_pendant_sn: string;
  main_board_sn?: string;
  firmware_version?: string;
  software_version?: string;
  binding_operator_id: string;
  tenant_id: string;
  factory_id: string;
  parts: PartMaterial[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 获取当前用户
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('未授权');
    }

    const body: CreateAssembledUnitRequest = await req.json();
    const {
      finished_product_sn,
      product_model_id,
      control_box_sn,
      teaching_pendant_sn,
      main_board_sn,
      firmware_version,
      software_version,
      binding_operator_id,
      tenant_id,
      factory_id,
      parts,
    } = body;

    // 验证参数
    if (!finished_product_sn || !product_model_id || !control_box_sn || !teaching_pendant_sn || !parts || parts.length === 0) {
      throw new Error('参数错误：缺少必要字段');
    }

    // 调用原子事务函数
    const { data: result, error: atomicError } = await supabaseClient.rpc(
      'create_assembled_unit_atomic',
      {
        p_finished_product_sn: finished_product_sn,
        p_product_model_id: product_model_id,
        p_control_box_sn: control_box_sn,
        p_teaching_pendant_sn: teaching_pendant_sn,
        p_main_board_sn: main_board_sn || null,
        p_firmware_version: firmware_version || null,
        p_software_version: software_version || null,
        p_binding_operator_id: binding_operator_id || user.id,
        p_tenant_id: tenant_id,
        p_factory_id: factory_id,
        p_parts: parts,  // ✅ 修复：直接传 JSON 数组，不要 JSON.stringify
      }
    );

    if (atomicError) {
      throw new Error(`创建组装整机失败: ${atomicError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('创建组装整机失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
