import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">用户协议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            欢迎使用組立業務Web管理システム。在使用本系统前,请仔细阅读本用户协议。
          </p>
          <p>
            本协议为示例文本,企业应根据实际业务需求和法律法规要求,制定完整的用户协议以规范用户行为并保护各方权益。
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/login">
              <Button variant="outline">返回登录</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
