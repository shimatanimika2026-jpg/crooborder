import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Menu, User, LogOut, Globe, LayoutDashboard, Package, ClipboardList, CheckSquare, Warehouse, Truck, FileText, Inbox, ClipboardCheck, AlertTriangle, Monitor, Wrench, TestTube, Shield, Send, Search, Smartphone, Settings, AlertCircle, FileCheck, Building2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { DemoModeBanner } from '@/components/system/DemoModeBanner';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 导航菜单分组
  const navGroups = [
    {
      title: t('nav.coreBusiness'),
      items: [
        { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
        { path: '/executive/dashboard', label: t('executive.title'), icon: LayoutDashboard },
        { path: '/operations-dashboard', label: t('nav.operationsDashboard'), icon: Monitor },
        { path: '/logistics-dashboard', label: t('nav.logisticsDashboard'), icon: Truck },
        { path: '/collaboration/china', label: t('collaboration.title'), icon: Globe },
        { path: '/commission', label: t('commission.title'), icon: Briefcase },
        { path: '/production-plans', label: t('nav.productionPlan'), icon: ClipboardList },
        { path: '/production-orders', label: t('nav.productionOrder'), icon: Package },
        { path: '/quality-inspections', label: t('nav.qualityInspection'), icon: CheckSquare },
        { path: '/inventory', label: t('nav.inventory'), icon: Warehouse },
        { path: '/logistics', label: t('nav.logistics'), icon: Truck },
      ],
    },
    {
      title: t('nav.materialManagement'),
      items: [
        { path: '/asn', label: t('nav.asn'), icon: FileText },
        { path: '/receiving', label: t('nav.receiving'), icon: Inbox },
        { path: '/iqc', label: t('nav.iqc'), icon: ClipboardCheck },
        { path: '/disposition', label: t('nav.disposition'), icon: AlertTriangle },
      ],
    },
    {
      title: t('nav.exceptionManagement'),
      items: [
        { path: '/exceptions', label: t('nav.exceptions'), icon: AlertCircle },
      ],
    },
    {
      title: t('nav.qualityManagement'),
      items: [
        { path: '/special-approval', label: t('nav.specialApproval'), icon: FileCheck },
        { path: '/suppliers', label: t('nav.suppliers'), icon: Building2 },
      ],
    },
    {
      title: t('nav.productionExecution'),
      items: [
        { path: '/assembly/andon', label: t('nav.andonBoard'), icon: Monitor },
        { path: '/assembly/complete', label: t('nav.assemblyComplete'), icon: Wrench },
        { path: '/aging/tests', label: t('nav.agingTests'), icon: TestTube },
        { path: '/final-test', label: t('nav.finalTest'), icon: CheckSquare },
        { path: '/qa-release', label: t('nav.qaRelease'), icon: Shield },
        { path: '/shipment', label: t('nav.shipment'), icon: Send },
        { path: '/shipping-orders', label: t('nav.shippingOrders'), icon: Send },
      ],
    },
    {
      title: t('nav.auxiliaryFunctions'),
      items: [
        { path: '/traceability', label: t('nav.traceability'), icon: Search },
        { path: '/ota/versions', label: t('nav.otaVersions'), icon: Smartphone },
      ],
    },
  ];

  const isAdmin = profile?.role === 'admin' || profile?.role === 'system_admin';

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'zh-CN' ? 'ja-JP' : 'zh-CN';
    i18n.changeLanguage(newLang);
    
    // 如果用户已登录，更新数据库中的语言偏好
    if (profile?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ language_preference: newLang })
          .eq('id', profile.id);
      } catch (error) {
        console.error('更新语言偏好失败:', error);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // 左侧导航内容
  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background">
      {/* Logo 区域 */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <Link to="/" className="flex items-center space-x-3">
          <Package className="h-7 w-7 text-primary" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight text-foreground">
            組立業務Web管理システム
          </span>
        </Link>
      </div>

      {/* 导航菜单 */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-6">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              <div className="px-3 py-1">
                <p className="text-xs font-medium text-muted-foreground">{group.title}</p>
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                      active
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          {isAdmin && (
            <div className="space-y-1">
              <div className="px-3 py-1">
                <p className="text-xs font-medium text-muted-foreground">系统管理</p>
              </div>
              <Link
                to="/system"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                  isActive('/system')
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={isActive('/system') ? 2 : 1.5} />
                <span className="truncate">{t('nav.system')}</span>
              </Link>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* 用户信息区域 */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={toggleLanguage}>
            <Globe className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 flex-1 justify-start gap-2 px-2">
                <User className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate text-xs">{profile?.full_name || profile?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || profile?.username}</p>
                  <p className="text-xs font-normal text-muted-foreground">{t(`system.${profile?.role}`)}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* 桌面端固定左侧导航 - 始终可见 */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col border-r border-border bg-background">
        <SidebarContent />
      </aside>

      {/* 移动端抽屉导航 */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-40 lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* 主内容区 - 页面自行管理标题和内容 */}
      <main className="w-full lg:pl-64 min-h-screen">
        <DemoModeBanner />
        {children}
      </main>
    </div>
  );
}
