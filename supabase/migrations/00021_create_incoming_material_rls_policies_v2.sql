
-- 创建物流控制链RLS策略 (使用正确的角色名)

-- 1. ASN发货单策略
ALTER TABLE asn_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "中国工厂可管理ASN发货单"
ON asn_shipments
FOR ALL
TO authenticated
USING (
  tenant_id = 'CN' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IN ('CN', 'BOTH')
    AND profiles.role IN ('cn_logistics_staff', 'cn_production_staff', 'admin')
  )
);

CREATE POLICY "日本工厂可查看ASN发货单"
ON asn_shipments
FOR SELECT
TO authenticated
USING (
  destination_factory_id LIKE 'JP%' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IN ('JP', 'BOTH')
  )
);

-- 2. ASN发货明细策略
ALTER TABLE asn_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "中国工厂可管理ASN发货明细"
ON asn_shipment_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM asn_shipments
    WHERE asn_shipments.id = asn_shipment_items.shipment_id
    AND asn_shipments.tenant_id = 'CN'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id IN ('CN', 'BOTH')
      AND profiles.role IN ('cn_logistics_staff', 'cn_production_staff', 'admin')
    )
  )
);

CREATE POLICY "日本工厂可查看ASN发货明细"
ON asn_shipment_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM asn_shipments
    WHERE asn_shipments.id = asn_shipment_items.shipment_id
    AND asn_shipments.destination_factory_id LIKE 'JP%'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id IN ('JP', 'BOTH')
    )
  )
);

-- 3. 收货明细策略
ALTER TABLE receiving_record_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "日本工厂可管理收货明细"
ON receiving_record_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM receiving_records
    WHERE receiving_records.id = receiving_record_items.receiving_id
    AND receiving_records.tenant_id = 'JP'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id IN ('JP', 'BOTH')
      AND profiles.role IN ('jp_warehouse_staff', 'jp_assembly_staff', 'jp_quality_inspector', 'admin')
    )
  )
);

-- 4. IQC检验策略
ALTER TABLE iqc_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "日本质检员可管理IQC检验"
ON iqc_inspections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IN ('JP', 'BOTH')
    AND profiles.role IN ('jp_quality_inspector', 'admin')
  )
);

CREATE POLICY "日本现场人员可查看IQC检验"
ON iqc_inspections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IN ('JP', 'BOTH')
  )
);

-- 5. 来料处置策略
ALTER TABLE incoming_material_dispositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "日本质检员可管理来料处置"
ON incoming_material_dispositions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IN ('JP', 'BOTH')
    AND profiles.role IN ('jp_quality_inspector', 'admin')
  )
);

CREATE POLICY "日本现场人员可查看来料处置"
ON incoming_material_dispositions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id IN ('JP', 'BOTH')
  )
);
