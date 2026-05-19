# Foot X API 接口契约文档

**版本**: v1.0
**日期**: 2026-03-29
**协议**: RESTful API + JSON
**认证**: Bearer Token (JWT)

---

## 1. 概述

本文档定义 Foot X 系统前后端交互的 RESTful API 接口契约。所有接口基于 PRD 和状态机设计实现。

### 1.1 通用约定

| 项目 | 约定 |
|------|------|
| Base URL | `/api/v1` |
| Content-Type | `application/json` |
| 认证方式 | `Authorization: Bearer <JWT_TOKEN>` |
| 时间格式 | ISO 8601 (`2026-03-29T10:30:00Z`) |
| 货币单位 | 分 (USD cents) |
| 分页参数 | `page`, `pageSize` |

### 1.2 通用响应格式

```typescript
// 成功响应
interface ApiResponse<T> {
  code: 0;
  data: T;
  message: string;
}

// 错误响应
interface ApiError {
  code: number;      // 业务错误码
  message: string;   // 错误信息
  details?: any;     // 详细错误信息
}

// 分页响应
interface PaginatedResponse<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### 1.3 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 业务逻辑错误 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 2. 认证模块

### 2.1 发送验证码

```http
POST /auth/verification-code
```

**请求参数:**

```typescript
{
  email: string;        // 邮箱地址
  purpose: 'login' | 'register' | 'reset_password';
}
```

**响应:**

```typescript
{
  expiresIn: number;    // 验证码有效期（秒）
}
```

### 2.2 邮箱登录/注册

```http
POST /auth/login/email
```

**请求参数:**

```typescript
{
  email: string;
  code: string;         // 6位验证码
  referralCode?: string; // 邀请码（可选）
}
```

**响应:**

```typescript
{
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  isNewUser: boolean;
  referralReward?: {     // 邀请奖励（如有）
    coupon: Coupon;
    message: string;
  };
}
```

### 2.3 Google OAuth 登录

```http
POST /auth/login/google
```

**请求参数:**

```typescript
{
  idToken: string;      // Google ID Token
  referralCode?: string;
}
```

**响应:** 同邮箱登录

### 2.4 刷新 Token

```http
POST /auth/refresh
```

**请求参数:**

```typescript
{
  refreshToken: string;
}
```

**响应:**

```typescript
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### 2.5 登出

```http
POST /auth/logout
```

**请求头:** `Authorization: Bearer <token>`

---

## 3. 用户模块

### 3.1 获取当前用户信息

```http
GET /users/me
```

**响应:**

```typescript
{
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  referralCode: string;
  stats: {
    orderCount: number;
    couponCount: number;
    referralCount: number;
  };
}
```

### 3.2 更新用户信息

```http
PATCH /users/me
```

**请求参数:**

```typescript
{
  nickname?: string;
  avatar?: string;      // 图片URL
  phone?: string;
}
```

### 3.3 获取用户档案

```http
GET /users/me/profile
```

**响应:**

```typescript
{
  shoeSize: string | null;
  shoeSizeType: string | null;
  sportsHabits: {
    primarySport: string | null;
    frequency: number | null;
    duration: number | null;
  };
  medicalHistory: {
    hasFootIssues: boolean;
    issues: string[];
    notes: string | null;
  };
  specialRequests: string | null;
}
```

### 3.4 更新用户档案

```http
PUT /users/me/profile
```

**请求参数:**

```typescript
{
  shoeSize?: string;
  shoeSizeType?: 'us' | 'eu' | 'uk' | 'cm';
  sportsHabits?: {
    primarySport?: string;
    frequency?: number;
    duration?: number;
  };
  medicalHistory?: {
    hasFootIssues?: boolean;
    issues?: string[];
    notes?: string;
  };
  specialRequests?: string;
}
```

### 3.5 获取邀请统计

```http
GET /users/me/referral-stats
```

**响应:**

```typescript
{
  referralCode: string;
  referralLink: string;
  clickCount: number;
  successfulInvites: number;
  earnedCoupons: Coupon[];
  pendingRewards: number;
}
```

---

## 4. 商品模块

### 4.1 获取商品列表

```http
GET /products
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 类型筛选: `sports`, `daily`, `medical` |
| page | number | 页码，默认1 |
| pageSize | number | 每页数量，默认20 |

**响应:** `PaginatedResponse<Product>`

### 4.2 获取商品详情

```http
GET /products/:id
```

**响应:**

```typescript
{
  id: string;
  name: string;
  subtitle: string | null;
  type: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  currency: string;
  images: {
    url: string;
    alt: string;
    sortOrder: number;
  }[];
  scenarios: string[];
  features: string[];
  variants: ProductVariant[];
}
```

---

## 5. 订单模块

### 5.1 创建订单

```http
POST /orders
```

**请求参数:**

```typescript
{
  productId: string;
  variantId?: string;
  quantity?: number;    // 默认1
}
```

**响应:**

```typescript
{
  id: string;
  status: 'pending';
  amounts: {
    subtotal: number;
    shipping: number;
    discount: number;
    tax: number;
    total: number;
  };
  expiresAt: string;    // ISO 8601
}
```

### 5.2 获取订单列表

```http
GET /orders
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应:** `PaginatedResponse<Order>`

### 5.3 获取订单详情

```http
GET /orders/:id
```

**响应:**

```typescript
{
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  amounts: {
    subtotal: number;
    shipping: number;
    discount: number;
    tax: number;
    total: number;
  };
  shippingAddress: AddressSnapshot | null;
  coupon: Coupon | null;
  payment: {
    method: string | null;
    paidAt: string | null;
  };
  shipping: {
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  video: FootVideo | null;
  progress: {
    currentStep: number;
    totalSteps: number;
    steps: {
      status: OrderStatus;
      label: string;
      description: string;
      completedAt: string | null;
    }[];
  };
  createdAt: string;
  expiresAt: string | null;
}
```

### 5.4 更新订单 (提交订单信息)

```http
PATCH /orders/:id
```

**请求参数:**

```typescript
{
  addressId?: string;
  couponId?: string;
  referralCode?: string;
  notes?: string;
}
```

### 5.5 取消订单

```http
POST /orders/:id/cancel
```

**请求参数:**

```typescript
{
  reason?: string;
}
```

### 5.6 申请退款

```http
POST /orders/:id/refund
```

**请求参数:**

```typescript
{
  reason: string;
  description?: string;
}
```

---

## 6. 支付模块

### 6.1 创建 Stripe Checkout Session

```http
POST /payments/stripe/session
```

**请求参数:**

```typescript
{
  orderId: string;
  successUrl: string;   // 支付成功回调URL
  cancelUrl: string;    // 支付取消回调URL
}
```

**响应:**

```typescript
{
  sessionId: string;
  url: string;          // Stripe Checkout URL
}
```

### 6.2 查询支付状态

```http
GET /payments/status/:orderId
```

**响应:**

```typescript
{
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  paidAt: string | null;
  failureMessage: string | null;
}
```

---

## 7. 视频模块

### 7.1 获取上传凭证

```http
POST /videos/upload-token
```

**请求参数:**

```typescript
{
  orderId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}
```

**响应:**

```typescript
{
  videoId: string;
  uploadUrl: string;    // 直传URL (S3/OSS)
  headers: Record<string, string>;
  expiresIn: number;
}
```

### 7.2 确认上传完成

```http
POST /videos/:id/confirm-upload
```

**请求参数:**

```typescript
{
  storageKey: string;
  fileSize: number;
  duration: number;
  resolution: string;
}
```

### 7.3 获取视频状态

```http
GET /videos/:id/status
```

**响应:**

```typescript
{
  id: string;
  status: VideoStatus;
  progress: number;     // 上传进度 0-100
  review: {
    result: 'pending' | 'approved' | 'rejected' | null;
    feedback: string | null;
    rejectReason: string | null;
  };
}
```

### 7.4 重新上传视频

```http
POST /videos/:id/reupload
```

**说明:** 视频审核不通过时，重新获取上传凭证

---

## 8. 优惠券模块

### 8.1 获取我的优惠券

```http
GET /coupons
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | `unused`, `used`, `expired` |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应:** `PaginatedResponse<UserCoupon>`

### 8.2 领取优惠券

```http
POST /coupons/claim
```

**请求参数:**

```typescript
{
  code: string;
}
```

### 8.3 获取可用优惠券

```http
GET /coupons/available
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| orderAmount | number | 订单金额（用于筛选门槛） |

**响应:**

```typescript
{
  coupons: UserCoupon[];
  bestChoice: UserCoupon | null;  // 最优优惠券推荐
}
```

### 8.4 验证邀请码

```http
GET /coupons/validate-referral
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 邀请码 |

**响应:**

```typescript
{
  valid: boolean;
  referrer?: {
    nickname: string;
  };
  message?: string;     // 无效时返回原因
}
```

---

## 9. 地址模块

### 9.1 获取地址列表

```http
GET /addresses
```

**响应:** `Address[]`

### 9.2 获取单个地址

```http
GET /addresses/:id
```

### 9.3 创建地址

```http
POST /addresses
```

**请求参数:**

```typescript
{
  recipientName: string;
  recipientPhone: string;
  country: string;
  province: string;
  city: string;
  district?: string;
  detail: string;
  postalCode?: string;
  isDefault?: boolean;
  label?: 'home' | 'work' | 'other';
}
```

### 9.4 更新地址

```http
PATCH /addresses/:id
```

**请求参数:** 同创建地址

### 9.5 删除地址

```http
DELETE /addresses/:id
```

### 9.6 设置默认地址

```http
POST /addresses/:id/set-default
```

---

## 10. 客服模块

### 10.1 获取 FAQ 列表

```http
GET /support/faqs
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 分类筛选 |
| keyword | string | 关键词搜索 |

**响应:**

```typescript
{
  categories: string[];
  faqs: {
    id: string;
    category: string;
    question: string;
    answer: string;
  }[];
}
```

### 10.2 创建客服会话

```http
POST /support/sessions
```

**请求参数:**

```typescript
{
  orderId?: string;     // 关联订单ID
}
```

**响应:**

```typescript
{
  sessionId: string;
  greeting: string;
}
```

### 10.3 发送消息

```http
POST /support/sessions/:id/messages
```

**请求参数:**

```typescript
{
  content: string;
  contentType?: 'text' | 'image';
  replyToId?: string;
}
```

**响应:**

```typescript
{
  messageId: string;
  aiResponse?: {
    messageId: string;
    content: string;
    confidence: number;
    suggestedFaqs?: string[];
    humanOffered: boolean;
  };
}
```

### 10.4 获取会话消息

```http
GET /support/sessions/:id/messages
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| before | string | 消息ID，获取此前的消息 |
| limit | number | 返回数量 |

**响应:**

```typescript
{
  messages: SupportMessage[];
  hasMore: boolean;
}
```

### 10.5 转人工客服

```http
POST /support/sessions/:id/transfer-to-human
```

**响应:**

```typescript
{
  queuePosition: number;
  estimatedWaitTime: number;  // 预估等待时间（分钟）
}
```

### 10.6 评价会话

```http
POST /support/sessions/:id/rate
```

**请求参数:**

```typescript
{
  rating: number;       // 1-5
  tags?: string[];
  comment?: string;
}
```

---

## 11. Webhook 接口 (供外部服务调用)

### 11.1 Stripe Webhook

```http
POST /webhooks/stripe
```

**说明:** 处理 Stripe 支付状态变更

### 11.2 物流状态更新 Webhook

```http
POST /webhooks/shipping
```

**请求头:** `X-Shipping-Provider: <provider>`

---

## 12. 错误码定义

### 12.1 通用错误码 (1xxx)

| 错误码 | 说明 |
|--------|------|
| 1000 | 系统错误 |
| 1001 | 参数错误 |
| 1002 | 未授权 |
| 1003 | 禁止访问 |
| 1004 | 资源不存在 |
| 1005 | 请求过于频繁 |
| 1006 | 服务暂时不可用 |

### 12.2 认证错误码 (2xxx)

| 错误码 | 说明 |
|--------|------|
| 2000 | 验证码错误 |
| 2001 | 验证码已过期 |
| 2002 | 邮箱已被注册 |
| 2003 | 账户被禁用 |
| 2004 | Token 无效 |
| 2005 | Token 已过期 |

### 12.3 订单错误码 (3xxx)

| 错误码 | 说明 |
|--------|------|
| 3000 | 订单不存在 |
| 3001 | 订单状态不允许此操作 |
| 3002 | 订单已过期 |
| 3003 | 商品已下架 |
| 3004 | 库存不足 |

### 12.4 支付错误码 (4xxx)

| 错误码 | 说明 |
|--------|------|
| 4000 | 支付失败 |
| 4001 | 支付方式不支持 |
| 4002 | 订单金额不匹配 |
| 4003 | 订单已支付 |

### 12.5 优惠券错误码 (5xxx)

| 错误码 | 说明 |
|--------|------|
| 5000 | 优惠券不存在 |
| 5001 | 优惠券已过期 |
| 5002 | 优惠券已使用 |
| 5003 | 不满足使用门槛 |
| 5004 | 邀请码无效 |
| 5005 | 邀请码已使用 |

### 12.6 视频错误码 (6xxx)

| 错误码 | 说明 |
|--------|------|
| 6000 | 视频文件过大 |
| 6001 | 视频格式不支持 |
| 6002 | 视频时长不符合要求 |
| 6003 | 上传凭证已过期 |

---

## 13. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-29 | 初始版本 | 技术团队 |
