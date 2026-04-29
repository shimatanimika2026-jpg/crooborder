
-- 添加累计运行时长字段
ALTER TABLE aging_tests 
ADD COLUMN IF NOT EXISTS accumulated_run_minutes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_pause_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_segments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN aging_tests.accumulated_run_minutes IS '累计净运行时长(分钟)，不包含暂停和中断时间';
COMMENT ON COLUMN aging_tests.last_pause_at IS '最后一次暂停时间';
COMMENT ON COLUMN aging_tests.pause_segments IS '暂停时间段记录 [{paused_at, resumed_at}]';
