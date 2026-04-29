import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoMode } from '@/lib/runtime-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Info, ArrowRight, Settings } from 'lucide-react';

/** 演示模式独立登录页 —— 不展示任何环境变量或配置提示，直接提供业务入口 */
function DemoLoginCard({ onEnter }: { onEnter: () => void }) {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-4 text-center pb-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-2">
          <img src="/logo-light.svg" alt="協作ロボット Logo" className="h-8 object-contain dark:hidden" />
          <img src="/logo-dark.svg" alt="協作ロボット Logo" className="h-8 object-contain hidden dark:block" />
        </div>
        <CardTitle className="text-2xl font-bold">組立業務Web管理システム</CardTitle>
        <CardDescription>中国協作ロボット日本委託組立業務管理</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 进入按钮：Demo 模式下直接进入，无需配置 */}
        <Button
          type="button"
          className="w-full"
          onClick={onEnter}
        >
          进入系统
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          演示模式 · 数据仅供展示
        </p>

        {/* 配置说明链接：需要连接真实数据库时可查阅，不在默认导航中 */}
        <div className="pt-1 text-center">
          <Link
            to="/config-error"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <Settings className="h-3 w-3" />
            需要连接真实数据库？查看 Supabase 配置说明
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** 真实环境登录页 */
function RealLoginCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithUsername, signUpWithUsername } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateUsername = (value: string) => /^[a-zA-Z0-9_]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error(t('auth.usernameRequired')); return; }
    if (!validateUsername(username)) { toast.error(t('auth.usernameFormat')); return; }
    if (password.length < 6) { toast.error(t('auth.passwordLength')); return; }
    if (!isLogin) {
      if (password !== confirmPassword) { toast.error(t('auth.passwordMismatch')); return; }
      if (!agreedToTerms) { toast.error(t('auth.pleaseAgreeTerms')); return; }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signInWithUsername(username, password);
        if (error) {
          toast.error(t('auth.loginFailed') + ': ' + error.message);
        } else {
          toast.success(t('auth.loginSuccess'));
          const from = (location.state as { from?: string })?.from || '/';
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signUpWithUsername(username, password);
        if (error) {
          toast.error(t('auth.registerFailed') + ': ' + error.message);
        } else {
          toast.success(t('auth.registerSuccess'));
          const { error: loginError } = await signInWithUsername(username, password);
          if (!loginError) navigate('/', { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 测试账号提示（登录模式） */}
      {isLogin && (
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <div className="font-medium mb-2">测试账号（开发环境）</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>• 日本组装: <code className="px-1 py-0.5 bg-muted rounded">jp_assembly</code> / <code className="px-1 py-0.5 bg-muted rounded">password123</code></div>
              <div>• 日本QA: <code className="px-1 py-0.5 bg-muted rounded">jp_qa</code> / <code className="px-1 py-0.5 bg-muted rounded">password123</code></div>
              <div>• 高层用户: <code className="px-1 py-0.5 bg-muted rounded">newuser</code> / <code className="px-1 py-0.5 bg-muted rounded">password123</code></div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="/logo-light.svg" alt="協作ロボット Logo" className="h-8 object-contain dark:hidden" />
            <img src="/logo-dark.svg" alt="協作ロボット Logo" className="h-8 object-contain hidden dark:block" />
          </div>
          <CardTitle className="text-2xl font-bold">組立業務Web管理システム</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('common.username')}</Label>
                <Input id="username" type="text" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('common.username')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('common.password')} required />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('common.confirmPassword')}</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('common.confirmPassword')} required />
                </div>
              )}
              {!isLogin && (
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
                  <label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
                    {t('auth.agreeTerms')}
                    <Link to="/terms" className="text-primary hover:underline mx-1">{t('auth.userAgreement')}</Link>
                    {t('auth.and')}
                    <Link to="/privacy" className="text-primary hover:underline mx-1">{t('auth.privacyPolicy')}</Link>
                  </label>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : isLogin ? t('common.login') : t('common.register')}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
              </span>
              <Button type="button" variant="link" className="p-0 ml-1"
                onClick={() => { setIsLogin(!isLogin); setPassword(''); setConfirmPassword(''); setAgreedToTerms(false); }}>
                {isLogin ? t('auth.registerNow') : t('auth.loginNow')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInAsDemo } = useAuth();

  const handleDemoEntry = () => {
    signInAsDemo();
    toast.success('已进入演示模式');
    const from = (location.state as { from?: string })?.from || '/';
    navigate(from, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {isDemoMode()
          ? <DemoLoginCard onEnter={handleDemoEntry} />
          : <RealLoginCard />
        }
      </div>
    </div>
  );
}
