import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/db/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

export interface Notification {
  id: number;
  user_id: string;
  notification_type: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read';
  channels: {
    browser?: boolean;
    line?: boolean;
    wechat?: boolean;
    email?: boolean;
    app?: boolean;
  };
  related_module: string;
  related_id: number | null;
  related_sn?: string | null;
  created_at: string;
  read_at: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  sendNotification: (notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'read_at' | 'status'>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载通知
  const loadNotifications = useCallback(async () => {
    if (!user || !supabase) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: Notification) => n.status === 'unread').length);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 订阅实时通知
  useEffect(() => {
    if (!user || !supabase) return;

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // 浏览器通知
          if (newNotification.channels?.browser && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.content,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
              });
            }
          }

          // Toast通知
          const toastVariant = newNotification.priority === 'urgent' || newNotification.priority === 'high' 
            ? 'destructive' 
            : 'default';

          toast(newNotification.title, {
            description: newNotification.content,
            icon: <Bell className="h-4 w-4" />,
            duration: newNotification.priority === 'urgent' ? 10000 : 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          
          if (updatedNotification.status === 'read') {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, loadNotifications]);

  // 请求浏览器通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 标记为已读
  const markAsRead = async (id: number) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('标记通知失败:', error);
      toast.error('操作失败');
    }
  };

  // 全部标记为已读
  const markAllAsRead = async () => {
    if (!user || !supabase) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'unread');

      if (error) throw error;

      setUnreadCount(0);
      toast.success('已全部标记为已读');
    } catch (error) {
      console.error('标记全部通知失败:', error);
      toast.error('操作失败');
    }
  };

  // 删除通知
  const deleteNotification = async (id: number) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('通知已删除');
    } catch (error) {
      console.error('删除通知失败:', error);
      toast.error('删除失败');
    }
  };

  // 发送通知
  const sendNotification = async (
    notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'read_at' | 'status'>
  ) => {
    if (!user || !supabase) return;

    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        ...notification,
        status: 'unread',
      });

      if (error) throw error;
    } catch (error) {
      console.error('发送通知失败:', error);
      throw error;
    }
  };

  // 刷新通知
  const refreshNotifications = async () => {
    await loadNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        sendNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
