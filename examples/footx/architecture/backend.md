# Foot X 后端架构

**文档版本**: v1.0
**最后更新**: 2026-03-30
**状态**: 已确定

---

## 1. 后端架构概述

### 1.1 架构定位

Foot X 采用 **Serverless 架构**，基于 Supabase 平台构建，无传统服务器运维负担。

```
传统架构 vs Foot X 架构

传统架构:                    Foot X Serverless:
┌─────────────┐              ┌─────────────┐
│   Nginx     │              │  Vercel Edge │
│   (反向代理) │              │  (API 网关)  │
└──────┬──────┘              └──────┬──────┘
       │                            │
┌──────▼──────┐              ┌──────▼──────┐
│  Express    │              │  Supabase   │
│  (Node.js)  │              │  Edge Func  │
│  常驻进程   │   ========>  │  按需运行    │
└──────┬──────┘              └──────┬──────┘
       │                            │
┌──────▼──────┐              ┌──────▼──────┐
│  PostgreSQL │              │  PostgreSQL │
│  (自建)     │              │  (托管)     │
└─────────────┘              └─────────────┘
```

### 1.2 核心组件

| 组件 | 服务 | 职责 |
|------|------|------|
| **API 网关** | Vercel Edge | 路由、缓存、限流、CORS |
| **业务逻辑** | Supabase Edge Functions | API 处理、业务规则 |
| **数据库** | Supabase PostgreSQL | 数据持久化、事务 |
| **认证** | Supabase Auth | 用户认证、会话管理 |
| **存储** | Supabase Storage | 文件上传、静态资源 |
| **实时** | Supabase Realtime | 数据库变更推送 |

---

## 2. Edge Functions 架构

### 2.1 单体架构设计

起步阶段采用单体架构，所有 API 路由集中在一个 Edge Function 中。

```
supabase/functions/
├── api/                           # 单体 API 函数
│   ├── index.ts                   # 入口：路由分发
│   ├── routes/
│   │   ├── auth.ts                # 认证路由
│   │   ├── orders.ts              # 订单路由
│   │   ├── videos.ts              # 视频路由
│   │   ├── payments.ts            # 支付路由
│   │   ├── coupons.ts             # 优惠券路由
│   │   ├── addresses.ts           # 地址路由
│   │   └── support.ts             # 客服路由
│   ├── middleware/
│   │   ├── auth.ts                # JWT 验证中间件
│   │   ├── cors.ts                # CORS 处理
│   │   ├── errorHandler.ts        # 错误处理
│   │   └── logger.ts              # 请求日志
│   ├── utils/
│   │   ├── response.ts            # 响应工具
│   │   ├── validation.ts          # 参数验证
│   │   ├── stripe.ts              # Stripe 客户端
│   │   └── email.ts               # 邮件发送
│   ├── types/
│   │   ├── api.ts                 # API 类型
│   │   ├── database.ts            # 数据库类型
│   │   └── index.ts
│   └── config/
│       └── constants.ts           # 常量配置
│
└── _shared/                       # 共享代码（供未来拆分使用）
    ├── supabase-client.ts
    ├── types.ts
    └── utils.ts
```

### 2.2 入口文件

```typescript
// supabase/functions/api/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from './middleware/cors.ts';
import { authMiddleware } from './middleware/auth.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { authRoutes } from './routes/auth.ts';
import { orderRoutes } from './routes/orders.ts';
import { videoRoutes } from './routes/videos.ts';
import { paymentRoutes } from './routes/payments.ts';
import { couponRoutes } from './routes/coupons.ts';
import { addressRoutes } from './routes/addresses.ts';
import { supportRoutes } from './routes/support.ts';

serve(async (req: Request) => {
  // 1. CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/api/v1/', '');

  try {
    // 2. 路由分发
    let response: Response;

    if (path.startsWith('auth/')) {
      // 公开路由，不需要认证
      response = await authRoutes(req, path.replace('auth/', ''));
    }
    else if (path.startsWith('webhooks/')) {
      // Webhook 路由，单独处理签名验证
      response = await webhookRoutes(req, path.replace('webhooks/', ''));
    }
    else {
      // 3. JWT 认证（受保护路由）
      const user = await authMiddleware(req);

      // 4. 业务路由分发
      if (path.startsWith('orders')) {
        response = await orderRoutes(req, path.replace('orders', ''), user);
      }
      else if (path.startsWith('videos')) {
        response = await videoRoutes(req, path.replace('videos', ''), user);
      }
      else if (path.startsWith('payments')) {
        response = await paymentRoutes(req, path.replace('payments', ''), user);
      }
      else if (path.startsWith('coupons')) {
        response = await couponRoutes(req, path.replace('coupons', ''), user);
      }
      else if (path.startsWith('addresses')) {
        response = await addressRoutes(req, path.replace('addresses', ''), user);
      }
      else if (path.startsWith('support')) {
        response = await supportRoutes(req, path.replace('support', ''), user);
      }
      else {
        response = new Response(
          JSON.stringify({ code: 404, message: 'Not Found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. 添加 CORS 头
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (error) {
    return errorHandler(error);
  }
});
```

### 2.3 路由模块示例

```typescript
// supabase/functions/api/routes/orders.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// 验证 Schema
const createOrderSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().min(1).default(1)
});

export async function orderRoutes(
  req: Request,
  path: string,
  user: { id: string; email: string }
): Promise<Response> {
  const method = req.method;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // GET /orders - 获取订单列表
  if (method === 'GET' && (path === '' || path === '/')) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const status = url.searchParams.get('status');

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({
        code: 0,
        data: {
          list: data,
          pagination: {
            page,
            pageSize,
            total: count,
            totalPages: Math.ceil((count || 0) / pageSize)
          }
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // GET /orders/:id - 获取订单详情
  if (method === 'GET' && path.match(/^\/[\w-]+$/)) {
    const orderId = path.slice(1);

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        foot_videos (*)
      `)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    if (!order) {
      return new Response(
        JSON.stringify({ code: 404, message: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ code: 0, data: order }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // POST /orders - 创建订单
  if (method === 'POST' && path === '') {
    const body = await req.json();
    const validated = createOrderSchema.parse(body);

    // 获取商品信息
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', validated.productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ code: 3003, message: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 计算价格
    const subtotal = product.current_price * validated.quantity;
    const shipping = 0; // 免运费
    const tax = Math.round(subtotal * 0.08); // 8% 税费
    const total = subtotal + shipping + tax;

    // 创建订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        amounts: {
          subtotal,
          shipping,
          discount: 0,
          tax,
          total
        },
        shipping_address: {}, // 待填写
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15分钟过期
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 创建订单项
    await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      product_image: product.images[0]?.url,
      unit_price: product.current_price,
      quantity: validated.quantity,
      subtotal
    });

    return new Response(
      JSON.stringify({ code: 0, data: order }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // PATCH /orders/:id - 更新订单
  if (method === 'PATCH' && path.match(/^\/[\w-]+$/)) {
    const orderId = path.slice(1);
    const body = await req.json();

    // 验证订单归属
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (!existingOrder) {
      return new Response(
        JSON.stringify({ code: 404, message: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingOrder.status !== 'pending') {
      return new Response(
        JSON.stringify({ code: 3001, message: 'Order cannot be modified' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新订单
    const updateData: Record<string, unknown> = {};
    if (body.addressId) updateData.shipping_address = await getAddress(supabase, body.addressId);
    if (body.couponId) updateData.coupon_id = body.couponId;
    if (body.notes) updateData.notes = body.notes;

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ code: 0, data: order }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 默认返回 404
  return new Response(
    JSON.stringify({ code: 404, message: 'Not Found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

// 辅助函数
async function getAddress(supabase: any, addressId: string) {
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', addressId)
    .single();
  return data;
}
```

---

## 3. 认证与授权

### 3.1 认证流程

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Client  │         │  Edge Func   │         │  Supabase    │
└────┬─────┘         └──────┬───────┘         └──────┬───────┘
     │                      │                        │
     │ 1. 发送验证码         │                        │
     │ POST /auth/verify    │                        │
     ├─────────────────────>│                        │
     │                      │ 2. 生成验证码           │
     │                      │ 存入 temp_codes        │
     │                      ├───────────────────────>│
     │                      │                        │
     │ 3. 返回成功          │                        │
     │<─────────────────────┤                        │
     │                      │                        │
     │ 4. 邮箱 + 验证码登录  │                        │
     │ POST /auth/login     │                        │
     ├─────────────────────>│                        │
     │                      │ 5. 验证验证码           │
     │                      ├───────────────────────>│
     │                      │<────────────────────────┤
     │                      │                        │
     │                      │ 6. 创建/获取用户        │
     │                      │ 调用 supabase.auth     │
     │                      ├───────────────────────>│
     │                      │<────────────────────────┤
     │                      │                        │
     │ 7. 返回 JWT          │                        │
     │<─────────────────────┤                        │
     │                      │                        │
```

### 3.2 JWT 中间件

```typescript
// supabase/functions/api/middleware/auth.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

export async function authMiddleware(req: Request): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 401);
  }

  const token = authHeader.slice(7);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthError('Invalid or expired token', 401);
  }

  return {
    id: user.id,
    email: user.email!
  };
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}
```

### 3.3 权限控制（RLS）

数据库层面的行级安全（Row Level Security）：

```sql
-- 启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 用户只能看到自己的订单
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能创建自己的订单
CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的 pending 订单
CREATE POLICY "Users can update own pending orders" ON orders
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');
```

---

## 4. Webhook 处理

### 4.1 Stripe Webhook

```typescript
// supabase/functions/api/routes/webhooks.ts
import { stripe } from '../utils/stripe.ts';

export async function webhookRoutes(req: Request, path: string): Promise<Response> {
  if (path === 'stripe') {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // 验证签名
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    // 处理事件
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await handlePaymentFailed(paymentIntent);
        break;
      }
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleCheckoutCompleted(session: any) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 更新订单状态
  await supabase
    .from('orders')
    .update({
      status: 'video_review',
      payment: {
        method: 'stripe',
        stripe_payment_intent_id: session.payment_intent,
        paid_at: new Date().toISOString()
      }
    })
    .eq('id', session.metadata.orderId);

  // 发送确认邮件
  await sendOrderConfirmationEmail(session.customer_email, session.metadata.orderId);
}
```

---

## 5. 错误处理

```typescript
// supabase/functions/api/middleware/errorHandler.ts
import { corsHeaders } from './cors.ts';

export function errorHandler(error: unknown): Response {
  console.error('API Error:', error);

  // 自定义错误
  if (error instanceof AuthError) {
    return new Response(
      JSON.stringify({ code: 1002, message: error.message }),
      { status: error.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Zod 验证错误
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        code: 1001,
        message: 'Validation failed',
        details: error.errors
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 数据库错误
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string };
    if (pgError.code === '23505') { // 唯一约束冲突
      return new Response(
        JSON.stringify({ code: 409, message: 'Resource already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 默认错误
  return new Response(
    JSON.stringify({ code: 1000, message: 'Internal server error' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## 6. 相关文档

- [overview.md](./overview.md) - 架构总览
- [frontend.md](./frontend.md) - 前端架构
- [data.md](./data.md) - 数据架构
- [../api-contract.md](../api-contract.md) - API 接口契约

---

## 7. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本 | 技术团队 |
