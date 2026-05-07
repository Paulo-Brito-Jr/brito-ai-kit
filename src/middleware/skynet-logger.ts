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
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";

declare const process: { env: Record<string, string | undefined> };

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
  pricing?: Record<string, { input: number; output: number }>;
}

// Pricing default — atualizar quando providers mudarem preços.
// Fonte: anthropic.com/pricing + openai.com/pricing (snapshot 2026-05).
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  // OpenAI
  "gpt-5": { input: 5, output: 20 },
  "gpt-5-nano": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
};

function lookupPricing(
  modelId: string,
  override: SkynetLoggerOptions["pricing"],
): { input: number; output: number } {
  const merged = { ...DEFAULT_PRICING, ...(override ?? {}) };
  if (merged[modelId]) return merged[modelId];
  // Fuzzy: procura por substring (ex: "claude-sonnet-4-6-20260301" matchea "claude-sonnet-4-6")
  const lower = modelId.toLowerCase();
  for (const [chave, pricing] of Object.entries(merged)) {
    if (lower.includes(chave.toLowerCase())) return pricing;
  }
  // Fallback caro pra forçar atenção
  return { input: 5, output: 25 };
}

function calcularCustoUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  pricing: SkynetLoggerOptions["pricing"],
): number {
  const p = lookupPricing(modelId, pricing);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

interface AiJobInsert {
  modelo: string;
  custo_usd: number;
  input_tokens: number;
  output_tokens: number;
  duracao_ms: number;
  fonte: string;
  status: "done" | "erro";
  erro?: string | null;
  concluido_em: string;
  metadata?: Record<string, unknown>;
}

async function inserirAiJob(
  url: string,
  key: string,
  payload: AiJobInsert,
): Promise<void> {
  const resp = await fetch(`${url}/rest/v1/ai_jobs`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`ai_jobs insert HTTP ${resp.status}: ${body}`);
  }
}

/**
 * Wrap um LanguageModel do AI SDK com middleware que loga em ai_jobs do Skynet.
 *
 * Implementa wrapGenerate (generateText/Object) e wrapStream (streamText/Object).
 * Se SKYNET_SUPABASE_URL ou SKYNET_SUPABASE_SERVICE_ROLE_KEY ausentes, vira
 * no-op silencioso (retorna o model original sem wrap).
 */
// LanguageModel é union LanguageModelV3 | string. Aceitamos só objeto V3 —
// se passar string ID, retornamos sem wrap (precisaria do registry pra
// resolver, fora do escopo deste middleware).
export function withSkynetLogger(
  model: LanguageModel,
  opts: SkynetLoggerOptions,
): LanguageModel {
  if (typeof model === "string") return model;
  const supabaseUrl = opts.supabaseUrl ?? process.env.SKYNET_SUPABASE_URL;
  const serviceKey = opts.serviceRoleKey ?? process.env.SKYNET_SUPABASE_SERVICE_ROLE_KEY;
  const failOpen = opts.failOpen ?? true;

  if (!supabaseUrl || !serviceKey) {
    // No-op se config ausente
    return model;
  }

  const log = async (
    inputTokens: number,
    outputTokens: number,
    durationMs: number,
    status: "done" | "erro",
    erro?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> => {
    const payload: AiJobInsert = {
      modelo: model.modelId,
      custo_usd: calcularCustoUsd(model.modelId, inputTokens, outputTokens, opts.pricing),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duracao_ms: durationMs,
      fonte: opts.fonte,
      status,
      erro: erro ?? null,
      concluido_em: new Date().toISOString(),
      metadata: { provider: model.provider, ...(metadata ?? {}) },
    };
    try {
      await inserirAiJob(supabaseUrl, serviceKey, payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (failOpen) {
        console.warn(`[skynet-logger] log fail (silenciado): ${msg}`);
      } else {
        throw e;
      }
    }
  };

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate }) => {
          const start = Date.now();
          try {
            const result = await doGenerate();
            const usage = result.usage ?? { inputTokens: 0, outputTokens: 0 };
            void log(
              Number(usage.inputTokens ?? 0),
              Number(usage.outputTokens ?? 0),
              Date.now() - start,
              "done",
            );
            return result;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            void log(0, 0, Date.now() - start, "erro", msg);
            throw e;
          }
        },
        wrapStream: async ({ doStream }) => {
          const start = Date.now();
          const result = await doStream();
          let inputTokens = 0;
          let outputTokens = 0;
          // Mantém tipagem do stream original — TransformStream<T, T> preserva
          // o tipo concreto LanguageModelV3StreamPart do AI SDK.
          type Part = Parameters<typeof result.stream extends ReadableStream<infer P> ? (p: P) => void : never>[0];
          const transform = new TransformStream<Part, Part>({
            transform(chunk, controller) {
              // chunk é union; só nos interessa o evento "finish" pra capturar usage
              const c = chunk as unknown as {
                type?: string;
                usage?: { inputTokens?: number; outputTokens?: number };
              };
              if (c?.type === "finish" && c.usage) {
                inputTokens = Number(c.usage.inputTokens ?? 0);
                outputTokens = Number(c.usage.outputTokens ?? 0);
              }
              controller.enqueue(chunk);
            },
            flush() {
              void log(inputTokens, outputTokens, Date.now() - start, "done");
            },
          });
          return { ...result, stream: result.stream.pipeThrough(transform) };
        },
  };

  // wrapLanguageModel pode aceitar V2|V3 mas nosso middleware é V3-only.
  // Cast pra evitar erro de assignability na union retornada.
  return wrapLanguageModel({ model: model as never, middleware }) as LanguageModel;
}
