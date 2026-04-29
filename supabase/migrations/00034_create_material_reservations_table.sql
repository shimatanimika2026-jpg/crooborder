-- 创建物料预占记录表
CREATE TABLE IF NOT EXISTS material_reservations (
  id BIGSERIAL PRIMARY KEY,
  reservation_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  receiving_item_id BIGINT NOT NULL REFERENCES receiving_record_items(id) ON DELETE RESTRICT,
  reserved_qty DECIMAL(10,2) NOT NULL CHECK (reserved_qty > 0),
  reserved_by UUID NOT NULL REFERENCES auth.users(id),
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

-- 创建索引
CREATE INDEX idx_material_reservations_receiving_item ON material_reservations(receiving_item_id);
CREATE INDEX idx_material_reservations_status ON material_reservations(status);
CREATE INDEX idx_material_reservations_source ON material_reservations(source_type, source_id);
CREATE INDEX idx_material_reservations_reserved_by ON material_reservations(reserved_by);
CREATE INDEX idx_material_reservations_tenant ON material_reservations(tenant_id);

-- 添加注释
COMMENT ON TABLE material_reservations IS '物料预占记录表';
COMMENT ON COLUMN material_reservations.reservation_code IS '预占编号';
COMMENT ON COLUMN material_reservations.receiving_item_id IS '收货明细ID';
COMMENT ON COLUMN material_reservations.reserved_qty IS '预占数量';
COMMENT ON COLUMN material_reservations.source_type IS '预占来源类型';
COMMENT ON COLUMN material_reservations.source_id IS '预占来源ID';
COMMENT ON COLUMN material_reservations.status IS '预占状态：active-生效中, consumed-已消耗, released-已释放, expired-已过期';