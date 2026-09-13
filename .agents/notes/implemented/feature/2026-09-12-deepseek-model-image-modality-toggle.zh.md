# Agent Note: 直接 DeepSeek 目录编辑器中的图片支持开关

Status: implemented

[English](2026-09-12-deepseek-model-image-modality-toggle.md) | 中文

## 问题

直接 DeepSeek 适配器的目录编辑器（`DeepSeekModelsEditor`）只编辑 id、显示名、上下文窗口与输出上限。接受图片的 DeepSeek 端点无法从这个编辑器里声明这一点，尽管它的行携带同一份模态列表（[pi-ai 路由默认值](../../archived/architecture/2026-08-12-pi-ai-route-default-input-modalities.md) 确立的 `inputModalities`，或 OpenAI 风格的 `input`），而且设置-模型页已经为 pi-ai 提供商档案（`ModelListEditor`）提供了等价开关。

## 决策

每个 DeepSeek 目录行在其展开区携带 `modelImageSupport` 复选框，无障碍名称由行的标签与序号组成。`imagesSupported(model)` 在该行的模态数组包含 `image` 时返回 true。开关把 `['text', 'image']` 或 `['text']` 写入该行已经声明的那个字段——该行的 `input` 是数组时写 `input`，否则写 `inputModalities`——因此保存绝不会把行在两种写法之间迁移，而两者都未声明的行会得到 `inputModalities`。`CatalogField` 接受两个字段名，使既有的 `update()`/`onChange` 路径能写入它们，写入仍是带修订检查的整数组 `set`，作用于 `['models']`。

## 曾考虑的替代方案

**用两个复选框直接写模态数组。** 否决：pi-ai 编辑器的开关恰好只写这两个数组，而自由形式的编辑器会容许 `[]` 与仅图片的行，本仓库没有任何写入路径会产生这些状态。

**始终写入 `inputModalities`。** 否决：声明了 OpenAI 风格 `input` 的行会在用户第一次触动开关时改变写法。

**从模型 id 推断图片支持。** 否决：目录由用户编辑，id 并不能说明其背后端点接受什么。

## 后果

所得：具备图片能力的 DeepSeek 端点可以在设置页声明与更正，无需手写设置镜像。代价：模态列表现在由客户端目录编辑器写入，因此用户从未打开过的目录会保持它原有的声明，包括某个实际提供图片、却仍读作纯文本的条目。

该行为由 `ModelsSection` 客户端规格钉住：`imagesSupported` 覆盖两个字段名，开关的写入经 `mutate` 表现为作用于 `['models']` 的单个 `set`，并携带 `expectedRevision: 0`。

## 已知限制与暂缓事项

同时声明两个字段的行，其复选框状态来自 `inputModalities`（`imagesSupported` 先检查该名字），而开关写入 `input`，因此在该行上复选框看起来不会变化。没有任何随附条目同时声明两者，且 pi-ai 编辑器的读取顺序偏好相反的名字，所以两个编辑器对同时声明的行给出不同结果。
