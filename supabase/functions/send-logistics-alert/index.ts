import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  tracking_number: string;
  shipping_code: string;
  anomaly_type: string;
  severity: string;
  message: string;
}

// 发送微信企业号通知
async function sendWeChatNotification(alert: AlertRequest): Promise<boolean> {
  try {
    const accessToken = Deno.env.get('WECHAT_ACCESS_TOKEN');
    if (!accessToken) {
      console.warn('微信Access Token未配置');
      return false;
    }

    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: '@all', // 发送给所有人,实际应该根据角色发送
          msgtype: 'text',
          agentid: Deno.env.get('WECHAT_AGENT_ID'),
          text: {
            content: `【物流异常告警】\n发货单号: ${alert.shipping_code}\n物流单号: ${alert.tracking_number}\n异常类型: ${alert.message}\n严重程度: ${alert.severity}\n请及时处理!`,
          },
        }),
      }
    );

    const result = await response.json();
    return result.errcode === 0;
  } catch (error) {
    console.error('发送微信通知失败:', error);
    return false;
  }
}

// 发送Line通知
async function sendLineNotification(alert: AlertRequest): Promise<boolean> {
  try {
    const accessToken = Deno.env.get('LINE_ACCESS_TOKEN');
    if (!accessToken) {
      console.warn('Line Access Token未配置');
      return false;
    }

    // Line Notify API
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        message: `\n【物流異常警報】\n発送番号: ${alert.shipping_code}\n追跡番号: ${alert.tracking_number}\n異常タイプ: ${alert.message}\n重要度: ${alert.severity}\n速やかに対応してください!`,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('发送Line通知失败:', error);
    return false;
  }
}

// 发送邮件通知
async function sendEmailNotification(alert: AlertRequest): Promise<boolean> {
  try {
    // 这里可以集成SendGrid、AWS SES等邮件服务
    console.log('发送邮件通知:', alert);
    return true;
  } catch (error) {
    console.error('发送邮件通知失败:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const alert: AlertRequest = await req.json();

    // 根据严重程度选择通知渠道
    const results = {
      wechat: false,
      line: false,
      email: false,
    };

    // 高严重度: 发送所有通知
    if (alert.severity === 'critical' || alert.severity === 'high') {
      results.wechat = await sendWeChatNotification(alert);
      results.line = await sendLineNotification(alert);
      results.email = await sendEmailNotification(alert);
    } else {
      // 中低严重度: 仅发送微信/Line
      results.wechat = await sendWeChatNotification(alert);
      results.line = await sendLineNotification(alert);
    }

    return new Response(
      JSON.stringify({
        success: true,
        alert,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('发送告警通知失败:', error);
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
