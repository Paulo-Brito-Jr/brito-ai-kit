/**
 * Skynet logger middleware — wrappa qualquer LanguageModel do Vercel AI SDK
 * pra logar toda chamada (custo + tokens + duração) na tabela `ai_jobs` do
 * Skynet (Supabase).
 *
 * Uso típico em models.ts de cada app:
 *
 *   import { openai } from "@ai-sdk/openai";
 *   import { anthropic } from "@ai-sdk/anthropic";
 *   import { withSkynetLogger } from "@paulo-brito-jr/ai-kit/middleware/skynet-logger";
 *
 *   export const models = createDefaultRegistry({
 *     openai: (id) => withSkynetLogger(openai(id), { fonte: "financas" }),
 *     anthropic: (id) => withSkynetLogger(anthropic(id), { fonte: "financas" }),
 *   });
 *
 * Pra ativar precisa de env vars no app consumidor:
 *   SKYNET_SUPABASE_URL=...
 *   SKYNET_SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Se faltar uma das envs, middleware vira no-op (não quebra a chamada original).
 *
 * Substituir SkynetClient pra apps que já usam Vercel AI SDK — decisão
 * documentada em `Decisoes/2026-05-07-skynet-iaas-via-ai-kit-middleware.md`.
 */
import { type LanguageModel } from "ai";
export interface SkynetLoggerOptions {
    /** Identificador da app/contexto que originou a chamada (financas, maranata, etc) */
    fonte: string;
    /** URL do Supabase do Skynet. Default: env SKYNET_SUPABASE_URL */
    supabaseUrl?: string;
    /** Service role key. Default: env SKYNET_SUPABASE_SERVICE_ROLE_KEY */
    serviceRoleKey?: string;
    /** Se true, falha do log NÃO bloqueia a resposta. Default: true */
    failOpen?: boolean;
    /** Override de pricing por modelo (USD por 1M tokens). */
    pricing?: Record<string, {
        input: number;
        output: number;
    }>;
}
/**
 * Wrap um LanguageModel do AI SDK com middleware que loga em ai_jobs do Skynet.
 *
 * Implementa wrapGenerate (generateText/Object) e wrapStream (streamText/Object).
 * Se SKYNET_SUPABASE_URL ou SKYNET_SUPABASE_SERVICE_ROLE_KEY ausentes, vira
 * no-op silencioso (retorna o model original sem wrap).
 */
export declare function withSkynetLogger(model: LanguageModel, opts: SkynetLoggerOptions): LanguageModel;
//# sourceMappingURL=skynet-logger.d.ts.map