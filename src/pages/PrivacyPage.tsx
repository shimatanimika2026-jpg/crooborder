import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">隐私政策</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            我们重视您的隐私保护。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。
          </p>
          <p>
            本政策为示例文本,企业应根据实际数据处理活动和相关法律法规(如《个人信息保护法》、GDPR等),制定完整的隐私政策以保障用户隐私权益。
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
