# Foot X UI 数据契约文档

**版本**: v2.0
**日期**: 2026-03-29
**对应 API**: api-contract.md v1.0

---

## 1. 概述

本文档定义前端 UI 展示层所需的数据结构。前端从后端 API 获取数据后，会进行字段取舍、格式转换、计算等处理，然后将处理后的数据传递给 UI 组件进行展示。

### 数据流向

```
后端 API → 前端 Service/Store → 前端 ViewModel → UI 组件
     ↑                              ↓
   原始数据                    展示数据 (本文档定义)
```

### 命名规范

- `displayXxx`: 格式化后的展示文本
- `formattedXxx`: 格式化后的数值/日期
- `isXxx`: 布尔状态
- `canXxx`: 是否可执行某操作
- `xxxList`: 列表数据
- `xxxStats`: 统计数据

---

## 2. 全局状态数据

### 2.1 当前用户信息 (GlobalUser)

**来源 API**: `GET /users/me`

```typescript
interface GlobalUser {
  // 基础信息
  id: string;
  email: string;
  displayName: string;           // nickname || email 前缀 || '用户'
  avatar: string | null;         // 头像 URL

  // 统计信息 (用于导航/badge)
  stats: {
    orderCount: number;
    couponCount: number;
    pendingOrderCount: number;   // 新增：待处理订单数 (需要前端计算)
  };

  // 邀请相关
  referralCode: string;
  referralLink: string;          // 完整分享链接

  // 档案完整度
  profileCompletion: number;     // 0-100，前端计算
  isProfileComplete: boolean;    // profileCompletion >= 80
}
```

**数据转换**:
```typescript
// API 原始数据 → UI 展示数据
{
  displayName: user.nickname || user.email.split('@')[0] || '用户',
  referralLink: `${window.location.origin}/?ref=${user.referralCode}`,
  profileCompletion: calculateCompletion(userProfile), // 前端计算
}
```

---

## 3. 商品模块 UI 数据

### 3.1 商品列表页 (ProductListPage)

**来源 API**: `GET /products`

```typescript
interface ProductListPageData {
  // 筛选状态
  activeFilter: 'all' | 'sports' | 'daily' | 'medical';

  // 商品列表
  productList: ProductListItem[];

  // 分页信息
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
    hasMore: boolean;            // currentPage * pageSize < total
  };

  // 加载状态
  isLoading: boolean;
  isLoadingMore: boolean;
}

interface ProductListItem {
  id: string;
  name: string;
  subtitle: string | null;
  displayPrice: string;          // "$129" 或 "$129 - $149"
  originalPriceDisplay: string | null;  // "$199" 带删除线
  imageUrl: string;              // 主图 URL
  typeLabel: string;             // "运动定制" | "日常舒适" | "医疗矫正"
  typeColor: string;             // 对应标签颜色 token
  scenarioTags: string[];        // ["跑步", "篮球"] 最多显示 2 个
  hasDiscount: boolean;          // originalPrice > currentPrice
}
```

**数据转换**:
```typescript
// 价格格式化
function formatPriceRange(product: Product): string {
  if (product.variants?.length > 0) {
    const prices = product.variants.map(v =>
      product.currentPrice + v.priceAdjustment
    );
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min / 100}` : `$${min / 100} - $${max / 100}`;
  }
  return `$${product.currentPrice / 100}`;
}

// 类型标签映射
const typeLabelMap = {
  sports: { label: '运动定制', color: 'blue' },
  daily: { label: '日常舒适', color: 'green' },
  medical: { label: '医疗矫正', color: 'purple' },
};
```

### 3.2 商品详情页 (ProductDetailPage)

**来源 API**: `GET /products/:id`

```typescript
interface ProductDetailPageData {
  // 基础信息
  id: string;
  name: string;
  subtitle: string | null;
  description: string;           // Markdown/HTML 内容

  // 价格信息
  basePrice: number;             // 当前基础价 (分)
  originalPrice: number;         // 原价 (分)
  displayPrice: string;          // 格式化后的当前价格
  originalPriceDisplay: string | null;

  // 图片
  imageList: {
    url: string;
    alt: string;
    isVideo: boolean;            // 是否视频展示
  }[];
  currentImageIndex: number;     // 当前展示图片索引

  // 规格选择
  hasVariants: boolean;
  variantList: VariantOption[];
  selectedVariant: VariantOption | null;

  // 规格选项
  scenarioList: string[];        // 适用场景
  featureList: {                 // 功能特性 (带图标)
    icon: string;
    title: string;
    description: string;
  }[];

  // 用户操作状态
  canPurchase: boolean;
  isAddingToCart: boolean;

  // 优惠提示
  availableCouponHint: string | null;  // "有可用的优惠券"
}

interface VariantOption {
  id: string;
  name: string;                  // "厚度"
  value: string;                 // "标准"
  priceAdjustment: number;       // 价格调整 (分)
  displayPriceAdjustment: string | null;  // "+$10" 或 null
  isAvailable: boolean;
  isSelected: boolean;
}
```

---

## 4. 订单模块 UI 数据

### 4.1 订单列表页 (OrderListPage)

**来源 API**: `GET /orders`

```typescript
interface OrderListPageData {
  // 筛选标签
  tabList: {
    key: string;                 // 'all' | 'pending' | 'processing' | 'completed'
    label: string;
    count: number | null;        // 该状态订单数，null 不显示
    isActive: boolean;
  }[];

  // 订单列表
  orderList: OrderListItem[];

  // 加载状态
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;          // 根据筛选条件变化
}

interface OrderListItem {
  // 标识
  id: string;
  displayId: string;             // "订单号: ORDER-20260329-A1B2C3"

  // 状态
  status: OrderStatus;
  statusLabel: string;           // "待支付" | "视频审核中" ...
  statusColor: string;           // 状态对应的颜色
  statusIcon: string | null;     // 状态图标名
  statusDescription: string;     // 状态说明文字

  // 商品信息
  productName: string;
  productImage: string;
  variantDisplay: string | null; // "标准厚度 / 黑色" 或 null
  quantity: number;

  // 价格
  displayTotal: string;          // "$129.00"

  // 时间信息
  createdAtDisplay: string;      // "2026-03-29"
  expiresAtDisplay: string | null;  // 待支付时显示 "剩 23:59"

  // 操作按钮
  actionList: OrderAction[];
}

type OrderAction = {
  type: 'pay' | 'cancel' | 'track' | 'review' | 'reupload' | 'contact' | 'reorder';
  label: string;
  isPrimary: boolean;
  isDanger?: boolean;
};
```

**状态映射表**:

| 订单状态 | statusLabel | statusColor | statusDescription | 可用操作 |
|---------|-------------|-------------|-------------------|----------|
| pending | 待支付 | orange | 请在 24 小时内完成支付 | pay, cancel |
| video_review | 视频审核中 | blue | 正在审核您的足部视频 | contact |
| video_rejected | 视频审核不通过 | red | 视频不符合要求，请重新上传 | reupload, contact |
| modeling | 建模中 | purple | 正在为您定制专属鞋垫 | - |
| production | 生产中 | indigo | 鞋垫正在制作中 | - |
| shipped | 已发货 | blue | 商品已发出 | track, contact |
| delivered | 已送达 | green | 商品已送达 | track |
| completed | 已完成 | green | 订单已完成 | review, reorder |
| cancelled | 已取消 | gray | 订单已取消 | reorder |
| refunding | 退款中 | orange | 正在处理退款 | contact |
| refunded | 已退款 | gray | 退款已完成 | - |

### 4.2 订单详情页 (OrderDetailPage)

**来源 API**: `GET /orders/:id`

```typescript
interface OrderDetailPageData {
  // 订单标识
  id: string;
  displayId: string;
  createdAtDisplay: string;

  // 状态信息
  status: OrderStatus;
  statusLabel: string;
  statusColor: string;
  statusDescription: string;
  statusIcon: string;

  // 进度条 (状态机可视化)
  progressList: OrderProgressStep[];
  currentStepIndex: number;

  // 商品信息
  product: {
    id: string;
    name: string;
    image: string;
    variantDisplay: string | null;
    quantity: number;
    unitPriceDisplay: string;
    subtotalDisplay: string;
  };

  // 价格明细
  priceBreakdown: {
    subtotal: { label: string; value: string };
    shipping: { label: string; value: string; isFree?: boolean };
    discount: { label: string; value: string; couponCode?: string } | null;
    tax: { label: string; value: string };
    total: { label: string; value: string; isBold: true };
  };

  // 视频上传区域 (如果订单需要视频)
  videoSection: VideoSectionData | null;

  // 收货地址
  address: AddressDisplayData;

  // 物流信息 (已发货时)
  shippingInfo: ShippingDisplayData | null;

  // 支付信息
  paymentInfo: {
    methodLabel: string;
    paidAtDisplay: string | null;
  };

  // 操作按钮
  actionList: OrderAction[];

  // 客服入口
  canContactSupport: boolean;
}

interface OrderProgressStep {
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  timestamp: string | null;
  icon: string;
}

interface VideoSectionData {
  isRequired: boolean;
  status: 'waiting' | 'uploading' | 'uploaded' | 'reviewing' | 'approved' | 'rejected';
  statusLabel: string;
  statusDescription: string;
  uploadProgress: number;        // 0-100
  videoThumbnail: string | null;
  canUpload: boolean;
  canReupload: boolean;
  rejectReason: string | null;   // 审核不通过原因
  uploadHint: string;            // 上传提示文字
}

interface AddressDisplayData {
  recipientName: string;
  recipientPhone: string;
  phoneMasked: string;           // "138****8888"
  fullAddress: string;           // 完整地址拼接
  addressLines: string[];        // 多行地址展示
  isDefault: boolean;
  label: string | null;          // "家" | "公司" | null
}

interface ShippingDisplayData {
  carrierName: string;
  trackingNumber: string;
  trackingLink: string | null;
  shippedAtDisplay: string;
  estimatedDelivery: string | null;
  latestStatus: string;
  timeline: ShippingEvent[];
}

interface ShippingEvent {
  time: string;
  date: string;
  status: string;
  location: string;
  isLatest: boolean;
}
```

### 4.3 创建订单页 (OrderCreatePage)

**数据来源**: 商品详情 + 地址列表 + 优惠券列表

```typescript
interface OrderCreatePageData {
  // 商品信息 (来自商品详情)
  product: {
    id: string;
    name: string;
    image: string;
    variantDisplay: string;
    quantity: number;
    priceDisplay: string;
  };

  // 地址选择
  addressSection: {
    hasAddress: boolean;
    selectedAddress: AddressDisplayData | null;
    addressList: AddressDisplayData[];
    showAddressSelector: boolean;
  };

  // 优惠券选择
  couponSection: {
    availableCount: number;
    selectedCoupon: {
      code: string;
      discountDisplay: string;   // "-$20" | "-20%"
      description: string;
    } | null;
    bestCouponHint: string | null;  // "已为您选择最优惠方案"
    couponList: CouponOption[];
  };

  // 邀请码
  referralSection: {
    isVisible: boolean;
    inputValue: string;
    isValidating: boolean;
    validationResult: {
      isValid: boolean;
      referrerName: string | null;
      errorMessage: string | null;
    } | null;
  };

  // 订单备注
  noteInput: {
    value: string;
    maxLength: number;
    currentLength: number;
  };

  // 价格明细
  priceBreakdown: {
    subtotal: { label: string; value: string };
    shipping: { label: string; value: string; isFree: boolean };
    discount: { label: string; value: string; isNegative: true } | null;
    referralDiscount: { label: string; value: string } | null;
    tax: { label: string; value: string };
    total: { label: string; value: string };
    savings: { label: string; value: string } | null;  // 节省金额提示
  };

  // 提交状态
  canSubmit: boolean;
  isSubmitting: boolean;
  submitError: string | null;
}

interface CouponOption {
  id: string;
  code: string;
  title: string;
  description: string;
  discountDisplay: string;
  validPeriodDisplay: string;
  isApplicable: boolean;
  inapplicableReason: string | null;
  isSelected: boolean;
}
```

---

## 5. 用户模块 UI 数据

### 5.1 个人中心页 (ProfilePage)

**来源 API**: `GET /users/me`, `GET /users/me/profile`

```typescript
interface ProfilePageData {
  // 用户信息卡片
  userCard: {
    avatar: string | null;
    displayName: string;
    email: string;
    emailMasked: string;         // "a***@example.com"
    memberSince: string;         // "2026年3月加入"
  };

  // 快捷统计
  quickStats: {
    orderCount: { value: number; label: string; hasPending: boolean };
    couponCount: { value: number; label: string; hasNew: boolean };
    referralCount: { value: number; label: string };
  };

  // 功能菜单
  menuGroups: MenuGroup[];

  // 档案完整度
  profileCompletion: {
    percentage: number;
    missingFields: string[];
    tipMessage: string;
  };
}

interface MenuGroup {
  title: string | null;
  items: MenuItem[];
}

interface MenuItem {
  icon: string;
  label: string;
  badge: string | number | null;
  action: string;
}
```

### 5.2 用户档案编辑页 (ProfileEditPage)

**来源 API**: `GET /users/me/profile`

```typescript
interface ProfileEditPageData {
  // 基础信息
  basicInfo: {
    nickname: {
      value: string;
      maxLength: 50;
      isValid: boolean;
      errorMessage: string | null;
    };
    phone: {
      value: string;
      displayValue: string;      // 格式化后的手机号
      isValid: boolean;
      isVerified: boolean;
    };
  };

  // 鞋码信息
  shoeSize: {
    type: 'us' | 'eu' | 'uk' | 'cm';
    typeOptions: { value: string; label: string }[];
    value: string;
    sizeOptions: string[];       // 根据 type 动态变化
  };

  // 运动习惯
  sportsHabits: {
    primarySport: {
      value: string;
      options: { value: string; label: string; icon: string }[];
    };
    frequency: {
      value: number | null;
      displayText: string;       // "3 次/周"
      options: number[];
    };
    duration: {
      value: number | null;
      displayText: string;       // "60 分钟/次"
      options: number[];
    };
  };

  // 医疗历史
  medicalHistory: {
    hasFootIssues: boolean | null;
    issues: {
      list: string[];
      options: { value: string; label: string }[];
    };
    notes: {
      value: string;
      maxLength: 500;
      currentLength: number;
    };
  };

  // 特殊需求
  specialRequests: {
    value: string;
    maxLength: 500;
    currentLength: number;
    placeholder: string;
  };

  // 保存状态
  hasChanges: boolean;
  isSaving: boolean;
  canSave: boolean;
}
```

---

## 6. 优惠券模块 UI 数据

### 6.1 我的优惠券页 (CouponListPage)

**来源 API**: `GET /coupons`

```typescript
interface CouponListPageData {
  // 标签页
  tabs: {
    key: 'unused' | 'used' | 'expired';
    label: string;
    count: number;
    isActive: boolean;
  }[];

  // 优惠券列表
  couponList: CouponListItem[];

  // 空状态
  isEmpty: boolean;
  emptyIcon: string;
  emptyTitle: string;
  emptyDescription: string;

  // 领取入口
  claimInput: {
    value: string;
    isValidating: boolean;
    errorMessage: string | null;
  };
}

interface CouponListItem {
  id: string;
  code: string;

  // 优惠显示
  discountType: 'percentage' | 'fixed';
  discountValue: string;         // "20%" | "$20"
  discountDescription: string;   // "满 $100 可用" | "无门槛"

  // 适用范围
  applicableScope: string;       // "全场通用" | "仅限运动鞋垫"

  // 有效期
  validPeriodDisplay: string;    // "2026.03.01 - 2026.04.01"
  isExpiringSoon: boolean;       // 7 天内过期
  daysUntilExpire: number | null;

  // 来源
  sourceLabel: string;           // "新用户礼包" | "邀请奖励"

  // 状态
  status: 'unused' | 'used' | 'expired';
  usedAtDisplay: string | null;
  usedOrderId: string | null;

  // 视觉样式
  themeColor: string;
  isSelectable: boolean;
}
```

---

## 7. 地址模块 UI 数据

### 7.1 地址列表页 (AddressListPage)

**来源 API**: `GET /addresses`

```typescript
interface AddressListPageData {
  // 地址列表
  addressList: AddressListItem[];

  // 选择模式 (用于订单页选择地址)
  selectionMode: boolean;
  selectedId: string | null;

  // 空状态
  isEmpty: boolean;

  // 限制提示
  maxAddressCount: number;
  currentCount: number;
  canAddMore: boolean;
}

interface AddressListItem {
  id: string;
  recipientName: string;
  phoneMasked: string;
  fullAddress: string;
  addressSummary: string;        // "北京市朝阳区" (用于缩略显示)
  isDefault: boolean;
  label: 'home' | 'work' | 'other' | null;
  labelDisplay: string | null;   // "家" | "公司" | null

  // 选择状态
  isSelected: boolean;
}
```

### 7.2 地址编辑页 (AddressEditPage)

```typescript
interface AddressEditPageData {
  // 表单模式
  mode: 'create' | 'edit';

  // 表单字段
  form: {
    recipientName: FormField<string>;
    recipientPhone: FormField<string>;
    country: FormField<string>;
    province: FormField<string>;
    city: FormField<string>;
    district: FormField<string>;
    detail: FormField<string>;
    postalCode: FormField<string>;
    isDefault: FormField<boolean>;
    label: FormField<'home' | 'work' | 'other' | null>;
  };

  // 级联选择器数据
  regionOptions: RegionNode[];

  // 验证状态
  isValid: boolean;
  fieldErrors: Record<string, string>;

  // 提交状态
  isSubmitting: boolean;
}

interface FormField<T> {
  value: T;
  dirty: boolean;
  error: string | null;
}

interface RegionNode {
  value: string;
  label: string;
  children?: RegionNode[];
}
```

---

## 8. 邀请模块 UI 数据

### 8.1 邀请好友页 (ReferralPage)

**来源 API**: `GET /users/me/referral-stats`

```typescript
interface ReferralPageData {
  // 邀请码卡片
  referralCode: {
    code: string;
    displayCode: string;         // 格式化显示 "FOOTX - A1B2C3D4"
    canCopy: boolean;
    copySuccess: boolean;
  };

  // 分享链接
  shareLink: {
    url: string;
    shortUrl: string | null;
    canCopy: boolean;
  };

  // 奖励说明
  rewardInfo: {
    title: string;
    description: string;
    couponPreview: {
      discount: string;
      condition: string;
    };
  };

  // 邀请统计
  stats: {
    clickCount: { value: number; label: string };
    registerCount: { value: number; label: string };
    orderCount: { value: number; label: string };  // 转化数
    earnedCount: { value: number; label: string }; // 已获得奖励数
  };

  // 邀请记录
  recordList: ReferralRecordItem[];

  // 分享选项
  shareOptions: {
    type: 'copy' | 'email' | 'sms' | 'social';
    icon: string;
    label: string;
    available: boolean;
  }[];
}

interface ReferralRecordItem {
  id: string;
  status: 'clicked' | 'registered' | 'converted';
  statusLabel: string;
  statusColor: string;
  dateDisplay: string;
  rewardStatus: 'pending' | 'received' | null;
  rewardDisplay: string | null;
}
```

---

## 9. 客服模块 UI 数据

### 9.1 客服聊天页 (SupportChatPage)

**来源 API**: `POST /support/sessions`, `GET /support/sessions/:id/messages`

```typescript
interface SupportChatPageData {
  // 会话信息
  session: {
    id: string;
    status: 'active' | 'closed' | 'transferred';
    type: 'ai' | 'human' | 'mixed';
  };

  // 关联订单 (如果有)
  relatedOrder: {
    id: string;
    displayId: string;
    statusLabel: string;
    productName: string;
    canJump: boolean;
  } | null;

  // 消息列表
  messageList: ChatMessage[];

  // 输入区域
  input: {
    value: string;
    canSend: boolean;
    isSending: boolean;
    hasImage: boolean;
  };

  // 快捷操作
  quickActions: QuickAction[];

  // 转人工
  canTransferToHuman: boolean;
  isTransferring: boolean;
  queueStatus: {
    position: number;
    estimatedWaitMinutes: number;
  } | null;

  // 评价弹窗
  showRatingModal: boolean;
  rating: {
    value: number | null;
    tags: string[];
    tagOptions: string[];
    comment: string;
    canSubmit: boolean;
  };
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'human' | 'system';
  senderName: string;
  senderAvatar: string;
  content: string;
  contentType: 'text' | 'image' | 'order_card' | 'faq_card';

  // 订单卡片 (特殊消息类型)
  orderCard?: {
    orderId: string;
    status: string;
    productName: string;
    total: string;
  };

  // FAQ 卡片
  faqCard?: {
    question: string;
    answer: string;
    isExpanded: boolean;
  };

  // 时间显示
  timeDisplay: string;
  showTime: boolean;             // 是否显示时间分隔

  // 状态
  isRead: boolean;
  sendingStatus: 'sending' | 'sent' | 'failed' | null;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
}
```

### 9.2 FAQ 列表页 (FAQPage)

**来源 API**: `GET /support/faqs`

```typescript
interface FAQPageData {
  // 搜索
  searchInput: {
    value: string;
    placeholder: string;
    results: FAQItem[];
    isSearching: boolean;
  };

  // 分类标签
  categoryList: {
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
  }[];

  // FAQ 列表
  faqList: FAQItem[];

  // 热门问题
  hotQuestions: FAQItem[];
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  answerSummary: string;         // 摘要，用于列表展示
  isExpanded: boolean;
  helpfulCount: number;
  isHelpful: boolean | null;
}
```

---

## 10. 认证模块 UI 数据

### 10.1 登录页 (LoginPage)

**来源 API**: `POST /auth/verification-code`, `POST /auth/login/email`

```typescript
interface LoginPageData {
  // 登录方式
  loginMethod: 'email' | 'google';

  // 邮箱登录表单
  emailForm: {
    email: {
      value: string;
      isValid: boolean;
      errorMessage: string | null;
    };
    code: {
      value: string;
      length: number;              // 6位
      isValid: boolean;
    };
    canSendCode: boolean;
    countdown: number;             // 倒计时秒数
    isSending: boolean;
    isLoggingIn: boolean;
  };

  // 邀请码 (可选)
  referralCode: {
    value: string;
    isVisible: boolean;
    isValid: boolean | null;
    referrerName: string | null;
  };

  // 用户协议
  agreements: {
    terms: { required: true; checked: boolean };
    privacy: { required: true; checked: boolean };
    marketing: { required: false; checked: boolean };
    allChecked: boolean;
  };

  // 登录结果
  loginResult: {
    isNewUser: boolean;
    welcomeMessage: string;
    referralReward: {
      received: boolean;
      couponCode: string;
      discount: string;
    } | null;
  } | null;
}
```

---

## 11. 数据转换工具函数

### 11.1 通用格式化函数

```typescript
// 价格格式化 (分 → 元)
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// 日期格式化
function formatDate(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

function formatDateTime(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

// 倒计时格式化 (秒 → 分:秒)
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 手机号脱敏
function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// 邮箱脱敏
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name[0]}***@${domain}`;
}
```

### 11.2 订单相关转换

```typescript
// 计算订单可执行操作
function getOrderActions(order: Order): OrderAction[] {
  const actions: OrderAction[] = [];

  switch (order.status) {
    case 'pending':
      actions.push({ type: 'pay', label: '立即支付', isPrimary: true });
      actions.push({ type: 'cancel', label: '取消订单', isPrimary: false });
      break;
    case 'video_rejected':
      actions.push({ type: 'reupload', label: '重新上传视频', isPrimary: true });
      actions.push({ type: 'contact', label: '联系客服', isPrimary: false });
      break;
    case 'shipped':
    case 'delivered':
      actions.push({ type: 'track', label: '查看物流', isPrimary: true });
      actions.push({ type: 'contact', label: '联系客服', isPrimary: false });
      break;
    case 'completed':
      actions.push({ type: 'reorder', label: '再次购买', isPrimary: true });
      actions.push({ type: 'review', label: '评价', isPrimary: false });
      break;
  }

  return actions;
}

// 计算订单进度步骤
function getOrderProgress(order: Order): OrderProgressStep[] {
  const steps = [
    { title: '提交订单', description: '订单已创建', icon: 'file-text' },
    { title: '视频审核', description: '审核足部视频', icon: 'video' },
    { title: '3D建模', description: '定制专属鞋垫', icon: 'box' },
    { title: '生产制作', description: '工厂加工中', icon: 'tool' },
    { title: '发货配送', description: '快递运输中', icon: 'truck' },
    { title: '订单完成', description: '交易完成', icon: 'check-circle' },
  ];

  // 根据订单状态确定当前步骤
  const statusIndexMap: Record<OrderStatus, number> = {
    pending: 0,
    video_review: 1,
    video_rejected: 1,
    modeling: 2,
    production: 3,
    shipped: 4,
    delivered: 4,
    completed: 5,
    cancelled: -1,
    refunding: -1,
    refunded: -1,
  };

  const currentIndex = statusIndexMap[order.status];

  return steps.map((step, index) => ({
    ...step,
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'pending',
    timestamp: null, // 从 order.progress 中获取
  }));
}
```

---

## 12. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v2.0 | 2026-03-29 | 重构为前端 ViewModel → UI 数据契约 | 技术团队 |
| v1.0 | 2026-03-29 | 初始版本 (设计系统规范) | 技术团队 |
