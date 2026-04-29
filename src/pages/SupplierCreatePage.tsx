import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { getErrorMessage } from '@/lib/error-utils';

export default function SupplierCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplier_code: '',
    supplier_name: '',
    supplier_type: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    status: 'active',
    tenant_id: profile?.tenant_id === 'BOTH' ? 'JP' : profile?.tenant_id || 'JP',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 验证必填字段
      if (!formData.supplier_code || !formData.supplier_name) {
        toast.error('请填写供应商编码和名称');
        return;
      }

      // 验证供应商编码格式
      if (!/^SUP-[A-Z]{2}-\d{3}$/.test(formData.supplier_code)) {
        toast.error('供应商编码格式错误，应为：SUP-XX-001（XX为国家代码）');
        return;
      }

      // 验证邮箱格式
      if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
        toast.error('邮箱格式错误');
        return;
      }

      // 创建供应商
      const { error } = await supabase.from('suppliers').insert({
        supplier_code: formData.supplier_code,
        supplier_name: formData.supplier_name,
        supplier_type: formData.supplier_type || null,
        contact_person: formData.contact_person || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        address: formData.address || null,
        status: formData.status,
        tenant_id: formData.tenant_id,
        created_by: profile?.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('供应商编码已存在，请使用其他编码');
        } else {
          throw error;
        }
        return;
      }

      toast.success('供应商创建成功');
      navigate('/suppliers');
    } catch (error: unknown) {
      console.error('创建供应商失败:', error);
      toast.error(getErrorMessage(error, '创建供应商失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/suppliers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">新建供应商</h1>
          <p className="text-muted-foreground mt-1">填写供应商基本信息</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 供应商编码 */}
              <div className="space-y-2">
                <Label htmlFor="supplier_code">
                  供应商编码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supplier_code"
                  placeholder="SUP-CN-001 或 SUP-JP-001"
                  value={formData.supplier_code}
                  onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">格式：SUP-XX-001（XX为国家代码，如CN、JP）</p>
              </div>

              {/* 供应商名称 */}
              <div className="space-y-2">
                <Label htmlFor="supplier_name">
                  供应商名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supplier_name"
                  placeholder="请输入供应商名称"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  required
                />
              </div>

              {/* 供应商类型 */}
              <div className="space-y-2">
                <Label htmlFor="supplier_type">供应商类型</Label>
                <Select value={formData.supplier_type} onValueChange={(value) => setFormData({ ...formData, supplier_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择供应商类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">原材料</SelectItem>
                    <SelectItem value="component">零部件</SelectItem>
                    <SelectItem value="service">服务</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 租户 */}
              <div className="space-y-2">
                <Label htmlFor="tenant_id">
                  所属工厂 <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.tenant_id} onValueChange={(value: 'CN' | 'JP') => setFormData({ ...formData, tenant_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CN">中国工厂</SelectItem>
                    <SelectItem value="JP">日本工厂</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 联系人 */}
              <div className="space-y-2">
                <Label htmlFor="contact_person">联系人</Label>
                <Input
                  id="contact_person"
                  placeholder="请输入联系人姓名"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>

              {/* 联系电话 */}
              <div className="space-y-2">
                <Label htmlFor="contact_phone">联系电话</Label>
                <Input
                  id="contact_phone"
                  placeholder="请输入联系电话"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>

              {/* 联系邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="contact_email">联系邮箱</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="请输入联系邮箱"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>

              {/* 状态 */}
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 地址 */}
            <div className="space-y-2">
              <Label htmlFor="address">地址</Label>
              <Textarea
                id="address"
                placeholder="请输入供应商地址"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/suppliers')} disabled={loading}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '创建供应商'}
          </Button>
        </div>
      </form>
    </div>
  );
}
