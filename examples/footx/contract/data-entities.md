# Foot X 数据实体定义

**版本**: v1.0
**日期**: 2026-03-29
**对应 PRD**: v1.0

---

## 1. 概述

本文档定义 Foot X 系统的核心数据实体及其关系。所有实体基于 PRD 和状态机设计文档抽取，作为前后端开发的数据契约基础。

---

## 2. 用户域 (User Domain)

### 2.1 User (用户)

```typescript
interface User {
  /** 用户唯一标识 (UUID) */
  id: string;

  /** 邮箱地址 (唯一) */
  email: string;

  /** 用户昵称 */
  nickname: string | null;

  /** 头像 URL */
  avatar: string | null;

  /** 手机号 (国际格式) */
  phone: string | null;

  /** 认证提供商 */
  authProvider: 'email' | 'google';

  /** 认证提供商用户ID */
  authProviderId: string | null;

  /** 邀请码 (自动生成) */
  referralCode: string;

  /** 推荐人用户ID */
  referrerId: string | null;

  /** 账户状态 */
  status: 'active' | 'inactive' | 'suspended' | 'deleted';

  /** 用户标签 */
  tags: string[];

  /** 流量来源 */
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;

  /** 时区 */
  timezone: string;

  /** 语言偏好 */
  locale: string;

  /** 最后登录时间 */
  lastLoginAt: Date | null;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 注销时间 (软删除标记) */
  deletedAt: Date | null;
}
```

### 2.2 UserProfile (用户档案)

```typescript
interface UserProfile {
  /** 用户ID (主键) */
  userId: string;

  /** 鞋码 */
  shoeSize: string | null;

  /** 鞋码类型 */
  shoeSizeType: 'us' | 'eu' | 'uk' | 'cm' | null;

  /** 运动习惯 */
  sportsHabits: {
    /** 主要运动类型 */
    primarySport: string | null;
    /** 运动频率 (次/周) */
    frequency: number | null;
    /** 平均时长 (分钟) */
    duration: number | null;
  };

  /** 既往伤病信息 */
  medicalHistory: {
    /** 是否有足部问题 */
    hasFootIssues: boolean;
    /** 具体问题描述 */
    issues: string[];
    /** 其他备注 */
    notes: string | null;
  };

  /** 特殊需求备注 */
  specialRequests: string | null;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}
```

---

## 3. 产品域 (Product Domain)

### 3.1 Product (商品)

```typescript
interface Product {
  /** 商品唯一标识 (SKU) */
  id: string;

  /** 商品名称 */
  name: string;

  /** 商品副标题 */
  subtitle: string | null;

  /** 商品类型 */
  type: 'sports' | 'daily' | 'medical';

  /** 商品描述 (Markdown) */
  description: string;

  /** 原价 (分) */
  originalPrice: number;

  /** 现价 (分) */
  currentPrice: number;

  /** 货币 */
  currency: string;

  /** 商品图片 */
  images: {
    url: string;
    alt: string;
    sortOrder: number;
  }[];

  /** 适用场景标签 */
  scenarios: string[];

  /** 功能特性 */
  features: string[];

  /** 是否上架 */
  isPublished: boolean;

  /** 排序权重 */
  sortOrder: number;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}
```

### 3.2 ProductVariant (商品规格)

```typescript
interface ProductVariant {
  /** 规格ID */
  id: string;

  /** 商品ID */
  productId: string;

  /** 规格名称 */
  name: string;

  /** 规格值 */
  value: string;

  /** 价格调整 (分) */
  priceAdjustment: number;

  /** 库存数量 */
  stock: number;

  /** 是否可用 */
  isAvailable: boolean;
}
```

---

## 4. 订单域 (Order Domain)

### 4.1 Order (订单)

```typescript
interface Order {
  /** 订单唯一标识 (ORDER-XXXXXXXX) */
  id: string;

  /** 用户ID */
  userId: string;

  /** 订单状态 */
  status: OrderStatus;

  /** 商品信息 */
  items: OrderItem[];

  /** 订单金额 */
  amounts: {
    /** 商品总额 */
    subtotal: number;
    /** 运费 */
    shipping: number;
    /** 折扣金额 */
    discount: number;
    /** 税费 */
    tax: number;
    /** 应付总额 */
    total: number;
  };

  /** 收货地址快照 */
  shippingAddress: AddressSnapshot;

  /** 使用的优惠券ID */
  couponId: string | null;

  /** 邀请码 (下单时填写) */
  referralCodeUsed: string | null;

  /** 支付信息 */
  payment: {
    /** 支付方式 */
    method: 'stripe' | null;
    /** Stripe Payment Intent ID */
    stripePaymentIntentId: string | null;
    /** 支付时间 */
    paidAt: Date | null;
  };

  /** 物流信息 */
  shipping: {
    /** 物流公司 */
    carrier: string | null;
    /** 物流单号 */
    trackingNumber: string | null;
    /** 发货时间 */
    shippedAt: Date | null;
    /** 送达时间 */
    deliveredAt: Date | null;
  };

  /** 订单备注 */
  notes: string | null;

  /** 过期时间 (未支付订单) */
  expiresAt: Date | null;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 完成时间 */
  completedAt: Date | null;
}

type OrderStatus =
  | 'pending'           // 待支付
  | 'video_review'      // 视频审核中
  | 'video_rejected'    // 视频审核不通过
  | 'modeling'          // 建模中
  | 'production'        // 生产中
  | 'shipped'           // 已发货
  | 'delivered'         // 已送达
  | 'completed'         // 已完成
  | 'cancelled'         // 已取消
  | 'refunding'         // 退款中
  | 'refunded';         // 已退款
```

### 4.2 OrderItem (订单项)

```typescript
interface OrderItem {
  /** 订单项ID */
  id: string;

  /** 商品ID */
  productId: string;

  /** 商品名称 (快照) */
  productName: string;

  /** 商品图片 (快照) */
  productImage: string;

  /** 规格信息 */
  variant: {
    name: string;
    value: string;
  } | null;

  /** 单价 (分) */
  unitPrice: number;

  /** 数量 */
  quantity: number;

  /** 小计 (分) */
  subtotal: number;
}
```

### 4.3 FootVideo (足部视频)

```typescript
interface FootVideo {
  /** 视频ID */
  id: string;

  /** 订单ID */
  orderId: string;

  /** 用户ID */
  userId: string;

  /** 视频状态 */
  status: VideoStatus;

  /** 存储信息 */
  storage: {
    /** 原始视频URL */
    originalUrl: string;
    /** 压缩视频URL */
    compressedUrl: string | null;
    /** 文件大小 (字节) */
    fileSize: number;
    /** 视频时长 (秒) */
    duration: number;
    /** 分辨率 */
    resolution: string;
  };

  /** 审核信息 */
  review: {
    /** 审核结果 */
    result: 'pending' | 'approved' | 'rejected' | null;
    /** 审核意见 */
    feedback: string | null;
    /** 拒绝原因分类 */
    rejectReason: 'lighting' | 'angle' | 'blur' | 'duration' | 'other' | null;
    /** 审核人ID */
    reviewerId: string | null;
    /** 审核时间 */
    reviewedAt: Date | null;
  };

  /** 上传信息 */
  upload: {
    /** 上传方式 */
    method: 'camera' | 'file';
    /** 上传进度 (0-100) */
    progress: number;
    /** 是否断点续传 */
    isResumed: boolean;
  };

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

type VideoStatus =
  | 'uploading'     // 上传中
  | 'upload_failed' // 上传失败
  | 'pending_review'// 等待审核
  | 'reviewing'     // 审核中
  | 'approved'      // 审核通过
  | 'rejected';     // 审核不通过
```

---

## 5. 优惠券域 (Coupon Domain)

### 5.1 Coupon (优惠券)

```typescript
interface Coupon {
  /** 优惠券唯一标识 (COUPON-XXXXXXXX) */
  id: string;

  /** 优惠券码 */
  code: string;

  /** 优惠券类型 */
  type: 'percentage' | 'fixed_amount';

  /** 优惠值 */
  value: number;

  /** 使用门槛 (满多少可用，0表示无门槛) */
  minOrderAmount: number;

  /** 最高优惠金额 (百分比券适用) */
  maxDiscountAmount: number | null;

  /** 有效期开始 */
  validFrom: Date;

  /** 有效期结束 */
  validTo: Date;

  /** 发放总量 (null表示不限) */
  totalQuantity: number | null;

  /** 已发放数量 */
  issuedCount: number;

  /** 每人限领数量 */
  limitPerUser: number;

  /** 适用商品类型 */
  applicableProductTypes: string[] | null;

  /** 优惠券来源 */
  source: {
    type: 'manual' | 'referral' | 'first_order' | 'promotion';
    /** 关联活动ID */
    campaignId: string | null;
  };

  /** 是否启用 */
  isActive: boolean;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}
```

### 5.2 UserCoupon (用户优惠券)

```typescript
interface UserCoupon {
  /** 记录ID */
  id: string;

  /** 用户ID */
  userId: string;

  /** 优惠券ID */
  couponId: string;

  /** 状态 */
  status: 'unused' | 'used' | 'expired' | 'revoked';

  /** 使用时间 */
  usedAt: Date | null;

  /** 使用订单ID */
  usedOrderId: string | null;

  /** 发放时间 */
  issuedAt: Date;

  /** 过期时间 */
  expiresAt: Date;
}
```

---

## 6. 地址域 (Address Domain)

### 6.1 Address (收货地址)

```typescript
interface Address {
  /** 地址唯一标识 */
  id: string;

  /** 用户ID */
  userId: string;

  /** 收件人姓名 */
  recipientName: string;

  /** 收件人电话 */
  recipientPhone: string;

  /** 国家 */
  country: string;

  /** 省份/州 */
  province: string;

  /** 城市 */
  city: string;

  /** 区/县 */
  district: string | null;

  /** 详细地址 */
  detail: string;

  /** 邮编 */
  postalCode: string;

  /** 是否默认地址 */
  isDefault: boolean;

  /** 地址标签 (家/公司/其他) */
  label: 'home' | 'work' | 'other' | null;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/** 地址快照 (用于订单) */
interface AddressSnapshot {
  recipientName: string;
  recipientPhone: string;
  country: string;
  province: string;
  city: string;
  district: string | null;
  detail: string;
  postalCode: string;
}
```

---

## 7. 邀请域 (Referral Domain)

### 7.1 ReferralRecord (邀请记录)

```typescript
interface ReferralRecord {
  /** 记录ID */
  id: string;

  /** 邀请人用户ID */
  referrerId: string;

  /** 被邀请人用户ID */
  refereeId: string;

  /** 邀请码 */
  referralCode: string;

  /** 邀请链接 */
  referralLink: string;

  /** 点击次数 */
  clickCount: number;

  /** 状态 */
  status: 'pending' | 'registered' | 'converted';

  /** 注册时间 */
  registeredAt: Date | null;

  /** 转化时间 (首单支付成功) */
  convertedAt: Date | null;

  /** 奖励发放状态 */
  rewardStatus: 'pending' | 'issued' | 'failed';

  /** 奖励优惠券ID */
  rewardCouponId: string | null;

  /** 创建时间 */
  createdAt: Date;
}
```

---

## 8. 客服域 (Support Domain)

### 8.1 SupportSession (客服会话)

```typescript
interface SupportSession {
  /** 会话ID */
  id: string;

  /** 用户ID */
  userId: string;

  /** 会话状态 */
  status: 'active' | 'closed' | 'transferred';

  /** 会话类型 */
  type: 'ai' | 'human' | 'mixed';

  /** 关联订单ID */
  orderId: string | null;

  /** 满意度评分 */
  rating: number | null;

  /** 评价标签 */
  ratingTags: string[];

  /** 开始时间 */
  startedAt: Date;

  /** 结束时间 */
  endedAt: Date | null;

  /** 最后活动时间 */
  lastActivityAt: Date;
}
```

### 8.2 SupportMessage (客服消息)

```typescript
interface SupportMessage {
  /** 消息ID */
  id: string;

  /** 会话ID */
  sessionId: string;

  /** 发送者类型 */
  senderType: 'user' | 'ai' | 'human_agent' | 'system';

  /** 发送者ID (人工客服ID) */
  senderId: string | null;

  /** 消息内容 */
  content: string;

  /** 消息类型 */
  contentType: 'text' | 'image' | 'video' | 'file' | 'order_card' | 'faq_card';

  /** 引用消息ID */
  replyToId: string | null;

  /** AI 相关元数据 */
  aiMetadata: {
    /** 匹配的问题ID */
    matchedQuestionId: string | null;
    /** 置信度 */
    confidence: number | null;
    /** 是否触发转人工 */
    triggeredHuman: boolean;
  } | null;

  /** 是否已读 */
  isRead: boolean;

  /** 发送时间 */
  sentAt: Date;
}
```

### 8.3 FAQ (常见问题)

```typescript
interface FAQ {
  /** 问题ID */
  id: string;

  /** 问题分类 */
  category: string;

  /** 问题 */
  question: string;

  /** 答案 */
  answer: string;

  /** 关键词 */
  keywords: string[];

  /** 关联订单状态 */
  relatedOrderStatuses: OrderStatus[] | null;

  /** 点击次数 */
  clickCount: number;

  /** 是否启用 */
  isActive: boolean;

  /** 排序权重 */
  sortOrder: number;
}
```

---

## 9. 后台管理域 (Admin Domain)

### 9.1 AdminUser (管理员)

```typescript
interface AdminUser {
  /** 管理员ID */
  id: string;

  /** 用户名 */
  username: string;

  /** 邮箱 */
  email: string;

  /** 角色 */
  role: 'super_admin' | 'admin' | 'reviewer' | 'customer_service' | 'operator';

  /** 权限列表 */
  permissions: string[];

  /** 最后登录时间 */
  lastLoginAt: Date | null;

  /** 账户状态 */
  status: 'active' | 'inactive';

  /** 创建时间 */
  createdAt: Date;
}
```

### 9.2 OperationLog (操作日志)

```typescript
interface OperationLog {
  /** 日志ID */
  id: string;

  /** 操作人ID */
  operatorId: string;

  /** 操作人姓名 */
  operatorName: string;

  /** 操作类型 */
  action: string;

  /** 操作对象类型 */
  targetType: 'order' | 'user' | 'coupon' | 'video' | 'system';

  /** 操作对象ID */
  targetId: string;

  /** 操作前数据 */
  beforeData: Record<string, any> | null;

  /** 操作后数据 */
  afterData: Record<string, any> | null;

  /** IP地址 */
  ipAddress: string;

  /** 用户代理 */
  userAgent: string;

  /** 操作时间 */
  createdAt: Date;
}
```

---

## 10. 实体关系图 (ERD)

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

---

## 11. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-29 | 初始版本 | 技术团队 |
