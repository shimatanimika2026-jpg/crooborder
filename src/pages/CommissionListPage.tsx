import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase, runtimeMode } from '@/db/supabase';
import { getDemoCommissions } from '@/data/demo/commission-store';
import type { Commission, CommissionStatus } from '@/types';

export default function CommissionListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | 'china' | 'japan'>('all');
  const [responsiblePartyFilter, setResponsiblePartyFilter] = useState<'all' | 'china' | 'japan' | 'both'>('all');
  const [showOnlyExceptions, setShowOnlyExceptions] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [searchQuery, statusFilter, countryFilter, responsiblePartyFilter, showOnlyExceptions]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);

      // 演示模式：使用内置演示数据
      if (runtimeMode === 'demo' || !supabase) {
        let filtered = getDemoCommissions();
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.commission_no.toLowerCase().includes(q) ||
              c.customer_name.toLowerCase().includes(q) ||
              c.product_name.toLowerCase().includes(q)
          );
        }
        if (statusFilter !== 'all') filtered = filtered.filter((c) => c.status === statusFilter);
        if (countryFilter !== 'all') filtered = filtered.filter((c) => c.country === countryFilter);
        if (responsiblePartyFilter !== 'all') filtered = filtered.filter((c) => c.responsible_party === responsiblePartyFilter);
        if (showOnlyExceptions) filtered = filtered.filter((c) => c.status === 'exception');
        setCommissions(filtered);
        setLoading(false);
        return;
      }

      // 构建服务端查询
      let query = supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });

      // 搜索条件：委托单号、客户名称、产品名称
      if (searchQuery.trim()) {
        query = query.or(
          `commission_no.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,product_name.ilike.%${searchQuery}%`
        );
      }

      // 状态过滤
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // 国家过滤
      if (countryFilter !== 'all') {
        query = query.eq('country', countryFilter);
      }

      // 责任方过滤
      if (responsiblePartyFilter !== 'all') {
        query = query.eq('responsible_party', responsiblePartyFilter);
      }

      // 仅看异常
      if (showOnlyExceptions) {
        query = query.eq('status', 'exception');
      }

      const { data, error } = await query;

      if (error) throw error;

      setCommissions(data || []);
    } catch (error: unknown) {
      console.error('Error fetching commissions:', error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: CommissionStatus) => {
    const colors: Record<CommissionStatus, string> = {
      pending_acceptance: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      in_production: 'bg-purple-100 text-purple-800',
      shipped: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      exception: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: CommissionStatus) => {
    const labels: Record<CommissionStatus, string> = {
      pending_acceptance: t('commission.statusPendingAcceptance'),
      accepted: t('commission.statusAccepted'),
      rejected: t('commission.statusRejected'),
      in_production: t('commission.statusInProduction'),
      shipped: t('commission.statusShipped'),
      completed: t('commission.statusCompleted'),
      exception: t('commission.statusException'),
    };
    return labels[status] || status;
  };

  const filteredCommissions = commissions; // 已经在服务端过滤，不需要前端再过滤

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t('commission.list')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('commission.listDescription') || '查看和管理所有委托单'}
            </p>
          </div>
          <Button onClick={() => navigate('/commission/create')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('commission.create')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t('common.filter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('commission.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as CommissionStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('commission.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commission.allStatus')}</SelectItem>
                  <SelectItem value="pending_acceptance">
                    {t('commission.statusPendingAcceptance')}
                  </SelectItem>
                  <SelectItem value="accepted">{t('commission.statusAccepted')}</SelectItem>
                  <SelectItem value="rejected">{t('commission.statusRejected')}</SelectItem>
                  <SelectItem value="in_production">
                    {t('commission.statusInProduction')}
                  </SelectItem>
                  <SelectItem value="shipped">{t('commission.statusShipped')}</SelectItem>
                  <SelectItem value="completed">{t('commission.statusCompleted')}</SelectItem>
                  <SelectItem value="exception">{t('commission.statusException')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Country Filter */}
              <Select
                value={countryFilter}
                onValueChange={(value) => setCountryFilter(value as 'all' | 'china' | 'japan')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('commission.country')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commission.allCountries')}</SelectItem>
                  <SelectItem value="china">{t('commission.countryChina')}</SelectItem>
                  <SelectItem value="japan">{t('commission.countryJapan')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Responsible Party Filter */}
              <Select
                value={responsiblePartyFilter}
                onValueChange={(value) => setResponsiblePartyFilter(value as 'all' | 'china' | 'japan' | 'both')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('commission.responsibleParty')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('commission.allResponsibleParties')}</SelectItem>
                  <SelectItem value="china">{t('commission.responsiblePartyChina')}</SelectItem>
                  <SelectItem value="japan">{t('commission.responsiblePartyJapan')}</SelectItem>
                  <SelectItem value="both">{t('commission.responsiblePartyBoth')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exception Filter Checkbox */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="showOnlyExceptions"
                checked={showOnlyExceptions}
                onChange={(e) => setShowOnlyExceptions(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="showOnlyExceptions" className="text-sm">
                {t('commission.onlyShowExceptions')}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-muted" />
                ))}
              </div>
            ) : filteredCommissions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {t('commission.emptyText')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('commission.commissionNo')}</TableHead>
                    <TableHead>{t('commission.customerName')}</TableHead>
                    <TableHead>{t('commission.productName')}</TableHead>
                    <TableHead>{t('commission.quantity')}</TableHead>
                    <TableHead>{t('commission.targetDeliveryDate')}</TableHead>
                    <TableHead>{t('commission.assemblyFactory')}</TableHead>
                    <TableHead>{t('commission.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((commission) => (
                    <TableRow
                      key={commission.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        commission.status === 'exception' ? 'bg-red-50' : ''
                      }`}
                      onClick={() => navigate(`/commission/${commission.id}`)}
                    >
                      <TableCell className="font-medium">{commission.commission_no}</TableCell>
                      <TableCell>{commission.customer_name}</TableCell>
                      <TableCell>{commission.product_name}</TableCell>
                      <TableCell>{commission.quantity}</TableCell>
                      <TableCell>{commission.target_delivery_date}</TableCell>
                      <TableCell>{commission.assembly_factory}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                            commission.status
                          )}`}
                        >
                          {getStatusLabel(commission.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/commission/${commission.id}`);
                          }}
                        >
                          {t('common.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
