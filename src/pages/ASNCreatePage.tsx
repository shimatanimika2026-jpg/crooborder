import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { createShippingOrder } from '@/services/shippingService';

type ShipmentItem = {
  line_no: number;
  part_no: string;
  part_name: string;
  part_category: string;
  batch_no: string;
  box_no: string;
  shipped_qty: number;
  unit: string;
};

export default function ASNCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    shipment_no: `ASN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    shipment_date: new Date().toISOString().split('T')[0],
    eta_date: '',
    carrier: '',
    tracking_no: '',
    total_boxes: 0,
    total_pallets: 0,
    remarks: '',
  });

  const [createShippingOrderChecked, setCreateShippingOrderChecked] = useState(false);
  const [shippingOrderData, setShippingOrderData] = useState({
    shipperName: 'Fairino Robotics (中国)',
    shipperContact: '+86-xxx-xxxx-xxxx',
    shipperAddress: '中国深圳市南山区',
    consigneeName: 'Microtec Japan (日本)',
    consigneeContact: '+81-xxx-xxxx-xxxx',
    consigneeAddress: '日本东京都',
  });

  const [items, setItems] = useState<ShipmentItem[]>([
    {
      line_no: 1,
      part_no: '',
      part_name: '',
      part_category: 'control_box',
      batch_no: '',
      box_no: '',
      shipped_qty: 0,
      unit: 'PCS',
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        line_no: items.length + 1,
        part_no: '',
        part_name: '',
        part_category: 'control_box',
        batch_no: '',
        box_no: '',
        shipped_qty: 0,
        unit: 'PCS',
      },
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => {
      item.line_no = i + 1;
    });
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof ShipmentItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 验证必填项
      if (!formData.shipment_no || !formData.shipment_date) {
        toast.error('请填写发货单号和发货日期');
        return;
      }

      if (items.length === 0 || items.some((item) => !item.part_no || !item.part_name || item.shipped_qty <= 0)) {
        toast.error('请完整填写发货明细');
        return;
      }

      // 如果勾选了创建发货订单，验证承运商
      if (createShippingOrderChecked && !formData.carrier) {
        toast.error('创建发货订单需要填写承运商');
        return;
      }

      // 创建发货单
      const { data: shipment, error: shipmentError } = await supabase
        .from('asn_shipments')
        .insert({
          shipment_no: formData.shipment_no,
          tenant_id: 'CN',
          factory_id: 'CN-FAIRINO',
          destination_factory_id: 'JP-MICROTEC',
          shipment_date: formData.shipment_date,
          eta_date: formData.eta_date || null,
          carrier: formData.carrier || null,
          tracking_no: formData.tracking_no || null,
          status: 'draft',
          total_boxes: formData.total_boxes,
          total_pallets: formData.total_pallets,
          remarks: formData.remarks || null,
          created_by: profile?.id,
        })
        .select()
        .maybeSingle();

      if (shipmentError) throw shipmentError;
      if (!shipment) throw new Error('创建 ASN 失败：未返回数据');

      // 创建发货明细
      const itemsToInsert = items.map((item) => ({
        shipment_id: shipment.id,
        line_no: item.line_no,
        part_no: item.part_no,
        part_name: item.part_name,
        part_category: item.part_category,
        batch_no: item.batch_no || null,
        box_no: item.box_no || null,
        shipped_qty: item.shipped_qty,
        unit: item.unit,
      }));

      const { error: itemsError } = await supabase.from('asn_shipment_items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 如果勾选了创建发货订单，自动创建
      if (createShippingOrderChecked && profile) {
        try {
          const shippingItems = items.map(item => ({
            part_no: item.part_no,
            part_name: item.part_name,
            quantity: item.shipped_qty,
            unit: item.unit,
          }));

          await createShippingOrder(
            shipment.id,
            shippingOrderData.shipperName,
            shippingOrderData.shipperContact,
            shippingOrderData.shipperAddress,
            shippingOrderData.consigneeName,
            shippingOrderData.consigneeContact,
            shippingOrderData.consigneeAddress,
            formData.carrier,
            formData.eta_date || formData.shipment_date,
            shippingItems,
            'JP',
            profile.id
          );
          
          toast.success('ASN发货单和物流订单创建成功');
        } catch (shippingError) {
          console.error('创建物流订单失败:', shippingError);
          toast.warning('ASN创建成功，但物流订单创建失败');
        }
      } else {
        toast.success('ASN发货单创建成功');
      }

      navigate(`/asn/${shipment.id}`);
    } catch (error) {
      console.error('创建ASN发货单失败:', error);
      toast.error('创建ASN发货单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/asn')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">创建ASN发货单</h1>
          <p className="text-muted-foreground mt-1">从中国工厂发往日本工厂</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipment_no">发货单号 *</Label>
                <Input
                  id="shipment_no"
                  value={formData.shipment_no}
                  onChange={(e) => setFormData({ ...formData, shipment_no: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipment_date">发货日期 *</Label>
                <Input
                  id="shipment_date"
                  type="date"
                  value={formData.shipment_date}
                  onChange={(e) => setFormData({ ...formData, shipment_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eta_date">预计到达日期</Label>
                <Input
                  id="eta_date"
                  type="date"
                  value={formData.eta_date}
                  onChange={(e) => setFormData({ ...formData, eta_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrier">承运商</Label>
                <Input
                  id="carrier"
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  placeholder="如: 顺丰速运"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking_no">物流单号</Label>
                <Input
                  id="tracking_no"
                  value={formData.tracking_no}
                  onChange={(e) => setFormData({ ...formData, tracking_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_boxes">总箱数</Label>
                <Input
                  id="total_boxes"
                  type="number"
                  value={formData.total_boxes}
                  onChange={(e) => setFormData({ ...formData, total_boxes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_pallets">总托数</Label>
                <Input
                  id="total_pallets"
                  type="number"
                  value={formData.total_pallets}
                  onChange={(e) => setFormData({ ...formData, total_pallets: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">备注</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
              />
            </div>
            
            {/* 同时创建发货订单选项 */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-shipping-order"
                  checked={createShippingOrderChecked}
                  onCheckedChange={(checked) => setCreateShippingOrderChecked(checked as boolean)}
                />
                <Label
                  htmlFor="create-shipping-order"
                  className="text-sm font-normal cursor-pointer"
                >
                  同时创建物流发货订单
                </Label>
              </div>
              
              {createShippingOrderChecked && (
                <div className="pl-6 space-y-3 border-l-2 border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    将自动创建物流发货订单，货物信息将从 ASN 自动带入
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">发货人</Label>
                      <Input
                        value={shippingOrderData.shipperName}
                        onChange={(e) => setShippingOrderData({ ...shippingOrderData, shipperName: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">收货人</Label>
                      <Input
                        value={shippingOrderData.consigneeName}
                        onChange={(e) => setShippingOrderData({ ...shippingOrderData, consigneeName: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>发货明细</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                添加明细
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">明细 #{item.line_no}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>零件号 *</Label>
                    <Input
                      value={item.part_no}
                      onChange={(e) => updateItem(index, 'part_no', e.target.value)}
                      placeholder="如: CONTROL_BOX_FR3"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>零件名称 *</Label>
                    <Input
                      value={item.part_name}
                      onChange={(e) => updateItem(index, 'part_name', e.target.value)}
                      placeholder="如: FR3控制箱"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>零件类别</Label>
                    <Select
                      value={item.part_category}
                      onValueChange={(value) => updateItem(index, 'part_category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="control_box">控制箱</SelectItem>
                        <SelectItem value="teaching_pendant">示教器</SelectItem>
                        <SelectItem value="main_board">主板</SelectItem>
                        <SelectItem value="cable">线缆</SelectItem>
                        <SelectItem value="accessory">配件</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>批次号</Label>
                    <Input
                      value={item.batch_no}
                      onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                      placeholder="如: BATCH-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>箱号</Label>
                    <Input
                      value={item.box_no}
                      onChange={(e) => updateItem(index, 'box_no', e.target.value)}
                      placeholder="如: BOX-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>发货数量 *</Label>
                    <Input
                      type="number"
                      value={item.shipped_qty}
                      onChange={(e) => updateItem(index, 'shipped_qty', Number(e.target.value))}
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>单位</Label>
                    <Select value={item.unit} onValueChange={(value) => updateItem(index, 'unit', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCS">PCS</SelectItem>
                        <SelectItem value="SET">SET</SelectItem>
                        <SelectItem value="BOX">BOX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/asn')} disabled={loading}>
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '创建发货单'}
          </Button>
        </div>
      </form>
    </div>
  );
}
