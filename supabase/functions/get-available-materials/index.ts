import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface GetAvailableMaterialsRequest {
  part_type?: string;
  part_no?: string;
  batch_no?: string;
  model_code?: string;  // 新增：机型代码（FR3/FR5）
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

    const { part_type, part_no, batch_no, model_code }: GetAvailableMaterialsRequest = await req.json();

    // 构建查询
    let query = supabaseClient
      .from('receiving_record_items')
      .select('*')
      .gt('available_qty', 0); // 只查询可用数量 > 0 的

    if (part_type) {
      query = query.eq('part_type', part_type);
    }
    if (part_no) {
      query = query.ilike('part_no', `%${part_no}%`);
    }
    if (batch_no) {
      query = query.ilike('batch_no', `%${batch_no}%`);
    }
    // 新增：按机型代码过滤（FR3/FR5）
    if (model_code) {
      query = query.ilike('part_no', `%${model_code}%`);
    }

    const { data: items, error: queryError } = await query;

    if (queryError) {
      throw new Error(`查询可用物料失败: ${queryError.message}`);
    }

    // 对于关键件，需要额外过滤已被绑定的和已被预占的
    const criticalPartTypes = ['control_box', 'teaching_pendant', 'main_board', 'servo_driver', 'power_supply', 'controller'];
    
    if (part_type && criticalPartTypes.includes(part_type)) {
      // 1. 查询已被绑定的关键件（is_consumed = true）
      const { data: boundItems, error: boundError } = await supabaseClient
        .from('assembly_part_material_mapping')
        .select('receiving_record_item_id')
        .eq('is_consumed', true)
        .not('receiving_record_item_id', 'is', null);

      if (boundError) {
        throw new Error(`查询已绑定关键件失败: ${boundError.message}`);
      }

      const boundItemIds = new Set(boundItems?.map(item => item.receiving_record_item_id) || []);

      // 2. 查询已被预占的关键件（status = 'active'）
      const { data: reservedItems, error: reservedError } = await supabaseClient
        .from('material_reservations')
        .select('receiving_record_item_id')
        .eq('status', 'active');

      if (reservedError) {
        throw new Error(`查询已预占关键件失败: ${reservedError.message}`);
      }

      const reservedItemIds = new Set(reservedItems?.map(item => item.receiving_record_item_id) || []);

      // 3. 过滤掉已被绑定的和已被预占的关键件
      const availableItems = items?.filter(item => 
        !boundItemIds.has(item.id) && !reservedItemIds.has(item.id)
      ) || [];

      return new Response(
        JSON.stringify({
          success: true,
          data: availableItems,
          total: availableItems.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: items || [],
        total: items?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('获取可用物料失败:', error);
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
