import { generateObject } from "ai";
import { z } from "zod";
/**
 * Classifica um texto em uma das categorias fornecidas via call separado
 * a um modelo rápido. Determinístico (zod schema), barato, com timeout.
 *
 * Padrão extraído do Brito's Skynet (`lib/ai/categorize.ts`). Preferir essa
 * abordagem em vez de delegar a categorização ao system prompt do chat
 * principal: separa concerns, é observável, e permite usar modelo mais barato.
 */
export async function suggestCategory({ model, text, categories, notes, instruction = "Escolha a categoria mais adequada para o item abaixo.", timeoutMs = 3000, }) {
    if (categories.length === 0)
        return { category: null, fallback: true };
    const schema = z.object({
        category: z.union([z.enum(categories), z.null()]),
    });
    const promptParts = [instruction, "", `Item: ${text}`];
    if (notes)
        promptParts.push(`Notas: ${notes}`);
    promptParts.push("", "Categorias disponíveis:");
    promptParts.push(...categories.map((c) => `- ${c}`));
    promptParts.push("", "Responda com a categoria exata da lista, ou null se nenhuma se encaixar bem.");
    const prompt = promptParts.join("\n");
    try {
        const result = await Promise.race([
            generateObject({ model, schema, prompt }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("categorize-timeout")), timeoutMs)),
        ]);
        return { category: result.object.category, fallback: result.object.category === null };
    }
    catch {
        return { category: null, fallback: true };
    }
}
//# sourceMappingURL=categorize.js.map