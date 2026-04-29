import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import { demoExceptionsData } from '@/data/demo/exceptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { OperationException } from '@/types/database';

export default function ExceptionCenterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<OperationException[]>([]);
  const [filteredExceptions, setFilteredExceptions] = useState<OperationException[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, { full_name: string | null; username: string; email: string | null }>>(new Map());
  const [availableOwners, setAvailableOwners] = useState<Array<{ id: string; display_name: string }>>([]);
  
  // 从 URL 参数初始化筛选条件
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState(() => {
    const severity = searchParams.get('severity');
    // 处理多个严重级别（如 "high,critical"）
    if (severity && severity.includes(',')) {
      return severity; // 保持原样，后续在 applyFilters 中处理
    }
    return severity || 'all';
  });
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(searchParams.get('overdue') === 'true');

  useEffect(() => {
    loadExceptions();
    loadUsers();
  }, []);

  // 监听URL参数变化，同步更新筛选状态
  useEffect(() => {
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const overdue = searchParams.get('overdue');
    
    setFilterStatus(status || 'all');
    setFilterSeverity(severity || 'all');
    setFilterOverdue(overdue === 'true');
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [exceptions, searchTerm, filterType, filterSeverity, filterStatus, filterModule, filterOwner, filterStartDate, filterEndDate, filterOverdue]);

  const getUserDisplayName = (userId: string | null): string => {
    if (!userId) return '未指派';
    const user = usersMap.get(userId);
    if (!user) return userId.substring(0, 8) + '...';
    return user.full_name || user.username || user.email || userId.substring(0, 8) + '...';
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email')
        .order('full_name');

      if (error) throw error;
      
      const newUsersMap = new Map();
      const owners: Array<{ id: string; display_name: string }> = [];
      
      data?.forEach((user) => {
        const displayName = user.full_name || user.username || user.email || user.id.substring(0, 8);
        newUsersMap.set(user.id, {
          full_name: user.full_name,
          username: user.username,
          email: user.email,
        });
        owners.push({ id: user.id, display_name: displayName });
      });
      
      setUsersMap(newUsersMap);
      setAvailableOwners(owners);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadExceptions = async () => {
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setExceptions(demoExceptionsData as unknown as OperationException[]);
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      const { data, error } = await supabase
        .from('operation_exceptions')
        .select('*')
        .order('reported_at', { ascending: false });

      if (error) throw error;
      setExceptions(data || []);
    } catch (error) {
      console.error('加载异常列表失败:', error);
      toast.error('加载异常列表失败');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...exceptions];

    if (searchTerm) {
      filtered = filtered.filter(exc =>
        exc.exception_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exc.exception_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exc.related_sn?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(exc => exc.exception_type === filterType);
    }

    if (filterSeverity !== 'all') {
      // 处理多个严重级别（如 "high,critical"）
      if (filterSeverity.includes(',')) {
        const severities = filterSeverity.split(',');
        filtered = filtered.filter(exc => severities.includes(exc.severity));
      } else {
        filtered = filtered.filter(exc => exc.severity === filterSeverity);
      }
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(exc => exc.current_status === filterStatus);
    }

    if (filterModule !== 'all') {
      filtered = filtered.filter(exc => exc.source_module === filterModule);
    }

    if (filterOwner !== 'all') {
      if (filterOwner === 'unassigned') {
        filtered = filtered.filter(exc => !exc.owner_id);
      } else {
        filtered = filtered.filter(exc => exc.owner_id === filterOwner);
      }
    }

    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      filtered = filtered.filter(exc => new Date(exc.reported_at) >= startDate);
    }
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(exc => new Date(exc.reported_at) <= endDate);
    }

    // 逾期筛选
    if (filterOverdue) {
      const now = new Date();
      filtered = filtered.filter(exc => {
        if (!exc.due_date) return false;
        return new Date(exc.due_date) < now && exc.current_status !== 'resolved' && exc.current_status !== 'closed';
      });
    }

    setFilteredExceptions(filtered);
  };

  // 同步筛选条件到 URL
  const handleSeverityChange = (value: string) => {
    setFilterSeverity(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('severity');
    } else {
      nextParams.set('severity', value);
    }
    setSearchParams(nextParams);
  };

  const handleStatusChange = (value: string) => {
    setFilterStatus(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', value);
    }
    setSearchParams(nextParams);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'pending_approval': return 'secondary';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getExceptionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shortage: '收货短少',
      overage: '收货超量',
      wrong_item: '收货错料',
      damaged: '收货破损',
      incoming_ng: '来料不良',
      hold: '来料待处理',
      special_acceptance_pending: '特采待审批',
      aging_interrupted: '老化中断',
      aging_failed: '老化失败',
      aging_timeout: '老化超时',
      final_test_failed: '最终测试失败',
      final_test_blocked: '最终测试阻断',
      qa_blocked: 'QA阻断',
      shipment_blocked: '出货阻断',
    };
    return labels[type] || type;
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      receiving: '收货',
      iqc: 'IQC',
      disposition: '物料处置',
      assembly: '组装',
      aging: '老化',
      final_test: '最终测试',
      qa: 'QA',
      shipment: '出货',
    };
    return labels[module] || module;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: '待处理',
      in_progress: '处理中',
      pending_approval: '待审批',
      resolved: '已解决',
      closed: '已关闭',
      rejected: '已拒绝',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">异常中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            统一管理跨模块异常
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            总计: {exceptions.length}
          </Badge>
          <Badge variant="destructive">
            待处理: {exceptions.filter(e => e.current_status === 'open').length}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索异常编号、类型、SN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger>
                <SelectValue placeholder="来源模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                <SelectItem value="receiving">收货</SelectItem>
                <SelectItem value="iqc">IQC</SelectItem>
                <SelectItem value="disposition">物料处置</SelectItem>
                <SelectItem value="assembly">组装</SelectItem>
                <SelectItem value="aging">老化</SelectItem>
                <SelectItem value="final_test">最终测试</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="shipment">出货</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={handleSeverityChange}>
              <SelectTrigger>
                <SelectValue placeholder="严重等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={filterStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="open">待处理</SelectItem>
                <SelectItem value="in_progress">处理中</SelectItem>
                <SelectItem value="pending_approval">待审批</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
                <SelectItem value="closed">已关闭</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger>
                <SelectValue placeholder="负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部负责人</SelectItem>
                <SelectItem value="unassigned">未指派</SelectItem>
                {availableOwners.map(owner => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                placeholder="开始日期"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                placeholder="结束日期"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterSeverity('all');
                setFilterStatus('all');
                setFilterModule('all');
                setFilterOwner('all');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">异常列表</CardTitle>
          <CardDescription>
            共 {filteredExceptions.length} 条异常
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredExceptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>暂无异常记录</p>
              </div>
            ) : (
              filteredExceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="flex items-center justify-between p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/exceptions/${exception.id}`)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exception.exception_code}</span>
                      <Badge variant={getSeverityColor(exception.severity)}>
                        {exception.severity === 'critical' ? '严重' :
                         exception.severity === 'high' ? '高' :
                         exception.severity === 'medium' ? '中' : '低'}
                      </Badge>
                      <Badge variant="outline">
                        {getModuleLabel(exception.source_module)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getExceptionTypeLabel(exception.exception_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {exception.related_sn && (
                        <span>SN: {exception.related_sn}</span>
                      )}
                      <span>负责人: {getUserDisplayName(exception.owner_id)}</span>
                      <span>上报: {new Date(exception.reported_at).toLocaleString('zh-CN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                      {exception.due_date && (
                        <span className="text-destructive">截止: {exception.due_date}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(exception.current_status)}>
                      {getStatusLabel(exception.current_status)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
