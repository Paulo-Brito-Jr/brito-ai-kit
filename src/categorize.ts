import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

interface CategorizeInput {
  /** Modelo rápido/barato (ex: gpt-5-nano, claude-haiku-4-5). */
  model: LanguageModel;
  /** Texto a classificar (título do item, descrição, etc). */
  text: string;
  /** Lista de categorias permitidas. Pode incluir emoji + nome. */
  categories: string[];
  /** Contexto opcional (notas adicionais sobre o item). */
  notes?: string;
  /** Instrução de domínio. Default: assistente genérico. */
  instruction?: string;
  /** Timeout em ms. Default 3000. */
  timeoutMs?: number;
}

interface CategorizeResult {
  category: string | null;
  /** True se caiu no fallback (timeout, erro, ou modelo retornou null). */
  fallback: boolean;
}

/**
 * Classifica um texto em uma das categorias fornecidas via call separado
 * a um modelo rápido. Determinístico (zod schema), barato, com timeout.
 *
 * Padrão extraído do Brito's Skynet (`lib/ai/categorize.ts`). Preferir essa
 * abordagem em vez de delegar a categorização ao system prompt do chat
 * principal: separa concerns, é observável, e permite usar modelo mais barato.
 */
export async function suggestCategory({
  model,
  text,
  categories,
  notes,
  instruction = "Escolha a categoria mais adequada para o item abaixo.",
  timeoutMs = 3000,
}: CategorizeInput): Promise<CategorizeResult> {
  if (categories.length === 0) return { category: null, fallback: true };

  const schema = z.object({
    category: z.union([z.enum(categories as [string, ...string[]]), z.null()]),
  });

  const promptParts = [instruction, "", `Item: ${text}`];
  if (notes) promptParts.push(`Notas: ${notes}`);
  promptParts.push("", "Categorias disponíveis:");
  promptParts.push(...categories.map((c) => `- ${c}`));
  promptParts.push(
    "",
    "Responda com a categoria exata da lista, ou null se nenhuma se encaixar bem.",
  );

  const prompt = promptParts.join("\n");

  try {
    const result = await Promise.race([
      generateObject({ model, schema, prompt }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("categorize-timeout")), timeoutMs),
      ),
    ]);
    return { category: result.object.category, fallback: result.object.category === null };
  } catch {
    return { category: null, fallback: true };
  }
}
