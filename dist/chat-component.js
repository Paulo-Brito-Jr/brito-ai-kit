import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Converte mensagens persistidas (formato MessageRow do ChatStore) para o
 * formato UIMessage esperado pelo `useChat` do `@ai-sdk/react`. Use no SSR
 * pra hidratar `initialMessages`.
 *
 *   const rows = await store.listMessages(conversationId);
 *   <Chat initialMessages={dbMessagesToUI(rows)} />
 */
export function dbMessagesToUI(rows) {
    return rows
        .filter((r) => r.role === "user" || r.role === "assistant")
        .map((r) => ({
        id: r.id,
        role: r.role,
        parts: [{ type: "text", text: r.content }],
    }));
}
/**
 * Renderiza o estado de uma tool call de forma minimal e estilo-agnóstica.
 * Cada projeto pode passar `render` pra usar seu próprio design system,
 * ou usar a renderização default (texto puro com prefixo de status).
 */
export function ToolPart({ name, state, detail, labels, render }) {
    const label = labels?.[name] ?? name;
    if (render) {
        return _jsx(_Fragment, { children: render({ label, state, detail }) });
    }
    const prefix = state === "output-available"
        ? "✓"
        : state === "output-error"
            ? "✗"
            : "⋯";
    return (_jsxs("div", { "data-tool": name, "data-state": state, children: [_jsx("span", { children: prefix }), " ", _jsx("span", { children: label })] }));
}
/**
 * Helper pra extrair o nome da tool de um part `tool-${name}` do AI SDK v6.
 *
 *   for (const part of message.parts) {
 *     const toolName = toolNameFromPart(part);
 *     if (toolName) <ToolPart name={toolName} state={part.state} detail={part.output} />
 *   }
 */
export function toolNameFromPart(part) {
    if (typeof part.type !== "string")
        return null;
    if (!part.type.startsWith("tool-"))
        return null;
    return part.type.slice("tool-".length);
}
//# sourceMappingURL=chat-component.js.map