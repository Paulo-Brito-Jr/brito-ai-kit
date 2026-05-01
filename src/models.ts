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
export function createDefaultRegistry({ openai, anthropic }: RegistryInput): ModelRegistry {
  const registry: ModelRegistry = {};

  if (openai) {
    registry["gpt-5"] = openai("gpt-5");
    registry["gpt-5-nano"] = openai("gpt-5-nano");
  }

  if (anthropic) {
    registry["claude-opus-4-7"] = anthropic("claude-opus-4-7");
    registry["claude-sonnet-4-6"] = anthropic("claude-sonnet-4-6");
    registry["claude-haiku-4-5"] = anthropic("claude-haiku-4-5-20251001");
  }

  return registry;
}

/**
 * IDs canônicos (string literals) — útil pra autocomplete em consumidores
 * que usem o registry padrão. Quem montar registry custom pode ignorar.
 */
export const CANONICAL_MODEL_IDS = [
  "gpt-5",
  "gpt-5-nano",
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
] as const;

export type CanonicalModelId = (typeof CANONICAL_MODEL_IDS)[number];

/**
 * Modelos rápidos/baratos pra tarefas triviais (categorização, classificação).
 * Use com `categorize.ts`.
 */
export const FAST_MODEL_CANDIDATES: CanonicalModelId[] = ["gpt-5-nano", "claude-haiku-4-5"];
