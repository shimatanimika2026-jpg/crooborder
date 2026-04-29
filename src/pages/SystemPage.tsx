import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCheck, UserX, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types/database';

export default function SystemPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      toast.success('用户状态已更新');
      await loadUsers();
    } catch (error) {
      console.error('更新用户状态失败:', error);
      toast.error('更新用户状态失败');
    } finally {
      setUpdating(null);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      toast.success('用户角色已更新');
      await loadUsers();
    } catch (error) {
      console.error('更新用户角色失败:', error);
      toast.error('更新用户角色失败');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      locked: 'destructive',
    };
    return colorMap[status] || 'default';
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <div className="grid gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-light tracking-tight">{t('nav.system')}</h1>
        <p className="text-muted-foreground">{t('system.subtitle')}</p>
      </div>

      <div className="grid gap-4">
        {users.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="hover:shadow-sm transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-normal">
                      {user.full_name || user.username}
                    </CardTitle>
                    <CardDescription>{user.email || user.phone || '-'}</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={getStatusColor(user.status)}>
                      {t(`system.${user.status}`)}
                    </Badge>
                    <Badge variant="secondary">{t(`system.${user.role}`)}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" disabled={updating === user.id}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === 'active' ? (
                          <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'inactive')}>
                            <UserX className="mr-2 h-4 w-4" />
                            停用用户
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'active')}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            启用用户
                          </DropdownMenuItem>
                        )}
                        {user.status === 'locked' ? (
                          <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'active')}>
                            <Unlock className="mr-2 h-4 w-4" />
                            解锁用户
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'locked')}>
                            <Lock className="mr-2 h-4 w-4" />
                            锁定用户
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'admin')}>
                          设为管理员
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'operator')}>
                          设为操作员
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateUserRole(user.id, 'viewer')}>
                          设为查看者
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">{t('system.username')}</p>
                    <p className="font-normal">{user.username}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common.tenant')}</p>
                    <p className="font-normal">{user.tenant_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('system.language')}</p>
                    <p className="font-normal">{user.language_preference}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('system.lastLogin')}</p>
                    <p className="font-normal">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
