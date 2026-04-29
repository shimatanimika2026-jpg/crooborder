import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/contexts/NotificationContext';
import { type Notification } from '@/contexts/NotificationContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, ja } from 'date-fns/locale';

export function NotificationCenter() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  const locale = i18n.language === 'ja-JP' ? ja : zhCN;

  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent') {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }

    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 'unread') {
      await markAsRead(notification.id);
    }

    if (notification.related_module) {
      // 优先直达详情页，次选带筛选列表
      const routeMap: Record<string, string> = {
        production: notification.related_id 
          ? `/production-plans/${notification.related_id}` 
          : '/production-plans',
        quality: notification.related_id 
          ? `/quality-inspections?focus=${notification.related_id}` 
          : '/quality-inspections',
        logistics: notification.related_id 
          ? `/logistics/${notification.related_id}` 
          : '/logistics-dashboard',
        ota: notification.related_id 
          ? `/ota/versions/${notification.related_id}` 
          : '/ota/versions',
        andon: '/assembly/andon',
        asn: notification.related_id 
          ? `/asn/${notification.related_id}` 
          : '/asn',
        receiving: notification.related_id 
          ? `/receiving/${notification.related_id}` 
          : '/receiving',
        exception: notification.related_id 
          ? `/exceptions/${notification.related_id}` 
          : '/exceptions',
        assembly: notification.related_sn
          ? `/assembly/complete?sn=${notification.related_sn}`
          : notification.related_id
          ? `/assembly/complete?unit_id=${notification.related_id}`
          : '/assembly/complete',
        aging: notification.related_id 
          ? `/aging/tests?focus=${notification.related_id}` 
          : '/aging/tests',
        final_test: notification.related_id 
          ? `/final-test?test_id=${notification.related_id}` 
          : '/final-test',
        qa_release: notification.related_id 
          ? `/qa-release?release_id=${notification.related_id}` 
          : '/qa-release',
        shipment: notification.related_id 
          ? `/shipment?confirmation_id=${notification.related_id}` 
          : '/shipment',
      };

      const route = routeMap[notification.related_module];
      if (route) {
        navigate(route);
        setOpen(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-normal text-base">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/30 cursor-pointer transition-colors ${
                    notification.status === 'unread' ? 'bg-muted/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(notification.notification_type, notification.priority)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-normal leading-tight">
                          {notification.title}
                        </p>
                        {notification.status === 'unread' && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale,
                          })}
                        </p>
                        <div className="flex gap-1">
                          {notification.status === 'unread' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

      </PopoverContent>
    </Popover>
  );
}
