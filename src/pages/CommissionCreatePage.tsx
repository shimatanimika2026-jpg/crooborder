import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createDemoCommission } from '@/data/demo/commission-store';
import { runtimeMode, supabase } from '@/db/supabase';

export default function CommissionCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    project_name: '',
    product_name: '',
    quantity: 1,
    target_delivery_date: '',
    assembly_factory: '',
    notes: '',
    country: 'china' as 'china' | 'japan',
    responsible_party: 'china' as 'china' | 'japan' | 'both',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 前置校验：必填字段
    if (!formData.customer_name || !formData.product_name || !formData.target_delivery_date || !formData.assembly_factory) {
      toast.error(t('common.requiredFields'));
      return;
    }

    if (formData.quantity <= 0) {
      toast.error(t('commission.quantityMustBePositive'));
      return;
    }

    if (!formData.country) {
      toast.error(t('commission.selectCountry'));
      return;
    }

    if (!formData.responsible_party) {
      toast.error(t('commission.selectResponsibleParty'));
      return;
    }

    if (!user) {
      toast.error(t('common.pleaseLogin'));
      return;
    }

    setLoading(true);

    try {
      if (runtimeMode === 'demo') {
        const commission = createDemoCommission({
          customer_name: formData.customer_name,
          project_name: formData.project_name || undefined,
          product_name: formData.product_name,
          quantity: formData.quantity,
          target_delivery_date: formData.target_delivery_date,
          assembly_factory: formData.assembly_factory,
          notes: formData.notes || undefined,
          country: formData.country,
          responsible_party: formData.responsible_party,
          created_by: user.id,
        });

        toast.success(t('commission.createSuccess'));
        navigate(`/commission/${commission.id}`);
        return;
      }

      // 步骤 1: 生成委托单号（使用 RPC 确保唯一性）
      const { data: commissionNoData, error: commissionNoError } = await supabase
        .rpc('generate_commission_no');

      if (commissionNoError) {
        console.error('生成委托单号失败:', commissionNoError);
        throw new Error('生成委托单号失败: ' + commissionNoError.message);
      }

      if (!commissionNoData) {
        throw new Error('生成委托单号失败：未返回数据');
      }

      // 步骤 2: 创建委托单主记录
      const { data: commission, error: commissionError } = await supabase
        .from('commissions')
        .insert({
          commission_no: commissionNoData,
          customer_name: formData.customer_name,
          project_name: formData.project_name || null,
          product_name: formData.product_name,
          quantity: formData.quantity,
          target_delivery_date: formData.target_delivery_date,
          assembly_factory: formData.assembly_factory,
          notes: formData.notes || null,
          country: formData.country,
          responsible_party: formData.responsible_party,
          status: 'pending_acceptance',
          created_by: user.id,
        })
        .select()
        .single();

      if (commissionError) {
        console.error('创建委托单失败:', commissionError);
        throw new Error('创建委托单失败: ' + commissionError.message);
      }

      if (!commission) {
        throw new Error('创建委托单失败：未返回数据');
      }

      // 步骤 3: 创建首条操作记录（创建动作）
      const { error: operationError } = await supabase
        .from('commission_operations')
        .insert({
          commission_id: commission.id,
          operation_type: 'create',
          operation_data: { 
            action: 'created',
            commission_no: commissionNoData,
          },
          operator_id: user.id,
        });

      if (operationError) {
        console.error('创建操作记录失败:', operationError);
        // 回滚：删除已创建的委托单
        await supabase.from('commissions').delete().eq('id', commission.id);
        throw new Error('创建操作记录失败，已回滚委托单');
      }

      toast.success(t('commission.createSuccess'));
      navigate(`/commission/${commission.id}`);
    } catch (error: unknown) {
      console.error('创建委托单错误:', error);
      toast.error(error instanceof Error ? error.message : t('commission.createError'));
      // 失败时保留用户输入，不清空 formData
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/commission')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{t('commission.create')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('commission.createDescription') || '填写委托信息并提交'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>{t('commission.detail')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 客户名称 */}
              <div className="space-y-2">
                <Label htmlFor="customer_name">
                  {t('commission.customerName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  placeholder={t('commission.customerName')}
                  required
                />
              </div>

              {/* 项目名称 */}
              <div className="space-y-2">
                <Label htmlFor="project_name">{t('commission.projectName')}</Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) =>
                    setFormData({ ...formData, project_name: e.target.value })
                  }
                  placeholder={t('commission.projectName')}
                />
              </div>

              {/* 产品名称 */}
              <div className="space-y-2">
                <Label htmlFor="product_name">
                  {t('commission.productName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  placeholder={t('commission.productName')}
                  required
                />
              </div>

              {/* 数量 */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  {t('commission.quantity')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                  }
                  placeholder={t('commission.quantity')}
                  required
                />
              </div>

              {/* 目标交期 */}
              <div className="space-y-2">
                <Label htmlFor="target_delivery_date">
                  {t('commission.targetDeliveryDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target_delivery_date"
                  type="date"
                  value={formData.target_delivery_date}
                  onChange={(e) =>
                    setFormData({ ...formData, target_delivery_date: e.target.value })
                  }
                  required
                />
              </div>

              {/* 组装工厂 */}
              <div className="space-y-2">
                <Label htmlFor="assembly_factory">
                  {t('commission.assemblyFactory')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assembly_factory"
                  value={formData.assembly_factory}
                  onChange={(e) =>
                    setFormData({ ...formData, assembly_factory: e.target.value })
                  }
                  placeholder={t('commission.assemblyFactory')}
                  required
                />
              </div>

              {/* 国家 */}
              <div className="space-y-2">
                <Label htmlFor="country">
                  {t('commission.country')} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    setFormData({ ...formData, country: value as 'china' | 'japan' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('commission.country')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="china">{t('commission.countryChina')}</SelectItem>
                    <SelectItem value="japan">{t('commission.countryJapan')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 责任方 */}
              <div className="space-y-2">
                <Label htmlFor="responsible_party">
                  {t('commission.responsibleParty')} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.responsible_party}
                  onValueChange={(value) =>
                    setFormData({ ...formData, responsible_party: value as 'china' | 'japan' | 'both' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('commission.responsibleParty')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="china">{t('commission.responsiblePartyChina')}</SelectItem>
                    <SelectItem value="japan">{t('commission.responsiblePartyJapan')}</SelectItem>
                    <SelectItem value="both">{t('commission.responsiblePartyBoth')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 备注 */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t('commission.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t('commission.notes')}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/commission')}
                  disabled={loading}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t('common.loading') : t('common.submit')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
