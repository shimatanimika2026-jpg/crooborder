import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

interface ProductionOrderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProductionPlan {
  id: number;
  plan_code: string;
  plan_type: string;
}

export default function ProductionOrderCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProductionOrderCreateDialogProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);

  const formSchema = z.object({
    plan_id: z.string().min(1, t('productionOrder.errorSelectPlan')),
    part_name: z.string().min(1, t('productionOrder.errorPartName')),
    part_code: z.string().min(1, t('productionOrder.errorPartCode')),
    production_quantity: z.coerce.number().min(1, t('productionOrder.errorQuantity')),
    planned_start_date: z.string().min(1, t('productionOrder.errorStartDate')),
    planned_end_date: z.string().min(1, t('productionOrder.errorEndDate')),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plan_id: '',
      part_name: '',
      part_code: '',
      production_quantity: 0,
      planned_start_date: '',
      planned_end_date: '',
    },
  });

  useEffect(() => {
    if (open && profile) {
      loadPlans();
    }
  }, [open, profile]);

  const loadPlans = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('production_plans')
        .select('id, plan_code, plan_type')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .in('status', ['draft', 'active'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error(t('productionOrder.errorLoadPlans'), error);
      toast.error(t('productionOrder.errorLoadPlans'));
    }
  };

  const generateOrderCode = async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  const onSubmit = async (values: FormValues) => {
    if (!profile) return;

    setLoading(true);
    try {
      const orderCode = await generateOrderCode();

      const { error } = await supabase.from('production_orders').insert({
        order_code: orderCode,
        plan_id: Number.parseInt(values.plan_id),
        part_name: values.part_name,
        part_code: values.part_code,
        production_quantity: values.production_quantity,
        planned_start_date: values.planned_start_date,
        planned_end_date: values.planned_end_date,
        status: 'pending',
        tenant_id: profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id,
      });

      if (error) throw error;

      toast.success(t('productionOrder.successCreate'));
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error(t('productionOrder.errorCreate'), error);
      toast.error(t('productionOrder.errorCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('productionOrder.create')}</DialogTitle>
          <DialogDescription>{t('productionOrder.createDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="plan_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('productionOrder.productionPlan')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('productionOrder.selectPlan')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans.length === 0 ? (
                        <SelectItem value="none" disabled>
                          {t('common.noData')}
                        </SelectItem>
                      ) : (
                        plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.plan_code} ({t(`productionPlan.${plan.plan_type}`)})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="part_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productionOrder.partName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('productionOrder.partNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="part_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productionOrder.partCode')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('productionOrder.partCodePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="production_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('productionOrder.productionQuantity')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder={t('productionOrder.quantityPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="planned_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productionOrder.plannedStartDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('productionOrder.plannedEndDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
