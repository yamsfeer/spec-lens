# Foot X 数据架构

**文档版本**: v1.0
**最后更新**: 2026-03-30
**状态**: 已确定

---

## 1. 数据架构概述

### 1.1 数据存储策略

Foot X 采用分层数据存储策略，根据数据特性和访问模式选择合适的存储方案：

| 数据类型 | 存储方案 | 说明 |
|---------|---------|------|
| **结构化业务数据** | PostgreSQL | 用户、订单、商品等关系型数据 |
| **文件/媒体** | Supabase Storage | 视频、图片等二进制文件 |
| **缓存/会话** | Redis (可选) | 验证码、临时令牌、会话缓存 |
| **日志/分析** | PostgreSQL | 操作日志、埋点数据 |

### 1.2 数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据源层                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  用户输入   │  │  系统生成   │  │  外部服务   │  │      定时任务       │ │
│  │             │  │             │  │             │  │                     │ │
│  │ • 注册信息  │  │ • 订单号    │  │ • Stripe    │  │ • 订单过期检查      │ │
│  │ • 视频上传  │  │ • 时间戳    │  │ • 邮件回调  │  │ • 优惠券过期        │ │
│  │ • 地址信息  │  │ • 状态变更  │  │ • 物流更新  │  │ • 统计报表          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据处理层                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Edge Functions (API 层)                       │    │
│  │                                                                      │    │
│  │  • 参数验证    • 业务规则    • 权限检查    • 数据转换                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据存储层                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        PostgreSQL                                   │    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │    │
│  │  │   OLTP      │  │   事务      │  │         RLS                 │  │    │
│  │  │  业务表     │  │  完整性     │  │      行级安全               │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Supabase Storage                                │    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │    │
│  │  │   视频文件   │  │   图片文件  │  │      预签名 URL            │  │    │
│  │  │  buckets    │  │  (avatars)  │  │      访问控制               │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据库设计

### 2.1 实体关系图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │────<│   UserCoupon    │>────│     Coupon      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ email           │     │ userId (FK)     │     │ code            │
│ referralCode    │────<│ couponId (FK)   │     │ type            │
│ referrerId (FK) │     │ status          │     │ value           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Address     │     │      Order      │────<│    FootVideo    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ userId (FK)     │     │ userId (FK)     │     │ orderId (FK)    │
│ recipientName   │     │ status          │     │ status          │
│ detail          │     │ couponId (FK)   │>────│ review.result   │
└─────────────────┘     │ shippingAddress │     └─────────────────┘
                        │ payment         │
                        └─────────────────┘
                               │
                               │ N:M
                               ▼
                        ┌─────────────────┐
                        │   OrderItem     │
                        ├─────────────────┤
                        │ id (PK)         │
                        │ orderId (FK)    │
                        │ productId (FK)  │>────┐
                        └─────────────────┘     │
                                                │
                        ┌─────────────────┐     │
                        │     Product     │<────┘
                        ├─────────────────┤
                        │ id (PK)         │
                        │ name            │
                        │ type            │
                        │ currentPrice    │
                        └─────────────────┘
```

### 2.2 表结构详述

#### 用户域

**users 表**
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
```

**user_profiles 表**
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
```

#### 订单域

**orders 表**
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

-- 自动生成订单号触发器
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
```

**foot_videos 表**
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
```

#### 优惠券域

**coupons 表**
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
```

**user_coupons 表**
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
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_user_coupons_expires_at ON user_coupons(expires_at) WHERE status = 'unused';
```

### 2.3 触发器汇总

```sql
-- 更新时间戳通用函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表添加更新时间戳触发器
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_foot_videos_updated_at
    BEFORE UPDATE ON foot_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 自动生成邀请码
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.referral_code := 'FOOTX-' || UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
```

---

## 3. 存储设计

### 3.1 Storage Bucket 结构

```
Supabase Storage
│
├── foot-videos/               # 足部视频存储
│   ├── {user_id}/            # 按用户分目录
│   │   ├── {video_id}/
│   │   │   └── original.webm
│   │   └── ...
│   └── ...
│
├── product-images/            # 商品图片
│   ├── products/
│   │   ├── {product_id}-1.jpg
│   │   ├── {product_id}-2.jpg
│   │   └── ...
│   └── thumbnails/
│       └── ...
│
└── user-avatars/              # 用户头像
    ├── {user_id}.jpg
    └── default.png
```

### 3.2 存储访问控制

```sql
-- 视频存储 RLS 策略
CREATE POLICY "Users can upload own videos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'foot-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own videos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'foot-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 公开访问商品图片
CREATE POLICY "Product images are public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');
```

---

## 4. 数据安全

### 4.1 Row Level Security (RLS)

```sql
-- 订单表 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的订单
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能创建自己的订单
CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新 pending 状态的订单
CREATE POLICY "Users can update own pending orders" ON orders
  FOR UPDATE USING (
    auth.uid() = user_id AND
    status = 'pending'
  );

-- 地址表 RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id);

-- 优惠券表（用户领取记录）
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupons" ON user_coupons
  FOR SELECT USING (auth.uid() = user_id);
```

### 4.2 数据加密

| 层级 | 加密方式 |
|------|---------|
| 传输层 | TLS 1.3 |
| 存储层 | AES-256 |
| 敏感字段 | 应用层加密（如需要） |

---

## 5. 备份与恢复

### 5.1 备份策略

| 备份类型 | 频率 | 保留周期 |
|---------|------|---------|
| 自动快照 | 每日 | 7天 |
| 手动备份 | 按需 | 永久 |
| 导出 (CSV) | 每月 | 永久 |

### 5.2 Point-in-Time Recovery

Supabase 支持 PITR（时间点恢复），可以恢复到过去任意时刻的数据状态。

---

## 6. 相关文档

- [overview.md](./overview.md) - 架构总览
- [frontend.md](./frontend.md) - 前端架构
- [backend.md](./backend.md) - 后端架构
- [../database-schema.md](../database-schema.md) - 完整数据库设计
- [../data-entities.md](../data-entities.md) - 数据实体定义

---

## 7. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本 | 技术团队 |
