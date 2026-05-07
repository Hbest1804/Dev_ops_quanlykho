-- ============================================================
--  WareFlow – Hệ Thống Quản Lý Kho
--  PostgreSQL Schema
-- ============================================================

-- ── Connect to database ──────────────────────────────────────
\c quanlykho

-- ── Extensions ───────────────────────────────────────────────
-- (bỏ comment nếu cần UUID hoặc citext)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS citext;


-- ── 1. users ─────────────────────────────────────────────────
CREATE TABLE users (
    id          SERIAL          PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    email       VARCHAR(255)    NOT NULL UNIQUE,
    password    VARCHAR(255)    NOT NULL,                        -- bcrypt hash
    role        VARCHAR(20)     NOT NULL
                    CHECK (role IN ('admin', 'warehouse_staff', 'accountant')),
    status      VARCHAR(10)     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'disabled')),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ── 2. refresh_tokens ────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id           SERIAL          PRIMARY KEY,
    user_id      INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        VARCHAR(512)    NOT NULL UNIQUE,               -- SHA-256 hash
    expires_at   TIMESTAMP       NOT NULL,
    is_revoked   BOOLEAN         NOT NULL DEFAULT FALSE,
    replaced_by  VARCHAR(512),                                  -- hash của token mới (rotation)
    user_agent   VARCHAR(512),
    ip_address   VARCHAR(45),                                   -- IPv4 / IPv6
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token      ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);


-- ── 3. products ──────────────────────────────────────────────
CREATE TABLE products (
    id          SERIAL          PRIMARY KEY,
    code        VARCHAR(50)     NOT NULL UNIQUE,
    name        VARCHAR(255)    NOT NULL,
    category    VARCHAR(100)    NOT NULL,
    unit        VARCHAR(50)     NOT NULL,
    description TEXT,
    stock       INTEGER         NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_deleted  BOOLEAN         NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMP,
    deleted_by  INTEGER         REFERENCES users(id),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ── 4. import_orders ─────────────────────────────────────────
CREATE SEQUENCE import_order_code_seq START 1;

CREATE TABLE import_orders (
    id           SERIAL          PRIMARY KEY,
    code         VARCHAR(20)     NOT NULL UNIQUE,               -- PN001, PN002...
    supplier     VARCHAR(255)    NOT NULL,
    status       VARCHAR(20)     NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    import_date  DATE            NOT NULL,
    note         TEXT,
    created_by   INTEGER         NOT NULL REFERENCES users(id),
    confirmed_by INTEGER         REFERENCES users(id),
    confirmed_at TIMESTAMP,
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ── 5. import_order_items ────────────────────────────────────
CREATE TABLE import_order_items (
    id                    SERIAL          PRIMARY KEY,
    import_order_id       INTEGER         NOT NULL
                              REFERENCES import_orders(id) ON DELETE CASCADE,
    product_id            INTEGER         NOT NULL REFERENCES products(id),
    quantity              INTEGER         NOT NULL CHECK (quantity > 0),
    note                  TEXT,

    -- Snapshot tại thời điểm tạo phiếu
    snapshot_product_code VARCHAR(50)     NOT NULL,
    snapshot_product_name VARCHAR(255)    NOT NULL,
    snapshot_unit         VARCHAR(50)     NOT NULL,
    snapshot_category     VARCHAR(100)    NOT NULL
);


-- ── 6. export_orders ─────────────────────────────────────────
CREATE TABLE export_orders (
    id           SERIAL          PRIMARY KEY,
    code         VARCHAR(20)     NOT NULL UNIQUE,               -- PX001, PX002...
    reason       VARCHAR(20)     NOT NULL
                     CHECK (reason IN ('sale', 'internal', 'damaged')),
    status       VARCHAR(20)     NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    export_date  DATE            NOT NULL,
    note         TEXT,
    created_by   INTEGER         NOT NULL REFERENCES users(id),
    confirmed_by INTEGER         REFERENCES users(id),
    confirmed_at TIMESTAMP,
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ── 7. export_order_items ────────────────────────────────────
CREATE TABLE export_order_items (
    id                    SERIAL          PRIMARY KEY,
    export_order_id       INTEGER         NOT NULL
                              REFERENCES export_orders(id) ON DELETE CASCADE,
    product_id            INTEGER         NOT NULL REFERENCES products(id),
    quantity              INTEGER         NOT NULL CHECK (quantity > 0),
    note                  TEXT,

    -- Snapshot tại thời điểm tạo phiếu
    snapshot_product_code VARCHAR(50)     NOT NULL,
    snapshot_product_name VARCHAR(255)    NOT NULL,
    snapshot_unit         VARCHAR(50)     NOT NULL,
    snapshot_category     VARCHAR(100)    NOT NULL
);


-- ── 8. stock_transactions ────────────────────────────────────
CREATE TABLE stock_transactions (
    id                    SERIAL          PRIMARY KEY,
    product_id            INTEGER         NOT NULL REFERENCES products(id),
    type                  VARCHAR(10)     NOT NULL CHECK (type IN ('import', 'export')),
    quantity              INTEGER         NOT NULL,             -- dương = nhập, âm = xuất
    stock_after           INTEGER         NOT NULL,
    ref_type              VARCHAR(20)
                              CHECK (ref_type IN ('import_order', 'export_order')),
    ref_id                INTEGER,                             -- FK mềm đến import/export_orders
    created_by            INTEGER         NOT NULL REFERENCES users(id),
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),

    -- Snapshot tại thời điểm ghi log
    snapshot_product_code VARCHAR(50)     NOT NULL,
    snapshot_product_name VARCHAR(255)    NOT NULL,
    snapshot_unit         VARCHAR(50)     NOT NULL
);

CREATE INDEX idx_stock_transactions_product_id ON stock_transactions(product_id);
CREATE INDEX idx_stock_transactions_created_at ON stock_transactions(created_at);


-- ── Trigger: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_import_orders_updated_at
    BEFORE UPDATE ON import_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_export_orders_updated_at
    BEFORE UPDATE ON export_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
