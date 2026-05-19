# Foot X 视频拍摄与上传技术方案

**版本**: v1.0
**日期**: 2026-03-30
**状态**: 已确定

---

## 1. 方案概述

本文档记录 Foot X 应用中足部视频拍摄、压缩与上传的技术方案决策过程。

### 核心决策

| 项目 | 决策 |
|------|------|
| 上传方式 | **客户端直传 Supabase Storage** |
| 压缩位置 | **客户端录制时压缩** |
| 压缩方案 | **MediaRecorder 录制参数优化** |
| 断点续传 | **Supabase Storage SDK 原生支持** |

---

## 2. 方案对比

### 2.1 上传方式对比

| 维度 | 方案 A: 客户端直传 | 方案 B: 服务端中转 |
|------|-------------------|-------------------|
| **架构** | 客户端 → Supabase Storage | 客户端 → Edge Function → Storage |
| **服务端负载** | 无 | 需要处理上传流 |
| **延迟** | 低（直连） | 高一跳（中转） |
| **安全性** | 临时签名 URL | 服务端控制更细 |
| **断点续传** | SDK 原生支持 | 需自行实现 |
| **预处理能力** | 弱（仅客户端） | 强（服务端可转码） |
| **复杂度** | 低 | 高 |

**结论**: 选择方案 A（客户端直传），利用 Supabase 的临时上传 URL 机制，服务端仅负责生成签名 URL 和记录元数据。

---

## 3. 客户端压缩方案

### 3.1 压缩方案对比

| 方案 | 原理 | 压缩率 | 质量 | 复杂度 | 适用场景 |
|------|------|--------|------|--------|----------|
| **MediaRecorder 参数** | 录制时设置比特率/分辨率 | 中等 (4-6x) | 可控 | 低 | **推荐首选** |
| **FFmpeg.wasm** | 浏览器内转码 | 高 (8-10x) | 专业级 | 高 | 需要极致压缩时 |
| **Canvas 抽帧** | 提取关键帧重编码 | 低 (2-3x) | 损失大 | 中 | 不推荐 |

### 3.2 推荐方案：MediaRecorder 参数优化

```typescript
// 1. 获取摄像头时设置约束（限制分辨率）
const constraints = {
  video: {
    width: { ideal: 1280 },      // 限制为 720p
    height: { ideal: 720 },
    frameRate: { ideal: 30 }     // 30fps 足够分析步态
  },
  audio: false                    // 足部视频不需要声音
};

const stream = await navigator.mediaDevices.getUserMedia(constraints);

// 2. 录制时设置比特率（关键压缩参数）
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9,opus',
  videoBitsPerSecond: 2_000_000  // 2Mbps，平衡质量与大小
});

// 3. 录制数据处理
const chunks: Blob[] = [];
mediaRecorder.ondataavailable = (e) => {
  if (e.data.size > 0) chunks.push(e.data);
};

mediaRecorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  // 预期大小：15-25MB（原始约 100MB）
};
```

### 3.3 压缩参数调优建议

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| `videoBitsPerSecond` | 2_000_000 - 3_000_000 | 2-3Mbps，足够清晰 |
| 分辨率 | 1280x720 | 720p 足够足部分析 |
| 帧率 | 30fps | 步态分析不需要高帧率 |
| 编码格式 | VP9 | 比 H.264 压缩率更高 |
| 音频 | 禁用 | 减少约 10-20% 体积 |

**压缩效果预估**:
- 原始 1080p 无压缩：~100MB/20秒
- 优化参数后：~15-25MB/20秒
- 压缩比：约 4-6 倍

---

## 4. 完整上传流程

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端拍摄阶段                           │
├─────────────────────────────────────────────────────────────┤
│  1. 用户进入视频拍摄页面                                       │
│     ↓                                                       │
│  2. 请求摄像头权限，设置分辨率约束 (1280x720)                   │
│     ↓                                                       │
│  3. 显示拍摄引导（光线、角度、姿势提示）                        │
│     ↓                                                       │
│  4. 用户开始录制，MediaRecorder 以 2Mbps 压缩录制              │
│     ↓                                                       │
│  5. 录制完成，本地预览（可选择重拍）                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      上传阶段                                 │
├─────────────────────────────────────────────────────────────┤
│  6. 向后端申请上传凭证 (POST /videos/upload-token)             │
│     请求体: { orderId, fileName, fileSize, contentType }      │
│     ↓                                                       │
│  7. 后端生成 Supabase 临时上传 URL（带签名，限时）              │
│     响应: { videoId, uploadUrl, headers, expiresIn }          │
│     ↓                                                       │
│  8. 客户端使用 Supabase SDK 断点续传                          │
│     - 支持网络中断恢复                                        │
│     - 支持上传进度回调                                        │
│     ↓                                                       │
│  9. 上传完成，回调后端确认                                     │
│     POST /videos/:id/confirm-upload                           │
│     { storageKey, fileSize, duration, resolution }            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端处理阶段                             │
├─────────────────────────────────────────────────────────────┤
│  10. 更新视频状态为 "pending_review"                          │
│     ↓                                                       │
│  11. 触发视频审核队列（人工审核）                              │
│     ↓                                                       │
│  12. 审核结果通知用户（通过/需重拍）                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 关键代码示例

### 5.1 前端：拍摄与上传

```typescript
// VideoCaptureService.ts
class VideoCaptureService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  // 开始录制
  async startRecording(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'environment'  // 优先使用后置摄像头
      },
      audio: false
    });

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2_000_000
    });

    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(100);  // 每 100ms 收集数据
  }

  // 停止录制
  stopRecording(): Blob {
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };
      this.mediaRecorder!.stop();
      this.stream?.getTracks().forEach(t => t.stop());
    });
  }

  // 上传到 Supabase
  async uploadVideo(
    blob: Blob,
    orderId: string,
    onProgress: (percent: number) => void
  ): Promise<string> {
    // 1. 获取上传凭证
    const { videoId, uploadUrl } = await fetch('/api/videos/upload-token', {
      method: 'POST',
      body: JSON.stringify({
        orderId,
        fileName: `foot-video-${Date.now()}.webm`,
        fileSize: blob.size,
        contentType: 'video/webm'
      })
    }).then(r => r.json());

    // 2. 使用 Supabase SDK 上传（支持断点续传）
    const { data, error } = await supabase.storage
      .from('foot-videos')
      .uploadToSignedUrl(uploadUrl, blob, {
        contentType: 'video/webm',
        upsert: false,
        onProgress: (e) => {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      });

    if (error) throw error;

    // 3. 确认上传完成
    await fetch(`/api/videos/${videoId}/confirm-upload`, {
      method: 'POST',
      body: JSON.stringify({
        storageKey: data!.path,
        fileSize: blob.size,
        duration: 20,  // 从录制计时获取
        resolution: '1280x720'
      })
    });

    return videoId;
  }
}
```

### 5.2 后端：生成上传凭证（Supabase Edge Function）

```typescript
// supabase/functions/videos/upload-token/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { orderId, fileName, fileSize, contentType } = await req.json();

  // 验证订单归属
  const user = await getUserFromJWT(req);
  const order = await verifyOrderOwnership(orderId, user.id);

  // 创建视频记录
  const { data: video, error } = await supabase
    .from('foot_videos')
    .insert({
      order_id: orderId,
      user_id: user.id,
      status: 'uploading',
      upload: { method: 'camera', progress: 0, isResumed: false }
    })
    .select()
    .single();

  if (error) throw error;

  // 生成临时上传 URL（有效期 15 分钟）
  const { data: signedUrl, error: urlError } = await supabase
    .storage
    .from('foot-videos')
    .createSignedUploadUrl(`${user.id}/${video.id}/${fileName}`);

  if (urlError) throw urlError;

  return new Response(JSON.stringify({
    videoId: video.id,
    uploadUrl: signedUrl.signedUrl,
    headers: { 'content-type': contentType },
    expiresIn: 900  // 15 分钟
  }));
});
```

---

## 6. 备选方案：服务端异步压缩

如果客户端压缩后的视频仍然过大，可以实施第二阶段方案：

```
视频上传完成
    ↓
触发 Background Function
    ↓
使用 FFmpeg 转码压缩
    ↓
替换原文件或保存多版本
    ↓
更新视频记录（存储路径、多版本信息）
```

此方案优点：
- 不增加客户端负担
- 可以使用专业编码器（FFmpeg）
- 可以保存多版本（分析用高清、存档用标清）

---

## 7. 相关文档

- [PRD.md](./PRD.md) - 产品需求文档
- [data-entities.md](./data-entities.md) - 数据实体定义（包含 FootVideo 实体）
- [database-schema.md](./database-schema.md) - 数据库表结构
- [api-contract.md](./api-contract.md) - API 接口契约

---

## 8. 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-30 | 初始版本，确定客户端直传 + MediaRecorder 压缩方案 | 技术团队 |
