import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, test_id, data } = await req.json();

    switch (action) {
      case 'start': {
        // 开始老化试验
        const now = new Date().toISOString();
        const planned_end = new Date(Date.now() + data.required_duration_hours * 60 * 60 * 1000).toISOString();

        const { data: test, error: testError } = await supabase
          .from('aging_tests')
          .update({
            status: 'running',
            started_at: now,
            planned_end_at: planned_end,
            operator_id: data.operator_id,
            accumulated_run_minutes: 0,
          })
          .eq('id', test_id)
          .select()
          .single();

        if (testError) throw testError;

        // 记录日志
        await supabase.from('aging_test_logs').insert({
          aging_test_id: test_id,
          log_type: 'start',
          status_snapshot: 'running',
          temperature: data.temperature,
          humidity: data.humidity,
          elapsed_hours: 0,
          note: '开始48小时老化试验',
          created_by: data.operator_id,
        });

        // 更新整机状态
        await supabase
          .from('finished_unit_traceability')
          .update({ aging_status: 'running' })
          .eq('finished_product_sn', test.finished_product_sn);

        return new Response(JSON.stringify({ success: true, test }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'pause': {
        // 暂停老化试验 - 累计已运行时长
        const now = new Date().toISOString();

        const { data: test, error: queryError } = await supabase
          .from('aging_tests')
          .select('*')
          .eq('id', test_id)
          .single();

        if (queryError) throw queryError;

        // 计算本次运行时长(分钟)
        let runMinutes = 0;
        if (test.status === 'running') {
          const lastStart = test.last_resume_at || test.started_at;
          if (lastStart) {
            runMinutes = Math.floor((Date.now() - new Date(lastStart).getTime()) / (1000 * 60));
          }
        }

        const newAccumulated = (test.accumulated_run_minutes || 0) + runMinutes;

        // 记录暂停时间段
        const pauseSegments = test.pause_segments || [];
        pauseSegments.push({
          paused_at: now,
          accumulated_before_pause: newAccumulated,
        });

        const { data: updatedTest, error: testError } = await supabase
          .from('aging_tests')
          .update({
            status: 'paused',
            accumulated_run_minutes: newAccumulated,
            last_pause_at: now,
            pause_segments: pauseSegments,
          })
          .eq('id', test_id)
          .select()
          .single();

        if (testError) throw testError;

        await supabase.from('aging_test_logs').insert({
          aging_test_id: test_id,
          log_type: 'pause',
          status_snapshot: 'paused',
          elapsed_hours: newAccumulated / 60,
          note: data.reason || '暂停老化试验',
          created_by: data.operator_id,
        });

        return new Response(JSON.stringify({ success: true, test: updatedTest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'resume': {
        // 恢复老化试验
        const now = new Date().toISOString();

        const { data: test, error: queryError } = await supabase
          .from('aging_tests')
          .select('*')
          .eq('id', test_id)
          .single();

        if (queryError) throw queryError;

        // 更新暂停时间段记录
        const pauseSegments = test.pause_segments || [];
        if (pauseSegments.length > 0) {
          const lastSegment = pauseSegments[pauseSegments.length - 1];
          lastSegment.resumed_at = now;
        }

        const { data: updatedTest, error: testError } = await supabase
          .from('aging_tests')
          .update({
            status: 'running',
            last_resume_at: now,
            pause_segments: pauseSegments,
          })
          .eq('id', test_id)
          .select()
          .single();

        if (testError) throw testError;

        await supabase.from('aging_test_logs').insert({
          aging_test_id: test_id,
          log_type: 'resume',
          status_snapshot: 'running',
          elapsed_hours: test.accumulated_run_minutes / 60,
          note: '恢复老化试验',
          created_by: data.operator_id,
        });

        return new Response(JSON.stringify({ success: true, test: updatedTest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'interrupt': {
        // 中断老化试验 - 累计已运行时长
        const now = new Date().toISOString();

        const { data: test, error: queryError } = await supabase
          .from('aging_tests')
          .select('*')
          .eq('id', test_id)
          .single();

        if (queryError) throw queryError;

        // 计算本次运行时长
        let runMinutes = 0;
        if (test.status === 'running') {
          const lastStart = test.last_resume_at || test.started_at;
          if (lastStart) {
            runMinutes = Math.floor((Date.now() - new Date(lastStart).getTime()) / (1000 * 60));
          }
        }

        const newAccumulated = (test.accumulated_run_minutes || 0) + runMinutes;

        // 更新状态并自增中断次数
        const { data: updatedTest, error: testError } = await supabase
          .from('aging_tests')
          .update({
            status: 'interrupted',
            accumulated_run_minutes: newAccumulated,
            last_interruption_at: now,
            last_interruption_reason_code: data.reason_code,
            last_interruption_reason: data.reason,
            interruption_count: (test.interruption_count || 0) + 1,
          })
          .eq('id', test_id)
          .select()
          .single();

        if (testError) throw testError;

        await supabase.from('aging_test_logs').insert({
          aging_test_id: test_id,
          log_type: 'interrupt',
          status_snapshot: 'interrupted',
          alarm_code: data.reason_code,
          alarm_message: data.reason,
          temperature: data.temperature,
          humidity: data.humidity,
          elapsed_hours: newAccumulated / 60,
          note: `老化中断: ${data.reason}`,
          created_by: data.operator_id,
        });

        // 更新整机状态为failed
        await supabase
          .from('finished_unit_traceability')
          .update({ aging_status: 'failed' })
          .eq('finished_product_sn', test.finished_product_sn);

        // 创建异常记录
        await supabase.from('quality_exceptions').insert({
          exception_code: `EXC-AGING-${test_id}-${Date.now()}`,
          exception_type: 'aging_failure',
          severity: 'high',
          related_object_type: 'finished_unit',
          related_object_id: test.finished_product_sn,
          finished_product_sn: test.finished_product_sn,
          product_model_id: test.product_model_id,
          description: `老化试验中断: ${data.reason}`,
          status: 'open',
          tenant_id: test.tenant_id,
          factory_id: test.factory_id,
        });

        return new Response(JSON.stringify({ success: true, test: updatedTest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'complete': {
        // 完成老化试验 - 基于净运行时长判定
        const now = new Date().toISOString();

        const { data: test, error: testError } = await supabase
          .from('aging_tests')
          .select()
          .eq('id', test_id)
          .single();

        if (testError) throw testError;

        // 计算最终累计时长
        let finalAccumulated = test.accumulated_run_minutes || 0;
        if (test.status === 'running') {
          const lastStart = test.last_resume_at || test.started_at;
          if (lastStart) {
            const runMinutes = Math.floor((Date.now() - new Date(lastStart).getTime()) / (1000 * 60));
            finalAccumulated += runMinutes;
          }
        }

        const actualHours = finalAccumulated / 60;
        const requiredHours = test.required_duration_hours || 48;

        // 判定结果 - 基于净运行时长
        const result = actualHours >= requiredHours ? 'pass' : 'fail';
        const status = result === 'pass' ? 'passed' : 'failed';

        const { data: updatedTest, error: updateError } = await supabase
          .from('aging_tests')
          .update({
            status,
            result,
            ended_at: now,
            accumulated_run_minutes: finalAccumulated,
            actual_duration_hours: actualHours,
            temperature_avg: data.temperature_avg,
            humidity_avg: data.humidity_avg,
            qa_reviewer_id: data.qa_reviewer_id,
          })
          .eq('id', test_id)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase.from('aging_test_logs').insert({
          aging_test_id: test_id,
          log_type: 'end',
          status_snapshot: status,
          temperature: data.temperature_avg,
          humidity: data.humidity_avg,
          elapsed_hours: actualHours,
          note: `老化试验完成，净运行时长: ${actualHours.toFixed(2)}小时，结果: ${result === 'pass' ? '通过' : '失败'}`,
          created_by: data.qa_reviewer_id,
        });

        // 更新整机状态
        await supabase
          .from('finished_unit_traceability')
          .update({
            aging_status: result === 'pass' ? 'passed' : 'failed',
            aging_passed_at: result === 'pass' ? now : null,
          })
          .eq('finished_product_sn', test.finished_product_sn);

        // 如果老化测试通过，自动创建终测记录
        if (result === 'pass') {
          // 检查是否已有终测记录
          const { data: existingTest, error: checkError } = await supabase
            .from('final_tests')
            .select('id')
            .eq('finished_product_sn', test.finished_product_sn)
            .maybeSingle();

          if (checkError) {
            console.error('检查终测记录失败:', checkError);
          } else if (!existingTest) {
            // 创建终测记录
            const { error: finalTestError } = await supabase
              .from('final_tests')
              .insert({
                finished_product_sn: test.finished_product_sn,
                test_status: 'pending',
                tenant_id: test.tenant_id,
                created_by: data.qa_reviewer_id,
              });

            if (finalTestError) {
              console.error('自动创建终测记录失败:', finalTestError);
            } else {
              // 更新整机状态
              await supabase
                .from('finished_unit_traceability')
                .update({ final_test_status: 'pending' })
                .eq('finished_product_sn', test.finished_product_sn);
            }
          }
        }

        return new Response(JSON.stringify({ success: true, test: updatedTest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check_release': {
        // 检查是否可以放行
        const { data: checkResult, error: checkError } = await supabase.rpc(
          'check_aging_requirement_before_release',
          { p_finished_product_sn: data.finished_product_sn }
        );

        if (checkError) throw checkError;

        return new Response(JSON.stringify({ success: true, result: checkResult[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
