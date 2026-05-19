# Foot X 实时推送方案决策

**版本**: v1.0
**日期**: 2026-03-30
**状态**: 已决策

---

## 决策结果

**选择**: **Supabase Realtime**

用于订单状态实时更新、客服消息推送等场景。

---

## 背景：为什么需要实时推送？

### 核心场景：订单状态追踪

Foot X 中，用户下单后会经历多个状态变化：

```
用户小王的一天：

10:00  下单成功 → pending（待支付）
10:05  支付完成 → video_review（视频审核中）
11:30  审核通过 → modeling（建模中）
14:00  建模完成 → production（生产中）
第3天   制作完成 → shipped（已发货）
第5天   快递送达 → delivered（已送达）
```

**问题**：小王打开"我的订单"页面时，**如何及时知道状态变了？**

---

## 三种技术方案对比

| 维度 | **轮询 (Polling)** | **WebSocket** | **Supabase Realtime** |
|------|-------------------|---------------|----------------------|
| **原理** | 定时发送请求查询 | 建立长连接双向通信 | 数据库变化自动推送 |
| **延迟** | 取决于轮询间隔（3-10秒） | 毫秒级实时 | 毫秒级实时 |
| **服务器压力** | 高（频繁请求） | 中等（需维护连接） | 低（按需推送） |
| **实现复杂度** | 低 | 高（需自建服务） | 低（内置功能） |
| **兼容性** | 好 | 一般（代理可能阻断） | 好（自动降级） |
| **成本** | 低 | 中等（自建服务器） | 包含在 Supabase 中 |

---

## 选择 Supabase Realtime 的理由

### 1. 与现有技术栈无缝集成

Foot X 已经选择 Supabase 作为后端，Realtime 是内置功能，无需额外服务。

### 2. 数据库驱动，开发简单

```typescript
// 只需要订阅数据库变化，无需额外代码
const subscription = supabase
  .channel(`order:${orderId}`)
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderId}`
    },
    (payload) => {
      // 数据库一变，这里自动执行
      updateOrderUI(payload.new);
    }
  )
  .subscribe();
```

### 3. 自动处理连接管理

- 自动重连
- 断线恢复
- 心跳检测
- 无需手动维护 WebSocket 连接

### 4. 细粒度权限控制

通过 RLS (Row Level Security) 控制用户只能订阅自己的数据：

```sql
-- 用户只能看到/订阅自己的订单
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Foot X 中的具体应用场景

### 场景1：订单状态实时更新

```
用户在订单详情页等待视频审核
        ↓
  后台审核员点击"审核通过"
        ↓
  数据库 UPDATE orders SET status = 'modeling'
        ↓
  Supabase Realtime 自动推送
        ↓
  用户页面实时显示"审核通过，开始建模"
        ↓
  无需刷新页面或手动下拉
```

**前端实现：**
```typescript
// 在 OrderDetailPage.tsx 中
useEffect(() => {
  const subscription = supabase
    .channel(`order:${orderId}`)
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        // 播放提示音或显示 Toast
        toast.success(`订单状态更新：${payload.new.status}`);
        // 更新 UI
        setOrder(payload.new);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [orderId]);
```

### 场景2：客服消息实时推送

```
用户打开客服对话框
        ↓
  人工客服回复消息
        ↓
  INSERT INTO support_messages
        ↓
  用户页面实时收到新消息
        ↓
  显示未读红点
```

**前端实现：**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `session_id=eq.${sessionId}`
      },
      (payload) => {
        // 新消息到达
        setMessages(prev => [...prev, payload.new]);
        // 滚动到底部
        scrollToBottom();
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [sessionId]);
```

### 场景3：物流状态更新

```
物流 Webhook 收到更新
        ↓
  UPDATE orders SET shipping = {...}
        ↓
  用户页面实时显示：
  "已发货，快递单号：SF123456789"
```

---

## 不需要实时推送的场景

| 功能 | 推荐方案 | 理由 |
|------|---------|------|
| 视频上传进度 | **前端本地控制** | 上传进度本来就是前端控制，无需服务端推送 |
| 优惠券列表 | **页面刷新/下拉刷新** | 不需要实时，用户主动刷新即可 |
| 商品列表 | **缓存 + 刷新** | 商品信息变化不频繁 |
| 用户资料 | **编辑后刷新** | 用户自己修改，无需实时 |

---

## 技术实现细节

### 1. 订阅频道命名规范

```typescript
// 订单频道：order:{orderId}
`order:${orderId}`

// 用户订单列表频道：user_orders:{userId}
`user_orders:${userId}`

// 客服会话频道：support:{sessionId}
`support:${sessionId}`

// 用户通知频道：notifications:{userId}
`notifications:${userId}`
```

### 2. 重连和错误处理

```typescript
const subscription = supabase
  .channel(`order:${orderId}`)
  .on('postgres_changes', config, callback)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('已连接到实时服务');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('连接错误，尝试重连...');
      // 自动重连由 Supabase 处理
    }
    if (status === 'TIMED_OUT') {
      console.warn('连接超时');
    }
  });
```

### 3. 性能优化：批量更新

```typescript
// 订单列表页面：监听用户的所有订单
const subscription = supabase
  .channel(`user_orders:${userId}`)
  .on('postgres_changes',
    {
      event: '*',  // 监听所有事件 INSERT/UPDATE/DELETE
      schema: 'public',
      table: 'orders',
      filter: `user_id=eq.${userId}`  // 只监听该用户的订单
    },
    (payload) => {
      // 更新订单列表中的对应项
      updateOrderInList(payload.new);
    }
  )
  .subscribe();
```

---

## 限制和注意事项

### 1. 免费档限制

| 项目 | 免费档限制 |
|------|-----------|
| 并发连接数 | 200 |
| 消息频率 | 每秒 100 条 |

**应对策略：**
- 200 连接对于初期足够（每个打开页面的用户占用 1-2 个连接）
- 后期可升级付费档

### 2. 网络环境兼容性

部分企业网络或代理可能阻断 WebSocket，Supabase 会自动降级为长轮询。

### 3. 数据安全

必须通过 RLS 控制权限，否则用户可能订阅到其他用户的数据：

```sql
-- 错误的：所有用户可以看到所有订单变化
-- 正确的：用户只能看到自己的订单变化
CREATE POLICY "Users can only subscribe own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 备选方案

如果未来需要迁移出 Supabase，Realtime 功能可以替换为：

```
方案A: 自建 WebSocket 服务 (Node.js + Socket.io)
方案B: 使用第三方服务 (Pusher, Ably)
方案C: 回归轮询 (简单但体验降级)
```

---

## 相关文档

- [edge-functions-architecture.md](./edge-functions-architecture.md) - Edge Functions 架构
- [data-entities.md](./data-entities.md) - 数据实体定义
- [database-schema.md](./database-schema.md) - 数据库表结构

---

## 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本，确定使用 Supabase Realtime | 技术团队 |
