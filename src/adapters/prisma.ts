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
 * Uso canônico:
 *   import { PrismaClient } from "@prisma/client";
 *   import { createPrismaChatStore } from "@brito/ai-kit/adapters/prisma";
 *   const prisma = new PrismaClient();
 *   const store = createPrismaChatStore({ prisma });
 *
 * Schemas legados (Brito's Skynet/Finanças) podem ter nomes diferentes:
 *   createPrismaChatStore({
 *     conversation: prisma.conversation,
 *     message: prisma.aiMessage,
 *     ownerIdField: "userId",      // se a Conversation usa userId em vez de ownerId
 *   })
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
  /** Nome do campo que guarda o owner na Conversation. Default `ownerId`. Finanças usa `userId`. */
  ownerIdField?: string;
}

function rowToConversation(row: Record<string, unknown>, ownerIdField: string): ConversationRow {
  return {
    id: String(row.id),
    ownerId: String(row[ownerIdField]),
    title: String(row.title ?? "Nova conversa"),
    scope: (row.scope as string | null | undefined) ?? null,
    createdAt: new Date(row.createdAt as string | Date),
    updatedAt: new Date(row.updatedAt as string | Date),
  };
}

export function createPrismaChatStore(input: PrismaChatStoreInput): ChatStore {
  const conversation = input.conversation ?? input.prisma?.conversation;
  const message = input.message ?? input.prisma?.message;
  const ownerIdField = input.ownerIdField ?? "ownerId";
  if (!conversation || !message) {
    throw new Error(
      "createPrismaChatStore: provide { prisma } or both { conversation, message } delegates",
    );
  }

  return {
    async createConversation({ ownerId, title, scope }) {
      const row = await conversation.create({
        data: {
          [ownerIdField]: ownerId,
          title: title ?? "Nova conversa",
          ...(scope !== undefined ? { scope } : {}),
        },
      });
      return { id: row.id };
    },

    async getConversation(id) {
      const row = (await conversation.findUnique({ where: { id } })) as
        | Record<string, unknown>
        | null;
      if (!row) return null;
      return rowToConversation(row, ownerIdField);
    },

    async listConversations(ownerId, limit = 30) {
      const rows = (await conversation.findMany({
        where: { [ownerIdField]: ownerId },
        orderBy: { updatedAt: "desc" },
        take: limit,
      })) as Record<string, unknown>[];
      return rows.map((r) => rowToConversation(r, ownerIdField));
    },

    async listMessages(conversationId, limit = 200) {
      const rows = (await message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        take: limit,
      })) as Record<string, unknown>[];
      return rows.map((r) => ({
        id: String(r.id),
        conversationId: String(r.conversationId),
        role: r.role as Role,
        content: String(r.content),
        toolCalls: (r.toolCalls ?? null) as unknown,
        toolCallId: (r.toolCallId as string | null | undefined) ?? null,
        model: (r.model as string | null | undefined) ?? null,
        tokensIn: (r.tokensIn as number | null | undefined) ?? null,
        tokensOut: (r.tokensOut as number | null | undefined) ?? null,
        createdAt: new Date(r.createdAt as string | Date),
      }));
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
