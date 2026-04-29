
-- 创建物流控制链数据库表结构 (跳过已存在的receiving_records)

-- 1. ASN发货单表
CREATE TABLE IF NOT EXISTS asn_shipments (
  id BIGSERIAL PRIMARY KEY,
  shipment_no VARCHAR(50) UNIQUE NOT NULL,
  tenant_id VARCHAR(20) NOT NULL DEFAULT 'CN',
  factory_id VARCHAR(50) NOT NULL DEFAULT 'CN-FAIRINO',
  destination_factory_id VARCHAR(50) NOT NULL DEFAULT 'JP-MICROTEC',
  product_model_id BIGINT REFERENCES product_models(id),
  shipment_date TIMESTAMPTZ NOT NULL,
  eta_date TIMESTAMPTZ,
  carrier VARCHAR(100),
  tracking_no VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shipped', 'in_transit', 'arrived', 'received', 'cancelled')),
  total_boxes INTEGER DEFAULT 0,
  total_pallets INTEGER DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asn_shipments_no ON asn_shipments(shipment_no);
CREATE INDEX IF NOT EXISTS idx_asn_shipments_status ON asn_shipments(status);
CREATE INDEX IF NOT EXISTS idx_asn_shipments_eta ON asn_shipments(eta_date);

-- 2. ASN发货明细表
CREATE TABLE IF NOT EXISTS asn_shipment_items (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES asn_shipments(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  part_category VARCHAR(50),
  batch_no VARCHAR(50),
  box_no VARCHAR(50),
  pallet_no VARCHAR(50),
  shipped_qty DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'PCS',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shipment_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_asn_items_shipment ON asn_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_asn_items_part ON asn_shipment_items(part_no);
CREATE INDEX IF NOT EXISTS idx_asn_items_batch ON asn_shipment_items(batch_no);

-- 3. 收货明细表
CREATE TABLE IF NOT EXISTS receiving_record_items (
  id BIGSERIAL PRIMARY KEY,
  receiving_id BIGINT NOT NULL REFERENCES receiving_records(id) ON DELETE CASCADE,
  shipment_item_id BIGINT REFERENCES asn_shipment_items(id),
  line_no INTEGER NOT NULL,
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  batch_no VARCHAR(50),
  box_no VARCHAR(50),
  expected_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  received_qty DECIMAL(10,2) NOT NULL,
  variance_qty DECIMAL(10,2) GENERATED ALWAYS AS (received_qty - expected_qty) STORED,
  variance_type VARCHAR(20) CHECK (variance_type IN ('matched', 'shortage', 'overage', 'wrong_item', 'damaged')),
  unit VARCHAR(20) DEFAULT 'PCS',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receiving_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_receiving_items_receiving ON receiving_record_items(receiving_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_part ON receiving_record_items(part_no);
CREATE INDEX IF NOT EXISTS idx_receiving_items_variance ON receiving_record_items(variance_type);

-- 4. IQC检验记录表
CREATE TABLE IF NOT EXISTS iqc_inspections (
  id BIGSERIAL PRIMARY KEY,
  inspection_no VARCHAR(50) UNIQUE NOT NULL,
  receiving_id BIGINT REFERENCES receiving_records(id),
  receiving_item_id BIGINT REFERENCES receiving_record_items(id),
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  batch_no VARCHAR(50),
  inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('sampling', 'full', 'skip')),
  sample_size INTEGER,
  inspected_qty DECIMAL(10,2),
  result VARCHAR(20) NOT NULL CHECK (result IN ('OK', 'HOLD', 'NG')),
  defect_code VARCHAR(50),
  defect_description TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspected_by UUID REFERENCES profiles(id),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iqc_no ON iqc_inspections(inspection_no);
CREATE INDEX IF NOT EXISTS idx_iqc_receiving ON iqc_inspections(receiving_id);
CREATE INDEX IF NOT EXISTS idx_iqc_result ON iqc_inspections(result);
CREATE INDEX IF NOT EXISTS idx_iqc_part ON iqc_inspections(part_no);

-- 5. 来料处置记录表
CREATE TABLE IF NOT EXISTS incoming_material_dispositions (
  id BIGSERIAL PRIMARY KEY,
  disposition_no VARCHAR(50) UNIQUE NOT NULL,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('receiving_variance', 'iqc_hold', 'iqc_ng')),
  source_id BIGINT NOT NULL,
  receiving_id BIGINT REFERENCES receiving_records(id),
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  batch_no VARCHAR(50),
  affected_qty DECIMAL(10,2) NOT NULL,
  disposition_type VARCHAR(30) NOT NULL CHECK (disposition_type IN ('hold', 'special_acceptance', 'rework', 'return', 'scrap', 'use_as_is')),
  disposition_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (disposition_status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  approve_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  block_reason TEXT,
  action_plan TEXT,
  responsible_party VARCHAR(50),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  remarks TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disposition_no ON incoming_material_dispositions(disposition_no);
CREATE INDEX IF NOT EXISTS idx_disposition_source ON incoming_material_dispositions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_disposition_status ON incoming_material_dispositions(disposition_status);
CREATE INDEX IF NOT EXISTS idx_disposition_type ON incoming_material_dispositions(disposition_type);

-- 6. 扩展quality_exceptions表支持来料异常
ALTER TABLE quality_exceptions 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(30),
ADD COLUMN IF NOT EXISTS source_id BIGINT,
ADD COLUMN IF NOT EXISTS part_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS batch_no VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_quality_exceptions_source ON quality_exceptions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_quality_exceptions_part ON quality_exceptions(part_no);
