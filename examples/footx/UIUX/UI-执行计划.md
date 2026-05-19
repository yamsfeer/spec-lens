# Foot X 移动端 Web APP — 开发执行计划

---

## 一、技术栈

- **React + TypeScript + Tailwind CSS v4**
- **React Router (Data mode)** 负责多页面路由
- **Mock 数据** 模拟全部 API 响应（无真实后端）
- **配色方案**：运动活力风格，主色调为青绿色（teal/cyan），辅以橙色（orange）作为强调色，深色背景提升对比度
- **语言**：全英文界面

---

## 二、模块拆分

### 模块 1：基础框架与布局（Foundation & Layout）

**范围**：应用外壳、路由、全局组件、主题体系

**组件**：

- `AppShell` — 移动端布局容器，底部包含 Tab 导航（Home、Orders、Coupons、Profile）
- `TopNavBar` — 返回按钮、页面标题、操作图标
- `BottomTabBar` — 4 个 Tab，支持高亮态和角标（待支付订单、新优惠券）
- `FloatingChatButton` — 全局客服入口，悬浮于右下角
- `OfflineBanner` — 网络状态检测提示条（顶部）
- `ToastProvider` — 全局 Toast/通知系统
- `LoadingSpinner` / `SkeletonLoader` — 加载态占位

**路由设计**：

```
/                  → 首页（产品展示）
/login             → 登录页
/products/:id      → 商品详情页
/customize         → 视频拍摄流程
/checkout          → 下单/结账页
/orders            → 订单列表
/orders/:id        → 订单详情页
/coupons           → 优惠券列表
/referral          → 邀请好友
/profile           → 个人中心
/profile/edit      → 个人资料编辑
/addresses         → 地址管理
/addresses/edit    → 地址新增/编辑
/support           → 帮助中心
/support/chat      → 在线客服聊天页
```

**分支场景**：

- 未登录用户点击受保护 Tab → 跳转 `/login` 并携带 return URL
- 网络离线 → 展示 `OfflineBanner`，并禁用支付入口

---

### 模块 2：首页与产品发现（Home & Product Discovery）

**范围**：落地页、商品列表、商品详情

**页面**：

1. **HomePage** (`/`)
   - 主视觉横幅（Hero Banner）展示核心价值主张："Custom Insoles, Powered by Science"
   - "How It Works" 四步流程图（Record → Analyze → Craft → Deliver）
   - 产品分类卡片（Sports / Daily Comfort / Medical）
   - 对比卡片（Custom vs Generic insoles）
   - 专家背书区域
   - 用户评价轮播（Testimonials Carousel）
   - 首单弹窗（收集邮箱赠送 10% 折扣券）
2. **ProductDetailPage** (`/products/:id`)
   - 商品图片轮播（支持滑动）
   - 价格显示（原价划线）
   - 规格选择器（厚度等变体）
   - 场景标签（Running、Basketball 等）
   - 功能图标列表
   - "Available coupon" 提示横幅
   - 底部粘性 CTA 按钮："Start Customization — $XXX"

**分支场景**：

- 首单弹窗状态流：IDLE → POPUP_SHOW → EMAIL_SUBMIT → EMAIL_ERR（格式错误）→ COUPON_SEND → COUPON_SENT → POPUP_CLOSE
- 用户关闭弹窗 → 记录 localStorage，不再展示
- 商品无变体 vs 有变体
- 折扣商品 vs 全价商品

---

### 模块 3：用户认证（Authentication）

**范围**：登录/注册流程

**页面**：

1. **LoginPage** (`/login`)
   - 邮箱 + 验证码登录（主要方式）
   - Google OAuth 按钮（Mock）
   - 可选推荐码输入（可展开）
   - 服务条款与隐私协议复选框
   - 新用户欢迎语 + 推荐奖励展示

**状态机覆盖**：

- LOGGED_OUT → AUTH_STARTING → CODE_SENDING → CODE_SENT → VERIFYING → LOGGED_IN
- CODE_SEND_FAIL → 重试
- VERIFY_FAIL（错误/过期验证码）→ 重输 / 重发
- REFERRAL_CHECK → REWARD_APPLY → LOGGED_IN（带奖励 Toast）
- 60 秒倒计时重发按钮
- 自动检测 URL 中的 `?ref=CODE`

---

### 模块 4：视频采集与足部档案（Video Capture & Foot Profile）

**范围**：视频录制/上传流程、足部信息表单

**页面**：

1. **VideoGuidePage** — 拍摄指引：环境、姿势、光线清单 + 示例视频
2. **VideoCaptureView** — 相机预览 + 录制按钮 + 计时器（15-20 秒）
3. **VideoPreviewView** — 视频回放 + 重拍 / 确认按钮
4. **VideoUploadView** — 上传进度条 + 状态文案
5. **FootProfileForm** — 鞋码、运动类型、频率、病史、特殊需求

**状态机覆盖**：

- GUIDE_SHOW → CAMERA_INIT → CAMERA_READY → RECORDING → RECORD_DONE → PREVIEW → UPLOADING → UPLOAD_SUCCESS → REVIEW_WAIT
- CAMERA_INIT → PERM_DENIED → 跳转设置/上传兜底方案
- FILE_SELECT → FILE_VALIDATING → 格式/大小/时长错误
- UPLOADING → UPLOAD_FAIL（网络/服务器/文件错误）→ 支持断点续传重试
- REVIEW_WAIT → REVIEW_PASS / REVIEW_FAIL（带具体驳回原因）

**说明**：浏览器相机 API 无法完全模拟，UI 层面使用文件上传作为代理，但会展示全部状态。

---

### 模块 5：下单与支付（Order Creation & Checkout）

**范围**：订单表单、地址选择、优惠券选择、支付流程

**页面**：

1. **OrderCreatePage** (`/checkout`)
   - 商品摘要卡片
   - 地址选择器（点击唤起地址列表，进入选择模式）
   - 优惠券选择器（底部 Sheet/弹窗，区分可用/不可用券）
   - 推荐码输入（实时校验）
   - 订单备注（带字数统计）
   - 价格明细（小计、运费、折扣、税费、总计、节省金额）
   - 底部粘性按钮："Pay $XXX"
   - 下单后 15 分钟倒计时（支付超时）
2. **PaymentResultPage**
   - 成功：订单确认、奖励优惠券展示、"View Order" 按钮
   - 失败：错误原因、重试/换支付方式/联系客服选项
   - 超时："Order expired" 提示 + 重新下单入口

**分支场景**：

- 无地址 → 提示添加
- 无可用优惠券 → 展示 "No coupons available"
- 自动选择最优优惠券并提示
- 无效推荐码 → 行内错误提示
- ORDER_PREVIEW → CHECKOUT_INIT → STRIPE_LOADING → PAY_PENDING → PAY_SUCCESS / PAY_FAIL / PAY_TIMEOUT
- 支付失败类型：银行卡被拒、余额不足、卡片过期、CVV 错误、用户取消
- 15 分钟倒计时：5 分钟警告、1 分钟紧急警告、超时后自动取消

---

### 模块 6：订单管理（Order Management）

**范围**：订单列表、订单详情、订单追踪

**页面**：

1. **OrderListPage** (`/orders`)
   - Tab 筛选：All / Pending / Processing / Completed（带计数）
   - 订单卡片：商品图、名称、规格、状态徽章、价格、日期
   - 按状态展示操作按钮（Pay / Cancel / Track / Review / Reupload / Reorder）
   - 顶部优惠券到期提醒横幅
   - 各 Tab 空态（Empty State）
2. **OrderDetailPage** (`/orders/:id`)
   - 状态标题（图标 + 颜色 + 描述）
   - 进度步骤条（6 步：Submit → Video Review → 3D Modeling → Production → Shipping → Complete）
   - 商品信息卡片
   - 价格明细
   - 视频区域（上传状态：waiting / uploading / reviewing / approved / rejected，拒件带原因）
   - 收货地址卡片
   - 物流追踪时间线（承运商、运单号、物流事件列表）
   - 支付信息
   - 操作按钮
   - 联系客服入口

**状态映射（11 种状态）**：

- pending（橙色）、video_review（蓝色）、video_rejected（红色）、modeling（紫色）、production（靛蓝）、shipped（蓝色）、delivered（绿色）、completed（绿色）、cancelled（灰色）、refunding（橙色）、refunded（灰色）

---

### 模块 7：优惠券管理（Coupon Management）

**范围**：优惠券列表、优惠券领取

**页面**：

1. **CouponListPage** (`/coupons`)
   - Tab：Unused / Used / Expired（带计数）
   - 优惠券卡片：折扣金额、描述、适用范围、有效期、来源标签、主题色
   - "Expiring soon" 徽章（≤7 天）
   - 顶部优惠券码输入领取
   - 各 Tab 空态（"No coupons yet" / "Go shopping to earn coupons"）

**分支场景**：

- 未使用优惠券 → "Use Now" 跳转商品页
- 已过期/已使用优惠券 → 置灰、无操作
- 领取码 → validating → success / error（invalid / already claimed / expired）

---

### 模块 8：地址管理（Address Management）

**范围**：地址的增删改查

**页面**：

1. **AddressListPage** (`/addresses`)
   - 地址卡片：姓名、脱敏手机号、完整地址、默认地址徽章、标签（Home/Work）
   - 选择模式（从结账页跳转时）
   - "Add New Address" 按钮（上限 10 条）
   - 侧滑编辑/删除
2. **AddressEditPage** (`/addresses/edit`)
   - 表单：收件人姓名、手机号、国家、省/州、城市、区县、详细地址、邮编
   - 默认地址开关
   - 标签选择器（Home / Work / Other）
   - 字段校验（必填项、格式校验）

---

### 模块 9：推荐/邀请好友（Referral / Invite Friends）

**范围**：推荐码分享、统计数据

**页面**：

1. **ReferralPage** (`/referral`)
   - 推荐码卡片（格式："FOOTX-A1B2C3D4"）+ 复制按钮
   - 分享链接 + 复制按钮
   - 奖励说明卡片（各得 $50，有效期 90 天）
   - 数据看板：点击量、注册量、转化量、已获得奖励
   - 推荐记录列表（状态：clicked / registered / converted）
   - 分享方式：Copy Link、Email、SMS

---

### 模块 10：客户支持（Customer Support）

**范围**：FAQ、AI 客服、人工客服转接

**页面**：

1. **FAQPage** (`/support`)
   - 搜索栏
   - 带图标的分类 Tab
   - 热门问题区域
   - 可展开 FAQ 条目（有用/无用投票）
2. **SupportChatPage** (`/support/chat`)
   - 聊天气泡（用户/AI/人工/系统）
   - 关联订单卡片（如有上下文）
   - 快捷操作芯片（"Track Order"、"Return Policy"、"Contact Human"）
   - AI 输入中动画指示器
   - 转人工流程：HUMAN_OFFER → HUMAN_CONNECT → 排队位置 → HUMAN_CHAT
   - 会话结束评分弹窗（星级 + 标签 + 评论）

**分支场景**：

- AI 连续两次回答失败 → 自动提供转人工入口
- 用户输入 "refund" / "complaint" → 高优先级人工队列
- 非工作时间（22:00-08:00）→ "Leave a message" 模式
- 排队等待：<5 分钟、5-10 分钟（建议看 FAQ）、>10 分钟（提供回电选项）

---

### 模块 11：个人中心与账户（Profile & Account）

**范围**：个人中心、资料编辑

**页面**：

1. **ProfilePage** (`/profile`)
   - 用户信息卡片（头像、姓名、邮箱、注册时间）
   - 快捷数据：订单数、优惠券数、推荐数（带徽章）
   - 菜单分组：Orders、Coupons、Addresses、Invite Friends、FAQ、Settings
   - 资料完成度进度条 + 完善提示
2. **ProfileEditPage** (`/profile/edit`)
   - 基础信息：昵称、手机号
   - 鞋码选择器（US / EU / UK / CM）
   - 运动习惯：主要运动、频率、时长
   - 病史：足部问题多选、备注
   - 特殊需求文本域
   - 保存按钮（带 dirty 状态追踪）

---

## 三、建议执行顺序

| 阶段          | 模块                                      | 理由                   |
| ------------- | ----------------------------------------- | ---------------------- |
| **Phase 1**   | M1（基础框架）+ M2（首页/商品）           | 构建应用壳层 + 首屏印象 |
| **Phase 2**   | M3（认证）+ M11（个人中心）               | 建立用户身份流         |
| **Phase 3**   | M4（视频）+ M8（地址）                    | 核心定制流程           |
| **Phase 4**   | M5（结账）+ M7（优惠券）                  | 购买转化链路           |
| **Phase 5**   | M6（订单）+ M9（推荐裂变）                | 售后与传播体验         |
| **Phase 6**   | M10（客服）                               | 客户服务层             |

---

## 四、Mock 数据策略

- 所有 API 响应均通过 `/src/app/mocks/` 目录中的真实 Mock 数据模拟
- 状态流转通过 `setTimeout` 延迟模拟
- 视频拍摄使用文件上传组件作为代理
- 支付流程展示 Mock 的 Stripe 风格交互

