import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';

type FirmwareVersion = {
  id: number;
  version_name: string;
  version_code: string;
  firmware_type: string;
  is_active: boolean;
  is_stable: boolean;
  release_notes?: string | null;
  release_notes_zh?: string | null;
  release_notes_ja?: string | null;
  download_url?: string | null;
  file_url?: string | null;
  file_hash?: string | null;
  file_size?: number | null;
  released_at?: string | null;
  min_compatible_version?: string | null;
  created_at: string;
};

export default function FirmwareVersionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState<FirmwareVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchVersionDetail();
    }
  }, [id]);

  const fetchVersionDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('firmware_versions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setVersion(data);
    } catch (error) {
      console.error('加载失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!version) return;

    try {
      const { error } = await supabase
        .from('firmware_versions')
        .update({ is_active: !version.is_active })
        .eq('id', version.id);

      if (error) throw error;

      toast.success(version.is_active ? '已停用' : '已激活');
      setVersion({ ...version, is_active: !version.is_active });
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      robot_firmware: '机器人固件',
      app: '应用程序',
      controller: '控制器',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">版本不存在</p>
          <Button onClick={() => navigate('/ota/versions')} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ota/versions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-normal">{version.version_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              版本号: {version.version_code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {version.is_active ? (
            <Badge variant="default">已激活</Badge>
          ) : (
            <Badge variant="secondary">已停用</Badge>
          )}
          {version.is_stable && <Badge variant="default">稳定版</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">固件类型</div>
              <div className="mt-1">{getTypeLabel(version.firmware_type)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">版本号</div>
              <div className="mt-1 font-mono">{version.version_code}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">文件大小</div>
              <div className="mt-1">{version.file_size != null ? (version.file_size / 1024 / 1024).toFixed(2) + ' MB' : '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">文件哈希</div>
              <div className="mt-1 font-mono text-xs break-all">{version.file_hash}</div>
            </div>
            {version.min_compatible_version && (
              <div>
                <div className="text-sm text-muted-foreground">最低兼容版本</div>
                <div className="mt-1">{version.min_compatible_version}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">发布信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">发布时间</div>
              <div className="mt-1">
                {version.released_at ? new Date(version.released_at).toLocaleString('zh-CN') : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">创建时间</div>
              <div className="mt-1">
                {new Date(version.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">状态</div>
              <div className="mt-1">
                {version.is_active ? '已激活' : '已停用'}
                {version.is_stable && ' · 稳定版'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">发布说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {version.release_notes_zh && (
            <div>
              <div className="text-sm font-medium mb-2">中文</div>
              <div className="text-sm whitespace-pre-wrap">{version.release_notes_zh}</div>
            </div>
          )}
          {version.release_notes_ja && (
            <div>
              <div className="text-sm font-medium mb-2">日文</div>
              <div className="text-sm whitespace-pre-wrap">{version.release_notes_ja}</div>
            </div>
          )}
          {!version.release_notes_zh && !version.release_notes_ja && (
            <div className="text-sm text-muted-foreground">暂无发布说明</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">文件信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">文件URL</div>
              <div className="mt-1 font-mono text-xs break-all">{version.file_url}</div>
            </div>
            {version.file_url && !version.file_url.includes('placeholder') && (
              <Button variant="outline" size="sm" asChild>
                <a href={version.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  下载
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/ota/versions')}>
          返回列表
        </Button>
        <Button onClick={handleToggleActive}>
          {version.is_active ? '停用版本' : '激活版本'}
        </Button>
      </div>
    </div>
  );
}
