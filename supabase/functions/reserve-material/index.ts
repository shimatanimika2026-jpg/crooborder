import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ReserveMaterialRequest {
  receiving_record_item_id: number;
  reserved_qty: number;
  source_type: 'assembly' | 'rework' | 'testing' | 'other';
  source_id?: number;
  source_reference?: string;
  part_type?: string;
  notes?: string;
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

    const body: ReserveMaterialRequest = await req.json();
    const {
      receiving_record_item_id,
      reserved_qty,
      source_type,
      source_id,
      source_reference,
      part_type,
      notes,
    } = body;

    // 验证参数
    if (!receiving_record_item_id || !reserved_qty || reserved_qty <= 0) {
      throw new Error('参数错误');
    }

    // 检查物料可用性
    const { data: checkResult, error: checkError } = await supabaseClient.rpc(
      'check_material_availability',
      {
        p_receiving_item_id: receiving_record_item_id,
        p_required_qty: reserved_qty,
        p_part_type: part_type || null,
      }
    );

    if (checkError) {
      throw new Error(`检查可用性失败: ${checkError.message}`);
    }

    if (!checkResult.available) {
      return new Response(
        JSON.stringify({
          success: false,
          error: checkResult.reason,
          error_code: checkResult.error_code,
          data: checkResult,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // 生成预占编号
    const { data: reservationCode, error: codeError } = await supabaseClient.rpc(
      'generate_reservation_code'
    );
    if (codeError) {
      throw new Error(`生成预占编号失败: ${codeError.message}`);
    }

    // 开始事务：创建预占记录 + 更新库存数量
    const { data: reservation, error: reservationError } = await supabaseClient
      .from('material_reservations')
      .insert({
        reservation_code: reservationCode,
        receiving_record_item_id,
        reserved_qty,
        reserved_by: user.id,
        source_type,
        source_id,
        source_reference,
        status: 'active',
        notes,
      })
      .select()
      .single();

    if (reservationError) {
      throw new Error(`创建预占记录失败: ${reservationError.message}`);
    }

    // 更新库存数量
    const { error: updateError } = await supabaseClient.rpc('update_inventory_on_reserve', {
      p_receiving_item_id: receiving_record_item_id,
      p_reserved_qty: reserved_qty,
    });

    if (updateError) {
      // 回滚：删除预占记录
      await supabaseClient
        .from('material_reservations')
        .delete()
        .eq('id', reservation.id);
      throw new Error(`更新库存失败: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: reservation,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('预占物料失败:', error);
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
