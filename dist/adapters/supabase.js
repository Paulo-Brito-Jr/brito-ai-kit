function rowToConversation(row, ownerIdColumn) {
    return {
        id: String(row.id),
        ownerId: String(row[ownerIdColumn]),
        title: String(row.title ?? "Nova conversa"),
        scope: row.scope ?? null,
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
    };
}
function rowToMessage(row) {
    return {
        id: String(row.id),
        conversationId: String(row.conversation_id),
        role: row.role,
        content: String(row.content),
        toolCalls: (row.tool_calls ?? null),
        toolCallId: row.tool_call_id ?? null,
        model: row.model ?? null,
        tokensIn: row.tokens_in ?? null,
        tokensOut: row.tokens_out ?? null,
        createdAt: new Date(String(row.created_at)),
    };
}
export function createSupabaseChatStore(input) {
    const { supabase, conversationsTable = "conversations", messagesTable = "messages", ownerIdColumn = "owner_id", } = input;
    return {
        async createConversation({ ownerId, title, scope }) {
            const result = await supabase
                .from(conversationsTable)
                .insert({ [ownerIdColumn]: ownerId, title: title ?? "Nova conversa", scope: scope ?? null })
                .select("id")
                .single();
            if (result.error)
                throw new Error(`createConversation: ${result.error.message}`);
            const data = result.data;
            if (!data)
                throw new Error("createConversation: no row returned");
            return { id: data.id };
        },
        async getConversation(id) {
            const result = await supabase.from(conversationsTable).select("*").eq("id", id).maybeSingle();
            if (result.error)
                throw new Error(`getConversation: ${result.error.message}`);
            if (!result.data)
                return null;
            return rowToConversation(result.data, ownerIdColumn);
        },
        async listConversations(ownerId, limit = 30) {
            const result = await supabase
                .from(conversationsTable)
                .select("*")
                .eq(ownerIdColumn, ownerId)
                .order("updated_at", { ascending: false })
                .limit(limit);
            if (result.error)
                throw new Error(`listConversations: ${result.error.message}`);
            const rows = (result.data ?? []);
            return rows.map((r) => rowToConversation(r, ownerIdColumn));
        },
        async listMessages(conversationId, limit = 200) {
            const result = await supabase
                .from(messagesTable)
                .select("*")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true })
                .limit(limit);
            if (result.error)
                throw new Error(`listMessages: ${result.error.message}`);
            const rows = (result.data ?? []);
            return rows.map(rowToMessage);
        },
        async appendMessage(input) {
            const result = await supabase.from(messagesTable).insert({
                conversation_id: input.conversationId,
                role: input.role,
                content: input.content,
                tool_calls: input.toolCalls ?? null,
                tool_call_id: input.toolCallId ?? null,
                model: input.model ?? null,
                tokens_in: input.tokensIn ?? null,
                tokens_out: input.tokensOut ?? null,
            });
            if (result.error)
                throw new Error(`appendMessage: ${result.error.message}`);
        },
        async touchConversation(id) {
            const result = await supabase
                .from(conversationsTable)
                .update({ updated_at: new Date().toISOString() })
                .eq("id", id);
            if (result.error)
                throw new Error(`touchConversation: ${result.error.message}`);
        },
        async deleteConversation(id) {
            const result = await supabase.from(conversationsTable).delete().eq("id", id);
            if (result.error)
                throw new Error(`deleteConversation: ${result.error.message}`);
        },
    };
}
//# sourceMappingURL=supabase.js.map