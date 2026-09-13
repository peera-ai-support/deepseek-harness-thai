# Agent Note: image support toggle in the direct DeepSeek catalog editor

Status: implemented

English | [中文](2026-09-12-deepseek-model-image-modality-toggle.zh.md)

## Problem

The direct DeepSeek adapter's catalog editor (`DeepSeekModelsEditor`) edited id, display name, context window, and output cap. A DeepSeek endpoint that accepts images had no way to say so from that editor, even though its rows carry the same modality list the [pi-ai route default](../../archived/architecture/2026-08-12-pi-ai-route-default-input-modalities.md) established (`inputModalities`, or the OpenAI-style `input`) and the settings-models page already offered the equivalent checkbox for a pi-ai provider profile (`ModelListEditor`).

## Decision

Every DeepSeek catalog row carries the `modelImageSupport` checkbox in its disclosure, with the row's label and index as its accessible name. `imagesSupported(model)` reports true when a row's modality array contains `image`. The toggle writes `['text', 'image']` or `['text']` to the field the row already declares — `input` when that row's `input` is an array, otherwise `inputModalities` — so saving never migrates a row between dialects, and a row declaring neither gets `inputModalities`. `CatalogField` accepts both names so the existing `update()`/`onChange` path writes them, and the write stays the whole-array `set` on `['models']` with its revision check.

## Alternatives considered

**Two checkboxes writing the modality array directly.** Rejected: the pi-ai editor's toggle writes exactly these two arrays, and a free-form editor admits `[]` and image-only rows, states no write path in this repository produces.

**Always writing `inputModalities`.** Rejected: a row that declares the OpenAI-style `input` would change dialect the first time the user touches the toggle.

**Deriving image support from the model id.** Rejected: the catalog is user-editable, so the id does not say what the endpoint behind it accepts.

## Consequences

Bought: an image-capable DeepSeek endpoint is declared and corrected from Settings, without hand-editing the settings mirror. Cost: the modality list is now written from the client's catalog editor, so a catalog the user never opens keeps what it already declared, including an entry that serves images and still reads text-only.

The behavior is pinned by the `ModelsSection` client spec: `imagesSupported` over both field names, and the toggle's write through `mutate` as a single `set` on `['models']` carrying `expectedRevision: 0`.

## Known limitations and deferred work

A row that declares both fields shows the checkbox from `inputModalities` (`imagesSupported` checks that name first) while the toggle writes `input`, so the checkbox appears not to change on that row. No shipped entry declares both, and the pi-ai editor's reader prefers the opposite name, so the two editors resolve a dual-declared row differently.
