# Foot X 数据库设计文档

**版本**: v1.0
**日期**: 2026-03-29
**数据库**: PostgreSQL 14+

---

## 1. 概述

本文档基于数据实体定义，设计 Foot X 系统的数据库表结构。包含表定义、字段说明、索引设计和约束条件。

---

## 2. 表结构总览

| 序号 | 表名 | 说明 | 数据量预估 |
|------|------|------|-----------|
| 1 | `users` | 用户表 | 10万+ |
| 2 | `user_profiles` | 用户档案表 | 10万+ |
| 3 | `products` | 商品表 | <100 |
| 4 | `product_variants` | 商品规格表 | <500 |
| 5 | `orders` | 订单表 | 5万+ |
| 6 | `order_items` | 订单项表 | 5万+ |
| 7 | `foot_videos` | 足部视频表 | 5万+ |
| 8 | `coupons` | 优惠券表 | <1000 |
| 9 | `user_coupons` | 用户优惠券表 | 10万+ |
| 10 | `addresses` | 收货地址表 | 20万+ |
| 11 | `referral_records` | 邀请记录表 | 5万+ |
| 12 | `support_sessions` | 客服会话表 | 5万+ |
| 13 | `support_messages` | 客服消息表 | 50万+ |
| 14 | `faqs` | 常见问题表 | <500 |
| 15 | `admin_users` | 管理员表 | <50 |
| 16 | `operation_logs` | 操作日志表 | 100万+ |

---

## 3. 用户域表

### 3.1 users (用户表)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar TEXT,
    phone VARCHAR(20),
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
    auth_provider_id VARCHAR(255),
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    tags TEXT[] DEFAULT '{}',
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(10) NOT NULL DEFAULT 'en',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referrer_id ON users(referrer_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 触发器：自动生成邀请码
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.referral_code := 'FOOTX-' || UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_referral_code();

-- 触发器：自动更新 updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 user_profiles (用户档案表)

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    shoe_size VARCHAR(10),
    shoe_size_type VARCHAR(10) CHECK (shoe_size_type IN ('us', 'eu', 'uk', 'cm')),
    sports_habits JSONB DEFAULT '{}',
    medical_history JSONB DEFAULT '{}',
    special_requests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 触发器
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. 产品域表

### 4.1 products (商品表)

```sql
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    type VARCHAR(20) NOT NULL CHECK (type IN ('sports', 'daily', 'medical')),
    description TEXT,
    original_price INTEGER NOT NULL DEFAULT 0,
    current_price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    images JSONB NOT NULL DEFAULT '[]',
    scenarios TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_is_published ON products(is_published);
CREATE INDEX idx_products_sort_order ON products(sort_order);

-- 触发器
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 product_variants (商品规格表)

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    value VARCHAR(100) NOT NULL,
    price_adjustment INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true
);

-- 索引
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
```

---

## 5. 订单域表

### 5.1 orders (订单表)

```sql
CREATE TYPE order_status AS ENUM (
    'pending',
    'video_review',
    'video_rejected',
    'modeling',
    'production',
    'shipped',
    'delivered',
    'completed',
    'cancelled',
    'refunding',
    'refunded'
);

CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status order_status NOT NULL DEFAULT 'pending',
    amounts JSONB NOT NULL DEFAULT '{
        "subtotal": 0,
        "shipping": 0,
        "discount": 0,
        "tax": 0,
        "total": 0
    }',
    shipping_address JSONB NOT NULL,
    coupon_id VARCHAR(50) REFERENCES coupons(id),
    referral_code_used VARCHAR(20),
    payment JSONB DEFAULT '{
        "method": null,
        "stripe_payment_intent_id": null,
        "paid_at": null
    }',
    shipping JSONB DEFAULT '{
        "carrier": null,
        "tracking_number": null,
        "shipped_at": null,
        "delivered_at": null
    }',
    notes TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_expires_at ON orders(expires_at) WHERE status = 'pending';
CREATE INDEX idx_orders_coupon_id ON orders(coupon_id);
CREATE INDEX idx_orders_referral_code ON orders(referral_code_used);

-- 触发器：自动生成订单号
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.id := 'ORDER-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text), 1, 6));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_order_id
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_id();

-- 触发器
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 order_items (订单项表)

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    product_image TEXT,
    variant JSONB,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal INTEGER NOT NULL
);

-- 索引
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### 5.3 foot_videos (足部视频表)

```sql
CREATE TYPE video_status AS ENUM (
    'uploading',
    'upload_failed',
    'pending_review',
    'reviewing',
    'approved',
    'rejected'
);

CREATE TYPE reject_reason AS ENUM (
    'lighting',
    'angle',
    'blur',
    'duration',
    'other'
);

CREATE TABLE foot_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status video_status NOT NULL DEFAULT 'uploading',
    storage JSONB NOT NULL DEFAULT '{}',
    review JSONB DEFAULT '{
        "result": null,
        "feedback": null,
        "reject_reason": null,
        "reviewer_id": null,
        "reviewed_at": null
    }',
    upload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_foot_videos_user_id ON foot_videos(user_id);
CREATE INDEX idx_foot_videos_status ON foot_videos(status);
CREATE INDEX idx_foot_videos_order_id ON foot_videos(order_id);

-- 触发器
CREATE TRIGGER trg_foot_videos_updated_at
    BEFORE UPDATE ON foot_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. 优惠券域表

### 6.1 coupons (优惠券表)

```sql
CREATE TABLE coupons (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
    value INTEGER NOT NULL,
    min_order_amount INTEGER NOT NULL DEFAULT 0,
    max_discount_amount INTEGER,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    total_quantity INTEGER,
    issued_count INTEGER NOT NULL DEFAULT 0,
    limit_per_user INTEGER NOT NULL DEFAULT 1,
    applicable_product_types TEXT[],
    source JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_period ON coupons(valid_from, valid_to);

-- 触发器：自动生成优惠券ID
CREATE OR REPLACE FUNCTION generate_coupon_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.id := 'COUPON-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_coupon_id
    BEFORE INSERT ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION generate_coupon_id();

-- 触发器
CREATE TRIGGER trg_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 6.2 user_coupons (用户优惠券表)

```sql
CREATE TABLE user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id VARCHAR(50) NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired', 'revoked')),
    used_at TIMESTAMPTZ,
    used_order_id VARCHAR(50) REFERENCES orders(id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, coupon_id)
);

-- 索引
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_user_coupons_expires_at ON user_coupons(expires_at) WHERE status = 'unused';
```

---

## 7. 地址域表

### 7.1 addresses (收货地址表)

```sql
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    detail TEXT NOT NULL,
    postal_code VARCHAR(20),
    is_default BOOLEAN NOT NULL DEFAULT false,
    label VARCHAR(20) CHECK (label IN ('home', 'work', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default) WHERE is_default = true;

-- 触发器：确保只有一个默认地址
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE addresses SET is_default = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_default_address
    BEFORE INSERT OR UPDATE ON addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_address();

-- 触发器
CREATE TRIGGER trg_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 8. 邀请域表

### 8.1 referral_records (邀请记录表)

```sql
CREATE TABLE referral_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,
    referral_link TEXT NOT NULL,
    click_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'converted')),
    registered_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    reward_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'issued', 'failed')),
    reward_coupon_id VARCHAR(50) REFERENCES coupons(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_referral_records_referrer_id ON referral_records(referrer_id);
CREATE INDEX idx_referral_records_referee_id ON referral_records(referee_id);
CREATE INDEX idx_referral_records_status ON referral_records(status);
CREATE INDEX idx_referral_records_reward_status ON referral_records(reward_status);
```

---

## 9. 客服域表

### 9.1 support_sessions (客服会话表)

```sql
CREATE TABLE support_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'transferred')),
    type VARCHAR(20) NOT NULL DEFAULT 'ai' CHECK (type IN ('ai', 'human', 'mixed')),
    order_id VARCHAR(50) REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    rating_tags TEXT[] DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_support_sessions_user_id ON support_sessions(user_id);
CREATE INDEX idx_support_sessions_status ON support_sessions(status);
CREATE INDEX idx_support_sessions_order_id ON support_sessions(order_id);
```

### 9.2 support_messages (客服消息表)

```sql
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai', 'human_agent', 'system')),
    sender_id UUID REFERENCES admin_users(id),
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'file', 'order_card', 'faq_card')),
    reply_to_id UUID REFERENCES support_messages(id),
    ai_metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_support_messages_session_id ON support_messages(session_id);
CREATE INDEX idx_support_messages_sent_at ON support_messages(sent_at);
CREATE INDEX idx_support_messages_is_read ON support_messages(session_id, is_read);
```

### 9.3 faqs (常见问题表)

```sql
CREATE TABLE faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    related_order_status TEXT[],
    click_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 索引
CREATE INDEX idx_faqs_category ON faqs(category);
CREATE INDEX idx_faqs_is_active ON faqs(is_active);
CREATE INDEX idx_faqs_keywords ON faqs USING GIN(keywords);
```

---

## 10. 后台管理域表

### 10.1 admin_users (管理员表)

```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'reviewer', 'customer_service', 'operator')),
    permissions TEXT[] DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_status ON admin_users(status);
```

### 10.2 operation_logs (操作日志表)

```sql
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES admin_users(id),
    operator_name VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('order', 'user', 'coupon', 'video', 'system')),
    target_id VARCHAR(50) NOT NULL,
    before_data JSONB,
    after_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_operation_logs_operator_id ON operation_logs(operator_id);
CREATE INDEX idx_operation_logs_target ON operation_logs(target_type, target_id);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at DESC);
```

---

## 11. 通用函数

```sql
-- 更新 updated_at 列的通用函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 12. 分区和归档策略

### 12.1 订单表分区 (按时间)

```sql
-- 按月分区（未来根据数据量实施）
CREATE TABLE orders_2026_03 PARTITION OF orders
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

### 12.2 操作日志归档

```sql
-- 超过 90 天的日志归档到历史表
CREATE TABLE operation_logs_archive (LIKE operation_logs INCLUDING ALL);
```

---

## 13. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-29 | 初始版本 | 技术团队 |
