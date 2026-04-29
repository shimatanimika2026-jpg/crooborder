import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import useGoBack from '@/hooks/use-go-back';
import { getErrorMessage } from '@/lib/error-utils';

interface FormData {
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
}

export default function FirmwareVersionCreatePage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      version_code: '',
      version_name: '',
      firmware_type: 'robot_firmware',
      file_url: '',
      file_size: 0,
      file_hash: '',
      release_notes_zh: '',
      release_notes_ja: '',
      is_stable: false,
      is_active: true,
      min_compatible_version: '',
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件大小（最大100MB）
    if (file.size > 100 * 1024 * 1024) {
      toast.error('文件大小不能超过100MB');
      return;
    }

    setUploading(true);
    try {
      // 生成文件名
      const timestamp = Date.now();
      const fileName = `firmware_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `uploads/${fileName}`;

      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from('firmware')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        // 如果bucket不存在，使用占位URL
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          toast.warning('存储桶未配置，使用临时URL');
          const placeholderUrl = `https://placeholder.firmware/${fileName}`;
          form.setValue('file_url', placeholderUrl);
          form.setValue('file_size', file.size);
          form.setValue('file_hash', `hash_${timestamp}`);
          toast.success('文件信息已记录（演示模式）');
          return;
        }
        throw error;
      }

      // 获取公开URL
      const { data: urlData } = supabase.storage.from('firmware').getPublicUrl(filePath);

      // 计算文件哈希（简化版，使用文件名+大小+时间戳）
      const hash = `${file.name}_${file.size}_${timestamp}`.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0).toString(16);

      // 更新表单
      form.setValue('file_url', urlData.publicUrl);
      form.setValue('file_size', file.size);
      form.setValue('file_hash', hash);

      toast.success('文件上传成功');
    } catch (error: unknown) {
      console.error('文件上传失败:', error);
      toast.error(`文件上传失败: ${getErrorMessage(error, '未知错误')}`);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!data.file_url) {
      toast.error('请先上传固件文件');
      return;
    }

    setSubmitting(true);
    try {
      const { data: newVersion, error } = await supabase
        .from('firmware_versions')
        .insert({
          version_code: data.version_code,
          version_name: data.version_name,
          firmware_type: data.firmware_type,
          file_url: data.file_url,
          file_size: data.file_size,
          file_hash: data.file_hash,
          release_notes_zh: data.release_notes_zh,
          release_notes_ja: data.release_notes_ja,
          is_stable: data.is_stable,
          is_active: data.is_active,
          min_compatible_version: data.min_compatible_version || null,
          released_at: new Date().toISOString(),
          tenant_id: 'tenant-001',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('版本创建成功');
      navigate(`/ota/versions/${newVersion.id}`);
    } catch (error) {
      console.error('创建版本失败:', error);
      toast.error('创建版本失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-light tracking-tight">新增固件版本</h1>
          <p className="text-muted-foreground">上传并发布新的固件版本</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">版本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="version_code"
                  rules={{ required: '请输入版本号' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>版本号</FormLabel>
                      <FormControl>
                        <Input placeholder="例如: 1.0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="version_name"
                  rules={{ required: '请输入版本名称' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>版本名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如: 正式版 1.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firmware_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>固件类型</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="robot_firmware">机器人固件</SelectItem>
                          <SelectItem value="app">应用程序</SelectItem>
                          <SelectItem value="controller">控制器</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_compatible_version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最低兼容版本</FormLabel>
                      <FormControl>
                        <Input placeholder="例如: 0.9.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormLabel>固件文件</FormLabel>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        选择文件
                      </>
                    )}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".bin,.hex,.fw"
                  />
                  {form.watch('file_url') && (
                    <span className="text-sm text-muted-foreground">
                      已上传 ({(form.watch('file_size') / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="release_notes_zh"
                rules={{ required: '请输入中文发布说明' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>发布说明（中文）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="描述此版本的更新内容..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="release_notes_ja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>発表ノート（日本語）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="このバージョンの更新内容を説明してください..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="is_stable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">稳定版</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">启用</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建版本'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={goBack}>
                  取消
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
