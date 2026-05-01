function rowToConversation(row, ownerIdField) {
    return {
        id: String(row.id),
        ownerId: String(row[ownerIdField]),
        title: String(row.title ?? "Nova conversa"),
        scope: row.scope ?? null,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}
export function createPrismaChatStore(input) {
    const conversation = input.conversation ?? input.prisma?.conversation;
    const message = input.message ?? input.prisma?.message;
    const ownerIdField = input.ownerIdField ?? "ownerId";
    if (!conversation || !message) {
        throw new Error("createPrismaChatStore: provide { prisma } or both { conversation, message } delegates");
    }
    return {
        async createConversation({ ownerId, title, scope }) {
            const row = (await conversation.create({
                data: {
                    [ownerIdField]: ownerId,
                    title: title ?? "Nova conversa",
                    ...(scope !== undefined ? { scope } : {}),
                },
            }));
            return { id: row.id };
        },
        async getConversation(id) {
            const row = (await conversation.findUnique({ where: { id } }));
            if (!row)
                return null;
            return rowToConversation(row, ownerIdField);
        },
        async listConversations(ownerId, limit = 30) {
            const rows = (await conversation.findMany({
                where: { [ownerIdField]: ownerId },
                orderBy: { updatedAt: "desc" },
                take: limit,
            }));
            return rows.map((r) => rowToConversation(r, ownerIdField));
        },
        async listMessages(conversationId, limit = 200) {
            const rows = (await message.findMany({
                where: { conversationId },
                orderBy: { createdAt: "asc" },
                take: limit,
            }));
            return rows.map((r) => ({
                id: String(r.id),
                conversationId: String(r.conversationId),
                role: r.role,
                content: String(r.content),
                toolCalls: (r.toolCalls ?? null),
                toolCallId: r.toolCallId ?? null,
                model: r.model ?? null,
                tokensIn: r.tokensIn ?? null,
                tokensOut: r.tokensOut ?? null,
                createdAt: new Date(r.createdAt),
            }));
        },
        async appendMessage(input) {
            await message.create({
                data: {
                    conversationId: input.conversationId,
                    role: input.role,
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
//# sourceMappingURL=prisma.js.map