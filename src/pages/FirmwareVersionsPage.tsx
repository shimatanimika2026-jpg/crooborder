import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface FirmwareVersion {
  id: number;
  version_code: string;
  version_name: string;
  firmware_type: string;
  file_url: string;
  file_size: number;
  file_hash: string;
  release_notes_zh: string;
  release_notes_ja: string;
  is_stable: boolean;
  is_active: boolean;
  min_compatible_version: string;
  released_at: string;
}

export default function FirmwareVersionsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<FirmwareVersion[]>([]);
  const [activeTab, setActiveTab] = useState('robot_firmware');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('firmware_versions')
        .select('*')
        .order('released_at', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error(t('firmware.errorLoad'), error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, 'default' | 'secondary'> = {
      robot_firmware: 'default',
      app: 'secondary',
      controller: 'default',
    };
    return colorMap[type] || 'default';
  };

  const filteredVersions = versions.filter(v => {
    const matchesType = v.firmware_type === activeTab;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && v.is_active) ||
      (statusFilter === 'inactive' && !v.is_active);
    return matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-64 bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight">{t('ota.firmwareVersions')}</h1>
          <p className="text-muted-foreground">{t('ota.versionSubtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">已激活</SelectItem>
              <SelectItem value="inactive">已停用</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/ota/versions/create')}>
            <Plus className="mr-2 h-4 w-4" />
            新增版本
          </Button>
        </div>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="robot_firmware">{t('ota.robotFirmware')}</TabsTrigger>
          <TabsTrigger value="app">{t('ota.appVersion')}</TabsTrigger>
          <TabsTrigger value="controller">{t('ota.controller')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredVersions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t('common.noData')}</p>
              </CardContent>
            </Card>
          ) : (
            filteredVersions.map((version) => (
              <Card 
                key={version.id} 
                className="hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/ota/versions/${version.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-border bg-muted/30">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-normal">
                          {version.version_name}
                        </CardTitle>
                        <CardDescription>
                          {version.version_code} • {formatFileSize(version.file_size)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {version.is_stable && (
                        <Badge variant="default">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {t('ota.stable')}
                        </Badge>
                      )}
                      {!version.is_stable && (
                        <Badge variant="secondary">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          {t('ota.beta')}
                        </Badge>
                      )}
                      {!version.is_active && (
                        <Badge variant="destructive">{t('ota.inactive')}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 发布说明 */}
                    <div>
                      <p className="text-sm font-normal mb-2">{t('ota.releaseNotes')}</p>
                      <p className="text-sm text-muted-foreground">
                        {i18n.language === 'ja-JP'
                          ? version.release_notes_ja
                          : version.release_notes_zh}
                      </p>
                    </div>

                    {/* 详细信息 */}
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">{t('ota.fileHash')}</p>
                        <p className="font-mono text-xs">{version.file_hash.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('ota.minCompatible')}</p>
                        <p className="font-normal">
                          {version.min_compatible_version || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('ota.releaseDate')}</p>
                        <p className="font-normal">
                          {new Date(version.released_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('common.status')}</p>
                        <Badge variant={getTypeColor(version.firmware_type)}>
                          {t(`ota.${version.firmware_type}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
