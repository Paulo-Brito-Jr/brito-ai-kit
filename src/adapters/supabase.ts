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

/**
 * Compatível com `SupabaseClient` do `@supabase/supabase-js`. Tipado de forma
 * deliberadamente frouxa (`from(): any`) porque o builder fluente do Supabase
 * tem assinaturas que não conseguem ser captadas por interface manual sem
 * acoplar com os tipos do pacote oficial. Os pontos onde o kit consome o
 * resultado fazem cast pra `{ data, error }` e validam runtime.
 */
interface SupabaseClientLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

interface SupabaseChatStoreInput {
  supabase: SupabaseClientLike;
  conversationsTable?: string;
  messagesTable?: string;
  /** Nome da coluna que guarda o owner. Default `owner_id`. Brito's Skynet usa `profile_id`. */
  ownerIdColumn?: string;
}

function rowToConversation(row: Record<string, unknown>, ownerIdColumn: string): ConversationRow {
  return {
    id: String(row.id),
    ownerId: String(row[ownerIdColumn]),
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
  const {
    supabase,
    conversationsTable = "conversations",
    messagesTable = "messages",
    ownerIdColumn = "owner_id",
  } = input;

  return {
    async createConversation({ ownerId, title, scope }) {
      const result = await supabase
        .from(conversationsTable)
        .insert({ [ownerIdColumn]: ownerId, title: title ?? "Nova conversa", scope: scope ?? null })
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
      return rowToConversation(result.data as Record<string, unknown>, ownerIdColumn);
    },

    async listConversations(ownerId, limit = 30) {
      const result = await supabase
        .from(conversationsTable)
        .select("*")
        .eq(ownerIdColumn, ownerId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (result.error) throw new Error(`listConversations: ${result.error.message}`);
      const rows = (result.data ?? []) as Record<string, unknown>[];
      return rows.map((r) => rowToConversation(r, ownerIdColumn));
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
