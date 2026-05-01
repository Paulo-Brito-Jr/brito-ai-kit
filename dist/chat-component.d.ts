import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import type { MessageRow } from "./types.js";
/**
 * Converte mensagens persistidas (formato MessageRow do ChatStore) para o
 * formato UIMessage esperado pelo `useChat` do `@ai-sdk/react`. Use no SSR
 * pra hidratar `initialMessages`.
 *
 *   const rows = await store.listMessages(conversationId);
 *   <Chat initialMessages={dbMessagesToUI(rows)} />
 */
export declare function dbMessagesToUI(rows: MessageRow[]): UIMessage[];
/**
 * Estados possíveis de uma tool part renderizada via useChat.
 * O AI SDK v6 expõe parts com type `tool-${name}` e estado `state`.
 */
export type ToolPartState = "input-streaming" | "input-available" | "output-available" | "output-error";
export interface ToolPartProps {
    /** Nome da tool (sem prefixo `tool-`). */
    name: string;
    /** Estado atual reportado pelo AI SDK. */
    state: ToolPartState;
    /** Resultado / erro / input recebido — opcional, pra exibição rica. */
    detail?: unknown;
    /** Map de label legível por nome de tool. Default: usa o próprio name. */
    labels?: Record<string, string>;
    /** Slot opcional pra customizar a renderização (sobrescreve default). */
    render?: (args: {
        label: string;
        state: ToolPartState;
        detail?: unknown;
    }) => ReactNode;
}
/**
 * Renderiza o estado de uma tool call de forma minimal e estilo-agnóstica.
 * Cada projeto pode passar `render` pra usar seu próprio design system,
 * ou usar a renderização default (texto puro com prefixo de status).
 */
export declare function ToolPart({ name, state, detail, labels, render }: ToolPartProps): import("react/jsx-runtime").JSX.Element;
/**
 * Helper pra extrair o nome da tool de um part `tool-${name}` do AI SDK v6.
 *
 *   for (const part of message.parts) {
 *     const toolName = toolNameFromPart(part);
 *     if (toolName) <ToolPart name={toolName} state={part.state} detail={part.output} />
 *   }
 */
export declare function toolNameFromPart(part: {
    type: string;
}): string | null;
//# sourceMappingURL=chat-component.d.ts.map