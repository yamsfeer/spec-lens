# Foot X 用户流程图 (User Flow)

## 完整用户操作流程

```mermaid
flowchart TD
    %% 定义样式
    classDef startEnd fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef decision fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef support fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    %% ========== 阶段一：发现与注册 ==========
    Start([用户访问网站]):::startEnd --> Landing[首页/落地页<br/>• 价值主张展示<br/>• 商品介绍<br/>• 首单优惠弹窗]:::process

    Landing --> Browse[浏览商品详情<br/>• 运动款/日常款/医疗款<br/>• 定制流程说明<br/>• 用户评价]:::process

    Browse --> LoginCheck{是否已登录?}:::decision

    LoginCheck -->|否| Register[注册/登录<br/>• 邮箱验证码<br/>• Google OAuth<br/>• 邀请码输入]:::process
    LoginCheck -->|是| VideoStart[开始定制流程]:::success
    Register --> VideoStart

    %% ========== 阶段二：定制与下单 ==========
    VideoStart --> Guide[拍摄引导页<br/>• 环境要求说明<br/>• 示例视频播放]:::process

    Guide --> Record[录制足部视频<br/>• 15-20秒慢走<br/>• 实时预览]:::process

    Record --> QualityCheck{视频<br/>质量检查}:::decision
    QualityCheck -->|不满意| ReRecord[重新拍摄]:::process
    ReRecord --> Record

    QualityCheck -->|满意| Upload[上传视频<br/>• 等待人工审核<br/>• 预计24小时内完成]:::process

    Upload --> Form[填写足部信息<br/>• 既往伤病<br/>• 运动习惯<br/>• 鞋码]:::process

    Form --> Address[地址管理<br/>• 选择/新增地址<br/>• 国际地址支持]:::process

    Address --> Coupon[优惠券与邀请码<br/>• 选择可用优惠券<br/>• 输入邀请码]:::process

    Coupon --> Checkout[订单确认<br/>• Stripe Checkout支付<br/>• 安全支付标识]:::process

    Checkout --> PayResult{支付结果}:::decision
    PayResult -->|失败| Retry[重新支付<br/>• 15分钟订单保留]:::process
    Retry --> Checkout

    PayResult -->|成功| PaySuccess[支付成功页<br/>• 订单确认<br/>• 展示获得优惠券]:::success

    %% ========== 阶段三：订单追踪与复购 ==========
    PaySuccess --> OrderTrack[订单追踪<br/>查看订单状态]:::process

    OrderTrack --> Status{订单状态}:::decision
    Status -->|视频审核中| Status1[检查视频质量]:::process
    Status -->|建模中| Status2[生成鞋垫模型]:::process
    Status -->|生产中| Status3[手工制作鞋垫]:::process
    Status -->|已发货| Status4[物流追踪]:::process
    Status -->|已完成| Status5[订单完成]:::success

    Status5 --> Review[评价订单]:::process
    Review --> Rebuy{复购意向}:::decision
    Rebuy -->|是| VideoStart
    Rebuy -->|否| Invite[邀请好友<br/>• 生成邀请链接<br/>• 查看邀请统计<br/>• 获得奖励券]:::process

    %% ========== 阶段四：客服支持 ==========
    Landing -.->|随时可访问| CSButton[悬浮客服按钮]:::support
    VideoStart -.->|随时可访问| CSButton
    OrderTrack -.->|随时可访问| CSButton

    CSButton --> AIChat[AI智能客服<br/>• FAQ自动回答<br/>• 常见问题快捷入口]:::support

    AIChat --> HumanCheck{是否解决问题?}:::decision
    HumanCheck -->|否| HumanCS[转人工客服<br/>• 携带用户上下文<br/>• WhatsApp联系]:::support
    HumanCheck -->|是| EndChat[结束对话]:::startEnd

    HumanCS --> EndChat

    %% ========== 后台管理流程 ==========
    subgraph Admin[后台管理系统]
        Admin1[订单管理<br/>• 视频审核队列<br/>• 状态变更<br/>• 订单修改]:::process
        Admin2[用户管理<br/>• 用户标签<br/>• 流量统计]:::process
        Admin3[优惠券管理<br/>• 金额/有效期配置<br/>• 转介绍统计]:::process
        Admin4[客服工作台<br/>• AI对话记录<br/>• 知识库管理]:::support
    end

    Upload -.-> Admin1
    OrderTrack -.-> Admin1

    style Admin fill:#f5f5f5,stroke:#616161,stroke-width:2px,stroke-dasharray: 5 5
```

---

## 流程说明

| 阶段 | 核心用户目标 | 关键决策点 |
|------|-------------|-----------|
| **发现与注册** | 了解产品价值，判断是否适合自己 | 首单优惠弹窗引导注册 |
| **定制与下单** | 拍摄合格视频，完成定制订单 | 视频质量检查 → 支付成功 |
| **订单追踪** | 了解订单处理进度，等待收货 | 5个状态节点的可视化展示 |
| **客服支持** | 快速获得问题解答 | AI客服 → 人工客服的转接机制 |

## 样式定义

- 🔵 **蓝色节点**: 开始/结束节点
- 🟠 **橙色节点**: 用户操作/处理节点
- 🟣 **紫色节点**: 决策判断节点
- 🟢 **绿色节点**: 成功完成节点
- 🔴 **粉色节点**: 客服支持节点
- ➡️ **实线箭头**: 主流程路径
- ➡️ **虚线箭头**: 客服入口（随时可访问）

## 对应 PRD 章节

- 阶段一: [1.1 浏览商品](./PRD.md#用户任务-11浏览商品)、[1.2 注册/登录](./PRD.md#用户任务-12注册登录)
- 阶段二: [2.1 足部视频采集](./PRD.md#用户任务-21足部视频采集)、[2.5 支付](./PRD.md#用户任务-25支付)
- 阶段三: [3.1 查看订单](./PRD.md#用户任务-31查看订单)、[3.3 邀请好友](./PRD.md#用户任务-33邀请好友)
- 阶段四: [4.1 智能客服咨询](./PRD.md#用户任务-41智能客服咨询)、[4.2 人工客服支持](./PRD.md#用户任务-42人工客服支持)
- 后台管理: [5.1-5.5 后台管理功能](./PRD.md#阶段五后台管理)

---

*文档版本: v1.0*
*创建日期: 2026-03-28*
*对应 PRD: v1.0*
