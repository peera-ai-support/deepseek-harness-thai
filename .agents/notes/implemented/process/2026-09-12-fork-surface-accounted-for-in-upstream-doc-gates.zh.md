# Agent Note: fork 独有界面在上游文档门禁内被记账

Status: implemented

[English](2026-09-12-fork-surface-accounted-for-in-upstream-doc-gates.md) | 中文

## 问题

fork 增加的界面是上游文档门禁不认识的，而这些门禁是 fail-closed 的。`packages/mcp/mcp-client/src/status.ts` 发布了 `ctx.mcpStatus`——Cordis catalog 的分区检查能看到该 Context 键已声明、却没有任何渲染位置，因此 `gen-cordis-catalog --check` 直接抛错而不是报出陈旧。`packages/session/session-turn-outline` 沿用上游 README 原文，但 fork 手中的 `verify-package-readme-model-experience.ts` 比该包更早（受审计包 130 个，上游为 158 个），所以检查器没有它的 Model Experience 句式条目。两处失败都来自 fork 本身，而非本次待审改动，且都阻塞 `pnpm run doc-sync`。

## 决策

每个 fork 可见的界面都在已经拥有它的那个门禁内部记账，就在该门禁保存登记表的位置：

- `SERVICE_WALK_EXEMPTIONS` 增加 `mcpStatus`，指名 `packages/mcp/mcp-client/README.md` 为文档归属方，并且该 README 现在记录了这个 store，使被指名的归属方真实存在。
- `SENTENCE_MODEL_EXPERIENCE` 增加上游已经携带的 `packages/session/session-turn-outline` 条目，与该 README 中 fork 原样继承的句式一致。

两个门禁都没有获得一揽子豁免或被放宽：条目说明该界面为何不可遍历、由谁记录，两张受维护的映射表仍是这些事实的唯一落点。

## 曾考虑的替代方案

**用上游版本替换 fork 手中的两个生成器脚本。** 本次否决：fork 的两份副本都早于上游（检查器为 12 处新增对 40 处删除，Cordis catalog 生成器为 23 对 168），因此这是 port 在 0.1.5 分支上要做的决定，而不是本分支上的 doc-sync 修复。

**让 `ctx.mcpStatus` 可渲染，并在 `SERVICE_PAGE` 里映射它。** 否决：渲染投影遍历的是带方法文档的 Cordis Service Definition，而该 store 是根上提供的普通类；渲染它意味着改动投影，而不是声明服务。

**豁免该键但不指名文档归属方。** 否决：豁免字符串是该 API 文档位置的唯一记录，因此没有归属方的条目会让门禁变绿，同时让 `ctx.mcpStatus` 没有任何文档。

**改写 fork 的界面直到门禁在不修改的情况下通过。** 否决：状态 store 是真实发布的服务，turn-outline 的 README 也是上游自己的文本；为迁就较旧的检查器改动二者，等于用一个绿门禁换一个错误门禁。

## 后果

`pnpm run doc-sync` 不再因 fork 自身的界面失败，而下一个 fork 新增的服务或包 README 会响亮失败，直到以同样方式记账为止。代价是维护：`SERVICE_WALK_EXEMPTIONS` 与 `SENTENCE_MODEL_EXPERIENCE` 是 fork 如今已与上游分叉的受维护列表，因此上游同步会在文本上而非语义上冲突，每个冲突都必须把条目对照合并后的界面重新检查后才能解决。
