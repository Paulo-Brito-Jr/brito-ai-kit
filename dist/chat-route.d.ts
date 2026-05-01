import type { ChatRouteConfig } from "./types.js";
/**
 * Factory que monta o handler POST de chat. Use no `app/api/ai/chat/route.ts`
 * de cada projeto:
 *
 *   import { createChatRoute } from "@brito/ai-kit/chat-route";
 *   export const POST = createChatRoute({
 *     store, auth, tools, systemPrompt, models, defaultModel: "gpt-5",
 *   });
 *
 * Fluxo:
 * 1. Resolve actor via auth.resolve(req); 401 se null.
 * 2. Parse body { messages (UIMessage[]), conversationId?, model? }.
 * 3. Garante conversationId (cria se ausente).
 * 4. streamText com system prompt dinâmico + tools(ctx) + stopWhen(stepCountIs).
 * 5. onFinish: persiste última user msg + assistant msg (com tool_calls e tokens).
 * 6. Retorna result.toUIMessageStreamResponse().
 */
export declare function createChatRoute<Actor>(config: ChatRouteConfig<Actor>): (req: Request) => Promise<Response>;
//# sourceMappingURL=chat-route.d.ts.map