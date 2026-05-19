# Foot X 部署架构

**文档版本**: v1.0
**最后更新**: 2026-03-30
**状态**: 已确定

---

## 1. 部署架构概述

### 1.1 部署目标

- **自动化**: 代码提交后自动构建、测试、部署
- **多环境**: 开发、测试、生产环境隔离
- **零停机**: 部署过程不影响线上服务
- **可回滚**: 快速回滚到上一版本

### 1.2 环境规划

| 环境 | 域名 | 用途 | 数据库 |
|------|------|------|--------|
| **开发 (dev)** | dev.footx.com | 开发测试 | Supabase dev project |
| **预览 (preview)** | {branch}-footx.vercel.app | PR 预览 | Supabase dev project |
| **生产 (prod)** | app.footx.com | 正式服务 | Supabase prod project |
| **后台管理** | admin.footx.com | 运营管理 | Supabase prod project |

---

## 2. 部署架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              开发阶段                                        │
│  ┌─────────────┐                                                            │
│  │  开发者本地  │  pnpm dev                                                  │
│  │  localhost  │  Vite dev server + Supabase local                         │
│  └──────┬──────┘                                                            │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          │ git push
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD 流程                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        GitHub Actions                              │    │
│  │                                                                      │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │    │
│  │  │  Checkout │ -> │  Install │ -> │  Build   │ -> │  Deploy  │      │    │
│  │  │  代码检出 │    │  依赖安装 │    │  构建打包 │    │  部署发布 │      │    │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │    │
│  │                                                                      │    │
│  │  触发条件:                                                            │    │
│  │  - Push to main → 部署生产环境                                        │    │
│  │  - Pull Request → 部署预览环境                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              生产环境部署                                    │
│                                                                             │
│  ┌─────────────────────┐      ┌─────────────────────┐                       │
│  │   Vercel (前端)      │      │   Supabase (后端)    │                       │
│  │                     │      │                     │                       │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │                       │
│  │  │  Edge Network │  │      │  │  Edge Func    │  │                       │
│  │  │  全球 CDN     │  │      │  │  业务逻辑      │  │                       │
│  │  └───────────────┘  │      │  └───────────────┘  │                       │
│  │                     │      │                     │                       │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │                       │
│  │  │  Static Files │  │      │  │  PostgreSQL   │  │                       │
│  │  │  静态资源     │  │      │  │  数据库       │  │                       │
│  │  └───────────────┘  │      │  └───────────────┘  │                       │
│  │                     │      │                     │                       │
│  │  ┌───────────────┐  │      │  ┌───────────────┐  │                       │
│  │  │  Functions    │  │      │  │  Storage      │  │                       │
│  │  │  (API Routes) │  │      │  │  文件存储     │  │                       │
│  │  └───────────────┘  │      │  └───────────────┘  │                       │
│  └─────────────────────┘      └─────────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CI/CD 配置

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ============ 代码检查 ============
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linter
        run: pnpm lint

      - name: Run type check
        run: pnpm type-check

  # ============ 测试 ============
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

  # ============ 构建前端 ============
  build-frontend:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build frontend
        run: pnpm build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  # ============ 部署到预览环境 (PR) ============
  deploy-preview:
    runs-on: ubuntu-latest
    needs: [build-frontend]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel Preview
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comment Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: ${{ steps.deploy.outputs.url }}'
            })

  # ============ 部署 Edge Functions ============
  deploy-functions:
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Edge Functions
        run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

  # ============ 部署生产环境 ============
  deploy-production:
    runs-on: ubuntu-latest
    needs: [deploy-functions]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel Production
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 3.2 环境变量管理

```bash
# 开发环境 (.env.development)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# 生产环境 (.env.production)
VITE_SUPABASE_URL=https://yyy.supabase.co
VITE_SUPABASE_ANON_KEY=yyy

# Edge Functions 环境变量 (通过 Supabase CLI 设置)
supabase secrets set STRIPE_SECRET_KEY=sk_xxx --project-ref yyy
supabase secrets set RESEND_API_KEY=re_xxx --project-ref yyy
```

---

## 4. Vercel 配置

### 4.1 vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://xxx.supabase.co/functions/v1/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 4.2 部署策略

| 策略 | 说明 |
|------|------|
| **原子部署** | 所有文件同时上线，不会出现混合版本 |
| **边缘缓存** | 静态资源全球 CDN 缓存 |
| **自动回滚** | 部署失败自动回滚到上一版本 |
| **分支预览** | 每个 PR 自动生成独立预览环境 |

---

## 5. 安全架构

### 5.1 安全层级

```
┌────────────────────────────────────────────────────────────────┐
│                        安全层级                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. 网络安全层                                                  │
│     ├── HTTPS (TLS 1.3)                                        │
│     ├── HSTS (HTTP Strict Transport Security)                  │
│     └── DDoS 防护 (Cloudflare/Vercel Edge)                     │
│                                                                │
│  2. 应用安全层                                                  │
│     ├── CORS 策略                                              │
│     ├── CSP (Content Security Policy)                          │
│     ├── XSS 防护                                               │
│     └── CSRF 防护                                              │
│                                                                │
│  3. 认证授权层                                                  │
│     ├── JWT Token                                              │
│     ├── Row Level Security                                     │
│     └── OAuth 2.0 (Google Login)                               │
│                                                                │
│  4. 数据安全层                                                  │
│     ├── 传输加密 (TLS)                                         │
│     ├── 存储加密 (AES-256)                                     │
│     └── 敏感数据脱敏                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 关键安全措施

#### HTTPS 配置

```typescript
// 强制 HTTPS
if (req.headers.get('x-forwarded-proto') !== 'https') {
  return new Response(null, {
    status: 301,
    headers: { Location: `https://${req.headers.get('host')}${req.url}` }
  });
}
```

#### CORS 配置

```typescript
// supabase/functions/api/middleware/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};
```

#### CSP 头部

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co https://api.stripe.com;
  frame-src https://js.stripe.com https://hooks.stripe.com;
">
```

### 5.3 认证安全

```typescript
// JWT Token 配置
const JWT_CONFIG = {
  accessTokenExpiry: '15m',      // 访问令牌 15 分钟
  refreshTokenExpiry: '7d',      // 刷新令牌 7 天
  algorithm: 'HS256'
};

// 密码策略（如果使用密码）
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};
```

### 5.4 支付安全

```
┌─────────────────────────────────────────────────────────────┐
│                     Stripe 支付安全                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 支付信息不经过我们的服务器                               │
│     用户 → Stripe Checkout (iframe) → Stripe API           │
│                                                             │
│  2. 使用 Payment Intent API                                 │
│     - 客户端获取 client_secret                              │
│     - Stripe.js 处理敏感信息                                 │
│     - 服务器只保存 payment_intent_id                        │
│                                                             │
│  3. Webhook 签名验证                                        │
│     - 验证 stripe-signature 头部                            │
│     - 防止伪造回调                                          │
│                                                             │
│  4. PCI DSS 合规                                            │
│     - Stripe 处理 PCI 合规                                   │
│     - 我们只需完成 SAQ A 问卷                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 监控与日志

### 6.1 监控体系

```
┌────────────────────────────────────────────────────────────────┐
│                        监控体系                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐                                          │
│  │  应用性能监控    │  Vercel Analytics                        │
│  │  (Web Vitals)   │  • Core Web Vitals                       │
│  │                 │  • 页面加载时间                          │
│  │                 │  • 用户地理位置                          │
│  └─────────────────┘                                          │
│                                                                │
│  ┌─────────────────┐                                          │
│  │  服务端监控      │  Supabase Logs                           │
│  │                 │  • Edge Function 执行时间                │
│  │                 │  • 数据库查询性能                        │
│  │                 │  • 错误日志                              │
│  └─────────────────┘                                          │
│                                                                │
│  ┌─────────────────┐                                          │
│  │  业务监控        │  自定义事件                              │
│  │                 │  • 订单转化率                            │
│  │                 │  • 视频上传成功率                        │
│  │                 │  • 支付成功率                            │
│  └─────────────────┘                                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 日志规范

```typescript
// 结构化日志
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  requestId: string;
  userId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// 示例
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'api',
  requestId: 'req-123',
  userId: 'user-456',
  message: 'Order created',
  metadata: { orderId: 'ORDER-xxx', amount: 9999 }
}));
```

---

## 7. 灾难恢复

### 7.1 备份策略

| 资源 | 备份方式 | 频率 | RTO | RPO |
|------|---------|------|-----|-----|
| 数据库 | 自动快照 + PITR | 每日 | 1 小时 | 5 分钟 |
| 存储文件 | 版本控制 | 实时 | 1 小时 | 0 |
| 代码 | Git | 每次提交 | 10 分钟 | 0 |

### 7.2 回滚流程

```
生产环境出现问题
        ↓
  1. 评估影响范围
        ↓
  2. 决定是否回滚
        ↓
  ┌─────────────────┐
  │  方案 A: 快速修复  │  ← 问题简单，立即修复
  │  直接提交修复代码  │
  └─────────────────┘
        ↓
  ┌─────────────────┐
  │  方案 B: 紧急回滚  │  ← 问题严重，需要快速恢复
  │  Vercel: 一键回滚  │
  │  Supabase: 数据库还原 │
  └─────────────────┘
        ↓
  3. 事后复盘 (Post-mortem)
```

---

## 8. 相关文档

- [overview.md](./overview.md) - 架构总览
- [frontend.md](./frontend.md) - 前端架构
- [backend.md](./backend.md) - 后端架构
- [data.md](./data.md) - 数据架构

---

## 9. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本 | 技术团队 |
