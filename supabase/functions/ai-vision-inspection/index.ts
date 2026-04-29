import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, inspectionType } = await req.json();

    if (!photoUrl) {
      return new Response(
        JSON.stringify({ error: 'photoUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 根据检验类型定制提示词
    const promptMap: Record<string, string> = {
      incoming: '请分析这张零部件照片，检查是否存在外观缺陷、尺寸异常、包装损坏或质量问题。请详细描述发现的问题。',
      in_process: '请分析这张生产过程照片，检查工序是否符合标准、是否存在操作不当或质量隐患。',
      final: '请分析这张成品照片，进行全面的质量检查，包括外观、功能部件、标识标签等是否符合出厂标准。',
      sampling: '请对这张抽样检验照片进行质量评估，判断是否符合质量标准。',
    };

    const prompt = promptMap[inspectionType as string] || promptMap.incoming;

    // 调用文心一言多模态API
    const response = await fetch(
      'https://app-b10oy6wwe801-api-k93RZBjPykEa-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: photoUrl } },
              ],
            },
          ],
          enable_thinking: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    // 提取分析结果
    const analysis = result.choices?.[0]?.delta?.content || '';
    const flag = result.choices?.[0]?.flag || 0;

    // 简单的缺陷检测逻辑（基于关键词）
    const defectKeywords = ['缺陷', '损坏', '异常', '不合格', '问题', '瑕疵', '裂纹', '划痕'];
    const hasDefect = defectKeywords.some((keyword) => analysis.includes(keyword));

    return new Response(
      JSON.stringify({
        analysis,
        hasDefect,
        confidence: hasDefect ? 0.8 : 0.95,
        flag,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-vision-inspection:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
