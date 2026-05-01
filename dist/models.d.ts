import type { LanguageModel } from "ai";
import type { ModelRegistry } from "./types.js";
interface RegistryInput {
    openai?: (modelId: string) => LanguageModel;
    anthropic?: (modelId: string) => LanguageModel;
}
/**
 * Helper opcional: monta um registry padrão dos modelos canônicos do Paulo,
 * a partir dos providers que o projeto tiver instalado.
 *
 * Exemplo de uso no projeto consumidor:
 *
 *   import { openai } from "@ai-sdk/openai";
 *   import { anthropic } from "@ai-sdk/anthropic";
 *   import { createDefaultRegistry } from "@brito/ai-kit/models";
 *
 *   export const models = createDefaultRegistry({ openai, anthropic });
 *
 * Cada projeto pode também montar o registry à mão — o kit só precisa de
 * Record<string, LanguageModel>.
 */
export declare function createDefaultRegistry({ openai, anthropic }: RegistryInput): ModelRegistry;
/**
 * IDs canônicos (string literals) — útil pra autocomplete em consumidores
 * que usem o registry padrão. Quem montar registry custom pode ignorar.
 */
export declare const CANONICAL_MODEL_IDS: readonly ["gpt-5", "gpt-5-nano", "claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"];
export type CanonicalModelId = (typeof CANONICAL_MODEL_IDS)[number];
/**
 * Modelos rápidos/baratos pra tarefas triviais (categorização, classificação).
 * Use com `categorize.ts`.
 */
export declare const FAST_MODEL_CANDIDATES: CanonicalModelId[];
export {};
//# sourceMappingURL=models.d.ts.map