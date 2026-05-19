# Foot X 前端架构

**文档版本**: v1.0
**最后更新**: 2026-03-30
**状态**: 已确定

---

## 1. 前端架构概述

### 1.1 设计原则

Foot X 前端架构遵循以下核心设计原则：

1. **移动优先**: 针对移动端用户优化，同时支持桌面访问
2. **渐进增强**: 基础功能无 JS 可用，增强功能依赖现代 API
3. **性能优先**: 代码分割、懒加载、资源优化
4. **类型安全**: TypeScript 全类型覆盖
5. **组件化**: 可复用、可组合的组件体系

### 1.2 技术栈选型理由

| 技术 | 选择理由 |
|------|---------|
| **React 18** | 成熟生态，并发特性，大型社区 |
| **Vite** | 极速开发体验，优化的生产构建 |
| **Tailwind CSS** | 原子化样式，设计系统一致性，开发效率 |
| **shadcn/ui + Radix UI** | 无障碍支持，可定制，基于 Radix UI |
| **MUI (Material UI)** | 补充组件库，图标和高级组件支持 |
| **React Router 7** | 声明式路由，数据加载，代码分割 |

---

## 2. 项目结构

### 2.1 目录组织

```
packages/frontend/
├── src/
│   ├── app/                    # 主应用代码
│   │   ├── App.tsx             # 根组件
│   │   ├── routes.tsx          # 路由配置
│   │   │
│   │   ├── pages/              # 页面组件
│   │   │   ├── HomePage.tsx
│   │   │   ├── ProductDetailPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── VideoCapturePage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── CheckoutSuccessPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── OrderDetailPage.tsx
│   │   │   ├── CouponsPage.tsx
│   │   │   ├── ReferralPage.tsx
│   │   │   ├── SupportPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   ├── components/         # 共享组件
│   │   │   ├── Layout.tsx      # 主布局
│   │   │   ├── Header.tsx      # 顶部导航
│   │   │   ├── BottomNav.tsx   # 底部导航
│   │   │   ├── ProductCard.tsx # 商品卡片
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx
│   │   │   └── ui/             # shadcn/ui 组件
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── form.tsx
│   │   │       ├── input.tsx
│   │   │       ├── select.tsx
│   │   │       ├── utils.ts
│   │   │       └── ...
│   │   │
│   │   ├── context/            # React Context
│   │   │   ├── AppContext.tsx      # 全局状态
│   │   │   └── I18nContext.tsx     # 国际化
│   │   │
│   │   ├── types/              # TypeScript 类型
│   │   │   └── index.ts
│   │   │
│   │   └── data/               # 静态数据
│   │       └── products.ts
│   │
│   ├── main.tsx                # 入口文件
│   │
│   ├── styles/                 # 全局样式
│   │   ├── index.css
│   │   ├── theme.css
│   │   ├── tailwind.css
│   │   └── fonts.css
│   │
│   └── imports/                # 导入的文档
│       ├── PRD.md
│       ├── state-machine-design.md
│       └── ui-contract.md
│
├── index.html
├── vite.config.ts
├── postcss.config.mjs
└── package.json
```

### 2.2 文件组织原则

#### 按功能分组（Feature-based）

```
推荐：按功能组织
src/
├── features/
│   ├── auth/           # 认证功能
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── orders/         # 订单功能
│   └── videos/         # 视频功能

不推荐：按类型组织
src/
├── components/         # 所有组件混在一起
├── hooks/
└── services/
```

#### 组件文件结构

```
ComponentName/
├── index.tsx           # 组件入口
├── ComponentName.tsx   # 组件主体
├── ComponentName.test.tsx  # 测试
├── types.ts            # 组件专属类型
├── utils.ts            # 组件工具函数
└── styles.module.css   # 组件样式（如需要）
```

---

## 3. 路由架构

### 3.1 路由配置

```typescript
// src/app/routes.tsx
import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VideoCapturePage } from './pages/VideoCapturePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { CouponsPage } from './pages/CouponsPage';
import { ReferralPage } from './pages/ReferralPage';
import { SupportPage } from './pages/SupportPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: 'product/:productId', Component: ProductDetailPage },
      { path: 'orders', Component: OrdersPage },
      { path: 'order/:orderId', Component: OrderDetailPage },
      { path: 'coupons', Component: CouponsPage },
      { path: 'referral', Component: ReferralPage },
      { path: 'support', Component: SupportPage },
      { path: 'profile', Component: ProfilePage },
      { path: '*', Component: NotFoundPage }
    ]
  },
  {
    path: '/login',
    Component: LoginPage
  },
  {
    path: '/register',
    Component: RegisterPage
  },
  {
    path: '/video-capture',
    Component: VideoCapturePage
  },
  {
    path: '/checkout/:orderId',
    Component: CheckoutPage
  },
  {
    path: '/checkout/success/:orderId',
    Component: CheckoutSuccessPage
  }
]);
```

### 3.2 路由设计原则

```
┌─────────────────────────────────────────────────────────────┐
│                     路由层级设计                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layout 路由 (带导航)                                        │
│  ├── /                  HomePage                            │
│  ├── /product/:id       ProductDetailPage                   │
│  ├── /orders            OrdersPage                          │
│  ├── /order/:id         OrderDetailPage                     │
│  ├── /coupons           CouponsPage                         │
│  ├── /referral          ReferralPage                        │
│  ├── /support           SupportPage                         │
│  └── /profile           ProfilePage                         │
│                                                             │
│  独立页面 (无导航)                                           │
│  ├── /login             LoginPage                           │
│  ├── /register          RegisterPage                        │
│  ├── /video-capture     VideoCapturePage                    │
│  ├── /checkout/:id      CheckoutPage                        │
│  └── /checkout/success/:id CheckoutSuccessPage              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 代码分割

```typescript
// 使用 React.lazy 进行代码分割
import { lazy, Suspense } from 'react';

const VideoCapturePage = lazy(() => import('./pages/VideoCapturePage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));

// 路由配置中使用
{
  path: '/video-capture',
  element: (
    <Suspense fallback={<PageLoading />}>
      <VideoCapturePage />
    </Suspense>
  )
}
```

---

## 4. 状态管理

### 4.1 状态分层

```
┌─────────────────────────────────────────────────────────────┐
│                      状态分层设计                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Server State (服务端状态)                           │   │
│  │  • 用户数据                                          │   │
│  │  • 订单数据                                          │   │
│  │  • 商品数据                                          │   │
│  │  管理: React Query / SWR (待定)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Global Client State (全局客户端状态)                │   │
│  │  • 主题设置 (深色/浅色)                              │   │
│  │  • 语言设置                                          │   │
│  │  • 全局 UI 状态 (toast, modal)                      │   │
│  │  管理: React Context                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Local State (局部状态)                              │   │
│  │  • 表单输入                                          │   │
│  │  • 组件展开/折叠                                     │   │
│  │  • 当前选中项                                        │   │
│  │  管理: useState / useReducer                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  URL State (URL 状态)                                │   │
│  │  • 当前页面                                          │   │
│  │  • 筛选条件                                          │   │
│  │  • 分页参数                                          │   │
│  │  管理: React Router useSearchParams                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Persistent State (持久化状态)                       │   │
│  │  • 登录 Token                                        │   │
│  │  • 用户偏好设置                                      │   │
│  │  管理: localStorage / cookies                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Context 实现

```typescript
// src/app/context/AppContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

interface AppState {
  theme: 'light' | 'dark';
  language: string;
  isLoading: boolean;
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  } | null;
}

type AppAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SHOW_TOAST'; payload: { message: string; type: 'success' | 'error' | 'info' } }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  theme: 'light',
  language: 'zh-CN',
  isLoading: false,
  toast: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SHOW_TOAST':
      return { ...state, toast: { ...action.payload, visible: true } };
    case 'HIDE_TOAST':
      return { ...state, toast: state.toast ? { ...state.toast, visible: false } : null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// 便捷 hooks
export function useToast() {
  const { dispatch } = useApp();
  return {
    show: (message: string, type: 'success' | 'error' | 'info' = 'info') =>
      dispatch({ type: 'SHOW_TOAST', payload: { message, type } }),
    hide: () => dispatch({ type: 'HIDE_TOAST' })
  };
}
```

---

## 5. 组件规范

### 5.1 组件分类

| 类型 | 位置 | 说明 | 示例 |
|------|------|------|------|
| **UI 组件** | `components/ui/` | 纯展示，无业务逻辑 | Button, Card, Input |
| **布局组件** | `components/layout/` | 页面结构相关 | Header, Footer, Layout |
| **业务组件** | `components/business/` | 包含业务逻辑 | ProductCard, OrderCard |
| **页面组件** | `pages/` | 路由级组件 | HomePage, OrdersPage |
| **反馈组件** | `components/feedback/` | 状态反馈 | Loading, ErrorBoundary |

### 5.2 组件编写规范

```typescript
// 推荐：函数组件 + TypeScript 接口
import { useState } from 'react';
import { cn } from '@/lib/utils';

// 1. 接口定义
interface OrderCardProps {
  order: Order;
  onCancel?: (orderId: string) => void;
  className?: string;
}

// 2. 组件定义
export function OrderCard({ order, onCancel, className }: OrderCardProps) {
  // 3. 状态定义
  const [isExpanded, setIsExpanded] = useState(false);

  // 4. 事件处理
  const handleCancel = () => {
    if (onCancel) {
      onCancel(order.id);
    }
  };

  // 5. 渲染
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>订单 #{order.id}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 内容 */}
      </CardContent>
      {onCancel && (
        <CardFooter>
          <Button onClick={handleCancel} variant="destructive">
            取消订单
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// 6. 默认导出（可选）
export default OrderCard;
```

### 5.3 样式规范

```typescript
// 使用 Tailwind 和 cn 工具
import { cn } from '@/lib/utils';

// 基础样式
className="flex items-center justify-between p-4 bg-white rounded-lg shadow"

// 条件样式
className={cn(
  'flex items-center justify-between p-4 rounded-lg',
  isActive && 'bg-blue-50 border-blue-200',
  !isActive && 'bg-white',
  isDisabled && 'opacity-50 cursor-not-allowed'
)}

// 响应式
className="w-full md:w-1/2 lg:w-1/3 px-4 py-2 text-sm md:text-base"

// 变体组件（使用 cva）
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent hover:text-accent-foreground'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);
```

---

## 6. 视频录制模块

### 6.1 模块职责

视频录制是 Foot X 的核心功能，模块职责：
- 调用设备摄像头
- 录制足部行走视频
- 录制时实时压缩
- 预览和重拍
- 上传到 Supabase Storage

### 6.2 核心实现

```typescript
// src/app/hooks/useVideoRecorder.ts
import { useState, useRef, useCallback } from 'react';

interface UseVideoRecorderOptions {
  maxDuration?: number;      // 最大录制时长（秒）
  videoBitsPerSecond?: number; // 压缩比特率
  onError?: (error: Error) => void;
}

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isPreviewing: boolean;
  recordedBlob: Blob | null;
  duration: number;
  error: Error | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  retake: () => void;
  getBlob: () => Blob | null;
}

export function useVideoRecorder(
  options: UseVideoRecorderOptions = {}
): UseVideoRecorderReturn {
  const {
    maxDuration = 20,
    videoBitsPerSecond = 2_000_000,
    onError
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      setDuration(0);

      // 1. 获取摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'environment' // 优先后置摄像头
        },
        audio: false
      });
      streamRef.current = stream;

      // 2. 创建 MediaRecorder，设置压缩参数
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond
      });
      mediaRecorderRef.current = mediaRecorder;

      // 3. 收集数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 4. 录制结束处理
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);
        setIsPreviewing(true);

        // 停止摄像头
        stream.getTracks().forEach(track => track.stop());
      };

      // 5. 开始录制
      mediaRecorder.start(100); // 每 100ms 收集一次
      setIsRecording(true);

      // 6. 计时器
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('录制启动失败');
      setError(error);
      onError?.(error);
    }
  }, [maxDuration, videoBitsPerSecond, onError]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const retake = useCallback(() => {
    setRecordedBlob(null);
    setIsPreviewing(false);
    setDuration(0);
    chunksRef.current = [];
  }, []);

  const getBlob = useCallback(() => recordedBlob, [recordedBlob]);

  return {
    isRecording,
    isPreviewing,
    recordedBlob,
    duration,
    error,
    startRecording,
    stopRecording,
    retake,
    getBlob
  };
}
```

---

## 7. 国际化 (i18n)

国际化采用自建 I18nContext，内联翻译字典，支持中英文切换，语言偏好持久化到 localStorage。

### 7.1 实现

```typescript
// src/app/context/I18nContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'zh';

const translations = {
  en: { /* 英文翻译字典 */ },
  zh: { /* 中文翻译字典 */ }
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('footx_language');
    return (saved as Language) || 'en';
  });

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) value = value?.[k];
    return value || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
```

### 7.2 使用

```typescript
import { useI18n } from '../context/I18nContext';

function OrderCard({ order }: { order: Order }) {
  const { t } = useI18n();

  return (
    <div>
      <h3>{t('orderNumber')} #{order.id}</h3>
      <p>{t(order.status)}</p>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

---

## 8. 性能优化

### 8.1 代码分割

```typescript
// 路由级代码分割
const VideoCapturePage = lazy(() => import('./pages/VideoCapturePage'));

// 组件级代码分割（大型组件）
const HeavyChart = lazy(() => import('./components/HeavyChart'));
```

### 8.2 图片优化

```typescript
// 使用响应式图片
<img
  srcSet="
    /image-400w.jpg 400w,
    /image-800w.jpg 800w,
    /image-1200w.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  src="/image-800w.jpg"
  alt="描述"
  loading="lazy"
/>
```

### 8.3 缓存策略

```typescript
// 使用 SWR 或 React Query 缓存服务端数据
const { data: orders } = useSWR('/api/orders', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 5000
});
```

---

## 9. 相关文档

- [overview.md](./overview.md) - 架构总览
- [backend.md](./backend.md) - 后端架构
- [data.md](./data.md) - 数据架构
- [../video-upload-solution.md](../video-upload-solution.md) - 视频上传方案

---

## 10. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本 | 技术团队 |
