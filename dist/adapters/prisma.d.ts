import type { ChatStore } from "../types.js";
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
/**
 * Tipagem deliberadamente frouxa (`any`) — delegates do Prisma têm generics
 * complexos (DefaultArgs, PrismaClientOptions, FindManyArgs concretos por
 * model) que mudam por projeto e nao casam com interfaces manuais. O adapter
 * castea internamente os retornos pra Record<string, unknown> e depois pra
 * ConversationRow/MessageRow via `rowTo*` — o type safety está nessas
 * funções, não no delegate.
 */
type PrismaDelegateLike = any;
interface PrismaClientLike {
    conversation: PrismaDelegateLike;
    message: PrismaDelegateLike;
}
interface PrismaChatStoreInput {
    prisma?: PrismaClientLike;
    conversation?: PrismaDelegateLike;
    message?: PrismaDelegateLike;
    /** Nome do campo que guarda o owner na Conversation. Default `ownerId`. Finanças usa `userId`. */
    ownerIdField?: string;
}
export declare function createPrismaChatStore(input: PrismaChatStoreInput): ChatStore;
export {};
//# sourceMappingURL=prisma.d.ts.map