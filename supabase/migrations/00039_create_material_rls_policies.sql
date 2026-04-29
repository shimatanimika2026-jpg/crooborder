-- 启用 RLS
ALTER TABLE material_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_consumption_records ENABLE ROW LEVEL SECURITY;

-- material_reservations 策略
CREATE POLICY "允许所有认证用户查看预占记录"
ON material_reservations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "允许所有认证用户创建预占记录"
ON material_reservations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "允许所有认证用户更新预占记录"
ON material_reservations FOR UPDATE
TO authenticated
USING (true);

-- material_consumption_records 策略
CREATE POLICY "允许所有认证用户查看消耗记录"
ON material_consumption_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "允许所有认证用户创建消耗记录"
ON material_consumption_records FOR INSERT
TO authenticated
WITH CHECK (true);