import type {
  AppendMessageInput,
  ChatStore,
  ConversationRow,
  MessageRow,
} from "../types.js";

/**
 * Adapter Supabase — assume schema canônico (ver migrations/supabase.sql):
 *   conversations(id, owner_id, title, scope, created_at, updated_at)
 *   messages(id, conversation_id, role, content, tool_calls, tool_call_id, model, tokens_in, tokens_out, created_at)
 *
 * Use com client admin (service_role) pra bypass RLS, ou client autenticado
 * com policies que filtrem por auth.uid() = owner_id.
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   import { createSupabaseChatStore } from "@brito/ai-kit/adapters/supabase";
 *   const supabase = createClient(url, serviceRoleKey);
 *   const store = createSupabaseChatStore({ supabase });
 */

interface SupabaseQueryBuilderLike {
  select(columns?: string): SupabaseQueryBuilderLike;
  insert(data: Record<string, unknown>): SupabaseQueryBuilderLike;
  update(data: Record<string, unknown>): SupabaseQueryBuilderLike;
  delete(): SupabaseQueryBuilderLike;
  eq(column: string, value: unknown): SupabaseQueryBuilderLike;
  order(column: string, opts?: { ascending?: boolean }): SupabaseQueryBuilderLike;
  limit(n: number): SupabaseQueryBuilderLike;
  single(): Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
  then<TR1 = unknown, TR2 = never>(
    onfulfilled?: (value: { data: unknown; error: { message: string } | null }) => TR1 | PromiseLike<TR1>,
    onrejected?: (reason: unknown) => TR2 | PromiseLike<TR2>,
  ): Promise<TR1 | TR2>;
}

interface SupabaseClientLike {
  from(table: string): SupabaseQueryBuilderLike;
}

interface SupabaseChatStoreInput {
  supabase: SupabaseClientLike;
  conversationsTable?: string;
  messagesTable?: string;
}

function rowToConversation(row: Record<string, unknown>): ConversationRow {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title ?? "Nova conversa"),
    scope: (row.scope as string | null | undefined) ?? null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function rowToMessage(row: Record<string, unknown>): MessageRow {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: row.role as MessageRow["role"],
    content: String(row.content),
    toolCalls: (row.tool_calls ?? null) as unknown,
    toolCallId: (row.tool_call_id as string | null | undefined) ?? null,
    model: (row.model as string | null | undefined) ?? null,
    tokensIn: (row.tokens_in as number | null | undefined) ?? null,
    tokensOut: (row.tokens_out as number | null | undefined) ?? null,
    createdAt: new Date(String(row.created_at)),
  };
}

export function createSupabaseChatStore(input: SupabaseChatStoreInput): ChatStore {
  const { supabase, conversationsTable = "conversations", messagesTable = "messages" } = input;

  return {
    async createConversation({ ownerId, title, scope }) {
      const result = await supabase
        .from(conversationsTable)
        .insert({ owner_id: ownerId, title: title ?? "Nova conversa", scope: scope ?? null })
        .select("id")
        .single();
      if (result.error) throw new Error(`createConversation: ${result.error.message}`);
      const data = result.data as { id: string } | null;
      if (!data) throw new Error("createConversation: no row returned");
      return { id: data.id };
    },

    async getConversation(id) {
      const result = await supabase.from(conversationsTable).select("*").eq("id", id).maybeSingle();
      if (result.error) throw new Error(`getConversation: ${result.error.message}`);
      if (!result.data) return null;
      return rowToConversation(result.data as Record<string, unknown>);
    },

    async listConversations(ownerId, limit = 30) {
      const result = await supabase
        .from(conversationsTable)
        .select("*")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (result.error) throw new Error(`listConversations: ${result.error.message}`);
      const rows = (result.data ?? []) as Record<string, unknown>[];
      return rows.map(rowToConversation);
    },

    async listMessages(conversationId, limit = 200) {
      const result = await supabase
        .from(messagesTable)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (result.error) throw new Error(`listMessages: ${result.error.message}`);
      const rows = (result.data ?? []) as Record<string, unknown>[];
      return rows.map(rowToMessage);
    },

    async appendMessage(input: AppendMessageInput) {
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
      if (result.error) throw new Error(`appendMessage: ${result.error.message}`);
    },

    async touchConversation(id) {
      const result = await supabase
        .from(conversationsTable)
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
      if (result.error) throw new Error(`touchConversation: ${result.error.message}`);
    },

    async deleteConversation(id) {
      const result = await supabase.from(conversationsTable).delete().eq("id", id);
      if (result.error) throw new Error(`deleteConversation: ${result.error.message}`);
    },
  };
}
