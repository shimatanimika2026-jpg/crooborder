import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductModel } from '@/types/database';

export default function ProductionPlanCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);

  const [formData, setFormData] = useState({
    plan_code: '',
    plan_type: 'monthly' as 'annual' | 'monthly' | 'weekly',
    plan_period_start: '',
    plan_period_end: '',
    production_quantity: '',
    delivery_date: '',
    product_model_id: '',
    factory_id: '',
    responsible_person_id: '',
    remarks: '',
    change_description: '',
  });

  useEffect(() => {
    loadProductModels();
  }, []);

  const loadProductModels = async () => {
    try {
      const { data, error } = await supabase
        .from('product_models')
        .select('*')
        .order('model_code');

      if (error) throw error;
      setProductModels(data || []);
    } catch (error) {
      console.error('加载产品型号失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      toast.error('用户信息未加载');
      return;
    }

    // 验证必填字段
    if (!formData.plan_code || !formData.plan_period_start || !formData.plan_period_end || 
        !formData.production_quantity || !formData.delivery_date) {
      toast.error('请填写所有必填字段');
      return;
    }

    // 验证日期范围
    if (formData.plan_period_start > formData.plan_period_end) {
      toast.error('计划开始日期不能晚于结束日期');
      return;
    }

    // 验证数量
    const quantity = parseInt(formData.production_quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('生产数量必须大于0');
      return;
    }

    setLoading(true);
    try {
      // 步骤1: 插入production_plans
      const { data: plan, error: planError } = await supabase
        .from('production_plans')
        .insert({
          plan_code: formData.plan_code,
          plan_type: formData.plan_type,
          plan_period_start: formData.plan_period_start,
          plan_period_end: formData.plan_period_end,
          production_quantity: quantity,
          delivery_date: formData.delivery_date,
          product_model_id: formData.product_model_id ? parseInt(formData.product_model_id) : null,
          factory_id: formData.factory_id || null,
          responsible_person_id: formData.responsible_person_id || null,
          remarks: formData.remarks || null,
          status: 'draft',
          current_version: 1,
          tenant_id: profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id,
          created_by: profile.id,
          updated_by: profile.id,
        })
        .select()
        .maybeSingle();

      if (planError) throw planError;
      if (!plan) throw new Error('创建生产计划失败：未返回数据');

      // 步骤2: 插入production_plan_versions首个版本记录
      const planDetails = {
        plan_code: formData.plan_code,
        plan_type: formData.plan_type,
        plan_period_start: formData.plan_period_start,
        plan_period_end: formData.plan_period_end,
        production_quantity: quantity,
        delivery_date: formData.delivery_date,
        product_model_id: formData.product_model_id ? parseInt(formData.product_model_id) : null,
        factory_id: formData.factory_id || null,
        responsible_person_id: formData.responsible_person_id || null,
        remarks: formData.remarks || null,
        status: 'draft',
      };

      const { error: versionError } = await supabase
        .from('production_plan_versions')
        .insert({
          plan_id: plan.id,
          version_number: 1,
          change_reason: 'initial_creation',
          change_description: formData.change_description || '初始创建',
          plan_details: planDetails,
          created_by: profile.id,
        });

      if (versionError) throw versionError;

      toast.success('生产计划创建成功');
      navigate(`/production-plans/${plan.id}`);
    } catch (error) {
      console.error('创建生产计划失败:', error);
      toast.error('创建生产计划失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/production-plans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight">新建生产计划</h1>
          <p className="text-muted-foreground">填写生产计划基本信息</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">基本信息</CardTitle>
            <CardDescription>请填写生产计划的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 计划编号 */}
            <div className="space-y-2">
              <Label htmlFor="plan_code">
                计划编号 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan_code"
                value={formData.plan_code}
                onChange={(e) => setFormData({ ...formData, plan_code: e.target.value })}
                placeholder="例如: PLAN-2026-001"
                required
              />
            </div>

            {/* 计划类型 */}
            <div className="space-y-2">
              <Label htmlFor="plan_type">
                计划类型 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.plan_type}
                onValueChange={(value: 'annual' | 'monthly' | 'weekly') =>
                  setFormData({ ...formData, plan_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">年度计划</SelectItem>
                  <SelectItem value="monthly">月度计划</SelectItem>
                  <SelectItem value="weekly">周计划</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 计划周期 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan_period_start">
                  计划开始日期 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan_period_start"
                  type="date"
                  value={formData.plan_period_start}
                  onChange={(e) => setFormData({ ...formData, plan_period_start: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_period_end">
                  计划结束日期 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan_period_end"
                  type="date"
                  value={formData.plan_period_end}
                  onChange={(e) => setFormData({ ...formData, plan_period_end: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* 生产数量 */}
            <div className="space-y-2">
              <Label htmlFor="production_quantity">
                生产数量 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="production_quantity"
                type="number"
                min="1"
                value={formData.production_quantity}
                onChange={(e) => setFormData({ ...formData, production_quantity: e.target.value })}
                placeholder="请输入生产数量"
                required
              />
            </div>

            {/* 交付日期 */}
            <div className="space-y-2">
              <Label htmlFor="delivery_date">
                交付日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                required
              />
            </div>

            {/* P1 新增：产品型号 */}
            <div className="space-y-2">
              <Label htmlFor="product_model_id">产品型号</Label>
              <Select
                value={formData.product_model_id}
                onValueChange={(value) => setFormData({ ...formData, product_model_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择产品型号" />
                </SelectTrigger>
                <SelectContent>
                  {productModels.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.model_code} - {model.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* P1 新增：工厂 */}
            <div className="space-y-2">
              <Label htmlFor="factory_id">工厂</Label>
              <Select
                value={formData.factory_id}
                onValueChange={(value) => setFormData({ ...formData, factory_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择工厂" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JP-MICROTEC">日本 MICROTEC 工厂</SelectItem>
                  <SelectItem value="CN-FACTORY">中国工厂</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* P1 新增：责任人 */}
            <div className="space-y-2">
              <Label htmlFor="responsible_person_id">责任人</Label>
              <Input
                id="responsible_person_id"
                value={formData.responsible_person_id}
                onChange={(e) => setFormData({ ...formData, responsible_person_id: e.target.value })}
                placeholder="责任人 ID（可选）"
              />
            </div>

            {/* P1 新增：备注 */}
            <div className="space-y-2">
              <Label htmlFor="remarks">备注</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="填写备注信息（可选）"
                rows={3}
              />
            </div>

            {/* 变更说明 */}
            <div className="space-y-2">
              <Label htmlFor="change_description">创建说明</Label>
              <Textarea
                id="change_description"
                value={formData.change_description}
                onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
                placeholder="填写创建说明（可选）"
                rows={3}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/production-plans')}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? '创建中...' : '创建计划'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
