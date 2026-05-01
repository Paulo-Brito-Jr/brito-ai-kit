import { convertToModelMessages, stepCountIs, streamText, } from "ai";
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
export function createChatRoute(config) {
    const { store, auth, tools, systemPrompt, models, defaultModel, maxSteps = 8, scope } = config;
    return async function POST(req) {
        const actor = await auth.resolve(req);
        if (!actor) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
                status: 401,
                headers: { "content-type": "application/json" },
            });
        }
        const ownerId = auth.ownerIdOf(actor);
        let body;
        try {
            body = await req.json();
        }
        catch {
            return new Response(JSON.stringify({ error: "invalid-json" }), {
                status: 400,
                headers: { "content-type": "application/json" },
            });
        }
        const modelId = body.model ?? defaultModel;
        const model = models[modelId];
        if (!model) {
            return new Response(JSON.stringify({ error: "unknown-model", modelId }), {
                status: 400,
                headers: { "content-type": "application/json" },
            });
        }
        let conversationId = body.conversationId;
        if (!conversationId) {
            const created = await store.createConversation({ ownerId, scope });
            conversationId = created.id;
        }
        else {
            const existing = await store.getConversation(conversationId);
            if (!existing || existing.ownerId !== ownerId) {
                return new Response(JSON.stringify({ error: "conversation-not-found" }), {
                    status: 404,
                    headers: { "content-type": "application/json" },
                });
            }
        }
        const ctx = { actor, conversationId, now: new Date() };
        const [system, resolvedTools, modelMessages] = await Promise.all([
            Promise.resolve(systemPrompt(actor)),
            Promise.resolve(tools(ctx)),
            convertToModelMessages(body.messages),
        ]);
        const lastUserMessage = body.messages[body.messages.length - 1];
        const userText = extractText(lastUserMessage);
        const result = streamText({
            model,
            system,
            messages: modelMessages,
            tools: resolvedTools,
            stopWhen: stepCountIs(maxSteps),
            onFinish: async ({ text, usage, toolCalls }) => {
                try {
                    if (userText) {
                        await store.appendMessage({
                            conversationId: conversationId,
                            role: "user",
                            content: userText,
                        });
                    }
                    await store.appendMessage({
                        conversationId: conversationId,
                        role: "assistant",
                        content: text,
                        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
                        model: modelId,
                        tokensIn: usage?.inputTokens,
                        tokensOut: usage?.outputTokens,
                    });
                    await store.touchConversation(conversationId);
                }
                catch (err) {
                    console.error("[brito-ai-kit] persist failed", err);
                }
            },
        });
        return result.toUIMessageStreamResponse({
            headers: { "x-conversation-id": conversationId },
        });
    };
}
function extractText(message) {
    if (!message)
        return "";
    if (typeof message.content === "string") {
        return message.content;
    }
    const parts = message.parts;
    if (!parts)
        return "";
    return parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n");
}
//# sourceMappingURL=chat-route.js.map