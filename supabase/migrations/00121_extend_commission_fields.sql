-- 扩展委托单表字段

-- 新增核心字段
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'china' CHECK (country IN ('china', 'japan'));
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS responsible_party VARCHAR(50) DEFAULT 'china' CHECK (responsible_party IN ('china', 'japan', 'both'));
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS pending_arrival_confirmation BOOLEAN DEFAULT FALSE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS arrival_confirmation_completed_at TIMESTAMPTZ;

-- 新增中方占位字段（仅中方视图可见）
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS cost_info TEXT;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS confidential_customer_details TEXT;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS supplier_evaluation TEXT;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_commissions_country ON commissions(country);
CREATE INDEX IF NOT EXISTS idx_commissions_responsible_party ON commissions(responsible_party);
CREATE INDEX IF NOT EXISTS idx_commissions_pending_arrival ON commissions(pending_arrival_confirmation) WHERE pending_arrival_confirmation = TRUE;

-- 创建触发器：出货后自动设置待到货确认状态
CREATE OR REPLACE FUNCTION auto_set_pending_arrival_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- 当状态更新为shipped时，自动设置pending_arrival_confirmation为true
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    NEW.pending_arrival_confirmation := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_set_pending_arrival_confirmation
BEFORE UPDATE ON commissions
FOR EACH ROW
EXECUTE FUNCTION auto_set_pending_arrival_confirmation();

-- 注释说明
COMMENT ON COLUMN commissions.country IS '国家：china（中国）或 japan（日本）';
COMMENT ON COLUMN commissions.responsible_party IS '责任方：china（中方）、japan（日方）或 both（双方）';
COMMENT ON COLUMN commissions.pending_arrival_confirmation IS '待到货确认状态：true表示待确认，false表示已确认';
COMMENT ON COLUMN commissions.arrival_confirmation_completed_at IS '到货确认完成时间';
COMMENT ON COLUMN commissions.cost_info IS '[中方占位] 成本信息';
COMMENT ON COLUMN commissions.internal_notes IS '[中方占位] 内部备注';
COMMENT ON COLUMN commissions.confidential_customer_details IS '[中方占位] 非公开客户详情';
COMMENT ON COLUMN commissions.supplier_evaluation IS '[中方占位] 供应商评价';