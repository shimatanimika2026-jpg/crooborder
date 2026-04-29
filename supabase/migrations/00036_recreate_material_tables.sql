-- 删除旧表
DROP TABLE IF EXISTS material_consumption_records CASCADE;
DROP TABLE IF EXISTS material_reservations CASCADE;

-- 创建物料预占记录表
CREATE TABLE material_reservations (
  id BIGSERIAL PRIMARY KEY,
  reservation_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  receiving_record_item_id BIGINT NOT NULL REFERENCES receiving_record_items(id) ON DELETE RESTRICT,
  reserved_qty DECIMAL(10,2) NOT NULL CHECK (reserved_qty > 0),
  reserved_by UUID NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL CHECK (source_type IN ('assembly', 'rework', 'testing', 'other')),
  source_id BIGINT,
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),
  consumed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建物料消耗记录表
CREATE TABLE material_consumption_records (
  id BIGSERIAL PRIMARY KEY,
  consumption_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  receiving_record_item_id BIGINT NOT NULL REFERENCES receiving_record_items(id) ON DELETE RESTRICT,
  reservation_id BIGINT REFERENCES material_reservations(id) ON DELETE SET NULL,
  consumed_qty DECIMAL(10,2) NOT NULL CHECK (consumed_qty > 0),
  consumed_by UUID NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL CHECK (source_type IN ('assembly', 'rework', 'testing', 'other')),
  source_id BIGINT,
  source_reference TEXT,
  unit_serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_material_reservations_receiving_item ON material_reservations(receiving_record_item_id);
CREATE INDEX idx_material_reservations_status ON material_reservations(status);
CREATE INDEX idx_material_reservations_source ON material_reservations(source_type, source_id);
CREATE INDEX idx_material_reservations_reserved_by ON material_reservations(reserved_by);
CREATE INDEX idx_material_reservations_tenant ON material_reservations(tenant_id);

CREATE INDEX idx_material_consumption_receiving_item ON material_consumption_records(receiving_record_item_id);
CREATE INDEX idx_material_consumption_reservation ON material_consumption_records(reservation_id);
CREATE INDEX idx_material_consumption_source ON material_consumption_records(source_type, source_id);
CREATE INDEX idx_material_consumption_unit_serial ON material_consumption_records(unit_serial_number);
CREATE INDEX idx_material_consumption_tenant ON material_consumption_records(tenant_id);