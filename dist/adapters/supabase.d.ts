import type { ChatStore } from "../types.js";
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
    from(table: string): any;
}
interface SupabaseChatStoreInput {
    supabase: SupabaseClientLike;
    conversationsTable?: string;
    messagesTable?: string;
    /** Nome da coluna que guarda o owner. Default `owner_id`. Brito's Skynet usa `profile_id`. */
    ownerIdColumn?: string;
}
export declare function createSupabaseChatStore(input: SupabaseChatStoreInput): ChatStore;
export {};
//# sourceMappingURL=supabase.d.ts.map