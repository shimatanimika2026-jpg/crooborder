-- 创建固件文件存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firmware',
  'firmware',
  true,
  104857600, -- 100MB
  ARRAY['application/octet-stream', 'application/x-binary', 'application/x-executable']
)
ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略：管理员可以上传和删除
CREATE POLICY "Admins can upload firmware files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'firmware' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update firmware files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'firmware' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete firmware files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'firmware' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 所有认证用户可以读取固件文件
CREATE POLICY "Authenticated users can read firmware files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'firmware');
