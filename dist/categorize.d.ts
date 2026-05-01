import { type LanguageModel } from "ai";
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
export declare function suggestCategory({ model, text, categories, notes, instruction, timeoutMs, }: CategorizeInput): Promise<CategorizeResult>;
export {};
//# sourceMappingURL=categorize.d.ts.map