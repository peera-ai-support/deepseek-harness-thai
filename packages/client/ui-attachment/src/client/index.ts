/** Browser attachment plugin: fills conversation's composer and image slots. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ComposerAttachments } from './ComposerAttachments.tsx'
import { MessageImages } from './MessageImages.tsx'

/** Slot registry required by this presentation plugin. */
export const inject = ['slots']

/** Register attachment presentation without exporting React components as package values. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.input.attachments', () => ctx.slots.register({
    name: 'conversation.input.attachments',
    locale: 'conversation',
  }, ComposerAttachments))
  ctx.slots.inject('conversation.message.images', () => ctx.slots.register({
    name: 'conversation.message.images',
    locale: 'conversation',
  }, MessageImages))
  // `tool.call.images` is declared in the ui-tool package's SlotMap, which this
  // package does not depend on; the structural view keeps the registration
  // compiling without adding a dependency for one slot key.
  const slots = ctx.slots as unknown as {
    inject: (key: string, register: () => unknown) => void
    register: (spec: { name: string; locale: string }, component: unknown) => unknown
  }
  slots.inject('tool.call.images', () => slots.register({
    name: 'tool.call.images',
    locale: 'conversation',
  }, MessageImages))
}
