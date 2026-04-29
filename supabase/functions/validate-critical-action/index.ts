import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  action: 'approve_special' | 'qa_release' | 'shipment' | 'inventory_write';
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 验证用户身份
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '用户认证失败' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data }: ValidationRequest = await req.json();

    // 根据不同的动作执行不同的验证逻辑
    let validationResult: { valid: boolean; error?: string } = { valid: true };

    switch (action) {
      case 'approve_special':
        validationResult = await validateSpecialApproval(supabase, data, user.id);
        break;
      case 'qa_release':
        validationResult = await validateQARelease(supabase, data, user.id);
        break;
      case 'shipment':
        validationResult = await validateShipment(supabase, data, user.id);
        break;
      case 'inventory_write':
        validationResult = await validateInventoryWrite(supabase, data, user.id);
        break;
      default:
        validationResult = { valid: false, error: '未知的操作类型' };
    }

    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: '验证通过' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('验证失败:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 验证特采审批
async function validateSpecialApproval(supabase: any, data: Record<string, unknown>, userId: string) {
  const { inspection_id } = data;

  if (!inspection_id) {
    return { valid: false, error: '缺少检验单ID' };
  }

  // 检查检验单是否存在且状态为HOLD
  const { data: inspection, error } = await supabase
    .from('iqc_inspections')
    .select('id, result')
    .eq('id', inspection_id)
    .maybeSingle();

  if (error || !inspection) {
    return { valid: false, error: '检验单不存在' };
  }

  if (inspection.result !== 'HOLD') {
    return { valid: false, error: '只能对HOLD状态的检验单进行特采审批' };
  }

  return { valid: true };
}

// 验证QA放行
async function validateQARelease(supabase: any, data: Record<string, unknown>, userId: string) {
  const { finished_product_sn } = data;

  if (!finished_product_sn) {
    return { valid: false, error: '缺少整机序列号' };
  }

  // 检查整机是否完成Final Test
  const { data: finalTest, error: ftError } = await supabase
    .from('final_tests')
    .select('id, test_status')
    .eq('finished_product_sn', finished_product_sn)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ftError) {
    return { valid: false, error: '查询Final Test失败' };
  }

  if (!finalTest) {
    return { valid: false, error: '该整机尚未完成Final Test，无法进行QA放行' };
  }

  if (finalTest.test_status !== 'pass') {
    return { valid: false, error: '该整机Final Test未通过，无法进行QA放行' };
  }

  return { valid: true };
}

// 验证出货
async function validateShipment(supabase: any, data: Record<string, unknown>, userId: string) {
  const { finished_product_sn } = data;

  if (!finished_product_sn) {
    return { valid: false, error: '缺少整机序列号' };
  }

  // 检查整机是否完成QA放行
  const { data: qaRelease, error: qaError } = await supabase
    .from('qa_releases')
    .select('id, release_status')
    .eq('finished_product_sn', finished_product_sn)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (qaError) {
    return { valid: false, error: '查询QA放行失败' };
  }

  if (!qaRelease) {
    return { valid: false, error: '该整机尚未完成QA放行，无法出货' };
  }

  if (qaRelease.release_status !== 'approved') {
    return { valid: false, error: '该整机QA放行未通过，无法出货' };
  }

  return { valid: true };
}

// 验证库存写操作
async function validateInventoryWrite(supabase: any, data: Record<string, unknown>, userId: string) {
  const { operation_type, part_no, quantity } = data;

  if (!operation_type || !part_no || !quantity) {
    return { valid: false, error: '缺少必要参数' };
  }

  // 如果是消耗操作，检查库存是否充足
  if (operation_type === 'consume') {
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('available_quantity')
      .eq('part_no', part_no)
      .maybeSingle();

    if (error) {
      return { valid: false, error: '查询库存失败' };
    }

    if (!inventory || inventory.available_quantity < quantity) {
      return { valid: false, error: '库存不足，无法消耗' };
    }
  }

  return { valid: true };
}
