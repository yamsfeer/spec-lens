# Foot X Edge Functions 架构决策

**版本**: v1.0
**日期**: 2026-03-30
**状态**: 已决策

---

## 决策结果

**选择**: **单体架构起步，关键路径后期拆分**

---

## 背景：单体 vs 拆分的概念

### 什么是单体架构？

只有一个 Edge Function 入口，所有 API 路由集中在一个函数中处理。

```
supabase/functions/api/index.ts    ← 唯一入口
```

**代码结构示例：**
```typescript
// 所有路由在一个文件里
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // 路由分发
  if (path === '/auth/login' && method === 'POST') {
    return handleLogin(req);
  }
  if (path === '/orders' && method === 'GET') {
    return handleOrdersList(req);
  }
  if (path === '/orders' && method === 'POST') {
    return handleOrderCreate(req);
  }
  if (path === '/videos/upload-token' && method === 'POST') {
    return handleVideoUploadToken(req);
  }
  // ... 所有 API 都在这里
});
```

---

### 什么是拆分架构？

每个功能或路由有独立的 Edge Function。

```
supabase/functions/auth-login/index.ts      ← 登录
supabase/functions/auth-register/index.ts   ← 注册
supabase/functions/orders-list/index.ts     ← 订单列表
supabase/functions/orders-create/index.ts   ← 创建订单
supabase/functions/videos-upload/index.ts   ← 视频上传
...
```

**每个函数独立处理：**
```typescript
// auth-login/index.ts
Deno.serve(async (req) => {
  // 只处理登录逻辑
  return handleLogin(req);
});

// orders-list/index.ts
Deno.serve(async (req) => {
  // 只处理订单列表
  return handleOrdersList(req);
});
```

---

## 详细对比

| 维度 | **单体架构** | **拆分架构** |
|------|-------------|-------------|
| **文件数量** | 少（1个主文件） | 多（每个功能1个） |
| **代码复用** | 容易（同一文件内） | 需要 import_map |
| **冷启动** | 少（只有一个函数） | 多（每个函数独立） |
| **部署** | 简单（一次部署） | 复杂（逐个部署） |
| **配置灵活** | 统一配置 | 可按需单独配置 |
| **文件大小** | 较大 | 较小 |
| **问题隔离** | 差（一个错可能影响全部） | 好（相互独立） |

---

## 决策过程

### 第一阶段：为什么选单体？

**Foot X 初期特点：**
- 团队规模小，需要快速迭代
- API 数量适中（约 30-40 个接口）
- 大部分请求处理时间短（< 500ms）

**单体架构优势：**
1. **开发效率高**
   - 不需要管理多个函数的部署
   - 代码共享方便（工具函数、类型定义、数据库客户端）

2. **调试方便**
   - 本地启动一个服务即可测试所有接口
   - 日志集中在一个地方

3. **部署简单**
   ```bash
   supabase functions deploy api
   ```

4. **冷启动优化**
   - 用户访问 `/orders` 后，访问 `/coupons` 时函数已热
   - 拆分架构下每个函数都要重新冷启动

### 第二阶段：什么时候拆分？

**需要拆分的情况：**

```
单体架构遇到瓶颈
        ↓
┌─────────────────┐
│ 1. 视频处理超时 │  ← 默认 10s 不够，需要 60s+
│ 需要独立配置    │
└─────────────────┘
        ↓
拆分：supabase/functions/video-process/index.ts
      （单独配置超时时间和内存）

┌─────────────────┐
│ 2. Stripe Webhook│ ← 需要特殊的 IP 白名单
│ 安全要求高      │    和验证逻辑
└─────────────────┘
        ↓
拆分：supabase/functions/webhook-stripe/index.ts
      （独立的安全配置）

┌─────────────────┐
│ 3. 代码量过大   │ ← 单体文件超过 2000 行
│ 维护困难        │
└─────────────────┘
        ↓
拆分：按领域拆分（auth/、orders/、payments/）
```

---

## 推荐的演进路径

```
┌─────────────────────────────────────────────────────────────┐
│                      第一阶段：单体                          │
│                                                             │
│  supabase/functions/api/index.ts                            │
│    ├── routes/auth.ts      (认证路由)                       │
│    ├── routes/orders.ts    (订单路由)                       │
│    ├── routes/videos.ts    (视频路由)                       │
│    ├── routes/payments.ts  (支付路由)                       │
│    ├── utils/db.ts         (数据库连接)                     │
│    ├── utils/auth.ts       (认证工具)                       │
│    └── types/index.ts      (类型定义)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      第二阶段：关键路径拆分                   │
│                                                             │
│  supabase/functions/api/index.ts         (大部分业务)        │
│  supabase/functions/video-process/index.ts (视频处理-长超时)  │
│  supabase/functions/webhook-stripe/index.ts (Stripe回调)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 代码示例

### 单体架构项目结构

```
supabase/functions/api/
├── index.ts              # 入口，路由分发
├── routes/
│   ├── auth.ts           # /auth/* 路由
│   ├── orders.ts         # /orders/* 路由
│   ├── videos.ts         # /videos/* 路由
│   ├── payments.ts       # /payments/* 路由
│   └── support.ts        # /support/* 路由
├── utils/
│   ├── db.ts             # Supabase 客户端
│   ├── auth.ts           # JWT 验证
│   ├── response.ts       # 统一响应格式
│   └── logger.ts         # 日志工具
├── types/
│   ├── auth.ts           # 认证类型
│   ├── order.ts          # 订单类型
│   └── index.ts          # 类型导出
└── config/
    └── constants.ts      # 常量配置
```

### 入口文件示例

```typescript
// supabase/functions/api/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authRoutes } from './routes/auth.ts';
import { orderRoutes } from './routes/orders.ts';
import { videoRoutes } from './routes/videos.ts';
import { paymentRoutes } from './routes/payments.ts';
import { corsHeaders } from './utils/response.ts';

serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/api/', '');

  try {
    // 路由分发
    if (path.startsWith('auth/')) {
      return await authRoutes(req, path.replace('auth/', ''));
    }
    if (path.startsWith('orders')) {
      return await orderRoutes(req, path.replace('orders', ''));
    }
    if (path.startsWith('videos')) {
      return await videoRoutes(req, path.replace('videos', ''));
    }
    if (path.startsWith('payments')) {
      return await paymentRoutes(req, path.replace('payments', ''));
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 相关文档

- [deployment-solution.md](./deployment-solution.md) - 部署方案
- [video-upload-solution.md](./video-upload-solution.md) - 视频上传方案
- [PRD.md](./PRD.md) - 产品需求文档

---

## 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本，确定单体起步、关键路径后期拆分 | 技术团队 |
