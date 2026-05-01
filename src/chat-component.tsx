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
export function dbMessagesToUI(rows: MessageRow[]): UIMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: r.content }],
    }));
}

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
  render?: (args: { label: string; state: ToolPartState; detail?: unknown }) => ReactNode;
}

/**
 * Renderiza o estado de uma tool call de forma minimal e estilo-agnóstica.
 * Cada projeto pode passar `render` pra usar seu próprio design system,
 * ou usar a renderização default (texto puro com prefixo de status).
 */
export function ToolPart({ name, state, detail, labels, render }: ToolPartProps) {
  const label = labels?.[name] ?? name;

  if (render) {
    return <>{render({ label, state, detail })}</>;
  }

  const prefix =
    state === "output-available"
      ? "✓"
      : state === "output-error"
        ? "✗"
        : "⋯";

  return (
    <div data-tool={name} data-state={state}>
      <span>{prefix}</span> <span>{label}</span>
    </div>
  );
}

/**
 * Helper pra extrair o nome da tool de um part `tool-${name}` do AI SDK v6.
 *
 *   for (const part of message.parts) {
 *     const toolName = toolNameFromPart(part);
 *     if (toolName) <ToolPart name={toolName} state={part.state} detail={part.output} />
 *   }
 */
export function toolNameFromPart(part: { type: string }): string | null {
  if (typeof part.type !== "string") return null;
  if (!part.type.startsWith("tool-")) return null;
  return part.type.slice("tool-".length);
}
