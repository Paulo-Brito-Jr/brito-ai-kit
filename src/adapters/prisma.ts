import type {
  AppendMessageInput,
  ChatStore,
  ConversationRow,
  MessageRow,
  Role,
} from "../types.js";

/**
 * Adapter Prisma — assume schema canônico (ver migrations/prisma-schema.snippet.prisma):
 *   model Conversation { id, ownerId, title, scope?, createdAt, updatedAt, messages Message[] }
 *   model Message { id, conversationId, role, content, toolCalls?, toolCallId?, model?, tokensIn?, tokensOut?, createdAt }
 *
 * Uso:
 *   import { PrismaClient } from "@prisma/client";
 *   import { createPrismaChatStore } from "@brito/ai-kit/adapters/prisma";
 *   const prisma = new PrismaClient();
 *   const store = createPrismaChatStore({ prisma });
 *
 * Se seu projeto usa nomes de modelo diferentes (ex: AiMessage), passe os
 * delegates explicitamente: `createPrismaChatStore({ conversation: prisma.conversation, message: prisma.aiMessage })`.
 * Recomendado: renomear para `Conversation`/`Message` na Fase 2 — kit simples > flexibilidade prematura.
 */

interface PrismaDelegateLike<TRow> {
  create(args: { data: Record<string, unknown> }): Promise<TRow>;
  findUnique(args: { where: { id: string } }): Promise<TRow | null>;
  findMany(args: Record<string, unknown>): Promise<TRow[]>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<TRow>;
  delete(args: { where: { id: string } }): Promise<TRow>;
}

interface PrismaClientLike {
  conversation: PrismaDelegateLike<ConversationRow>;
  message: PrismaDelegateLike<MessageRow>;
}

interface PrismaChatStoreInput {
  prisma?: PrismaClientLike;
  conversation?: PrismaDelegateLike<ConversationRow>;
  message?: PrismaDelegateLike<MessageRow>;
}

export function createPrismaChatStore(input: PrismaChatStoreInput): ChatStore {
  const conversation = input.conversation ?? input.prisma?.conversation;
  const message = input.message ?? input.prisma?.message;
  if (!conversation || !message) {
    throw new Error(
      "createPrismaChatStore: provide { prisma } or both { conversation, message } delegates",
    );
  }

  return {
    async createConversation({ ownerId, title, scope }) {
      const row = await conversation.create({
        data: { ownerId, title: title ?? "Nova conversa", scope: scope ?? null },
      });
      return { id: row.id };
    },

    async getConversation(id) {
      return conversation.findUnique({ where: { id } });
    },

    async listConversations(ownerId, limit = 30) {
      return conversation.findMany({
        where: { ownerId },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
    },

    async listMessages(conversationId, limit = 200) {
      return message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
    },

    async appendMessage(input: AppendMessageInput) {
      await message.create({
        data: {
          conversationId: input.conversationId,
          role: input.role satisfies Role,
          content: input.content,
          toolCalls: input.toolCalls ?? null,
          toolCallId: input.toolCallId ?? null,
          model: input.model ?? null,
          tokensIn: input.tokensIn ?? null,
          tokensOut: input.tokensOut ?? null,
        },
      });
    },

    async touchConversation(id) {
      await conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    },

    async deleteConversation(id) {
      await conversation.delete({ where: { id } });
    },
  };
}
