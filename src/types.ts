import type { LanguageModel, ModelMessage, ToolSet } from "ai";

export type Role = "user" | "assistant" | "system" | "tool";

export interface ConversationRow {
  id: string;
  ownerId: string;
  title: string;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  toolCalls: unknown | null;
  toolCallId: string | null;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: Date;
}

export interface AppendMessageInput {
  conversationId: string;
  role: Role;
  content: string;
  toolCalls?: unknown;
  toolCallId?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface ChatStore {
  createConversation(input: { ownerId: string; title?: string; scope?: string }): Promise<{ id: string }>;
  getConversation(id: string): Promise<ConversationRow | null>;
  listConversations(ownerId: string, limit?: number): Promise<ConversationRow[]>;
  listMessages(conversationId: string, limit?: number): Promise<MessageRow[]>;
  appendMessage(input: AppendMessageInput): Promise<void>;
  touchConversation(id: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
}

export interface AuthAdapter<Actor = unknown> {
  resolve(req: Request): Promise<Actor | null>;
  ownerIdOf(actor: Actor): string;
}

export interface ToolContext<Actor = unknown> {
  actor: Actor;
  conversationId: string;
  now: Date;
}

export type ToolFactory<Actor = unknown> = (ctx: ToolContext<Actor>) => ToolSet | Promise<ToolSet>;

export type SystemPromptBuilder<Actor = unknown> = (actor: Actor) => Promise<string> | string;

export type ModelRegistry = Record<string, LanguageModel>;

export interface ChatRouteConfig<Actor = unknown> {
  store: ChatStore;
  auth: AuthAdapter<Actor>;
  tools: ToolFactory<Actor>;
  systemPrompt: SystemPromptBuilder<Actor>;
  models: ModelRegistry;
  defaultModel: string;
  maxSteps?: number;
  scope?: string;
}

export interface ChatRequestBody {
  messages: ModelMessage[];
  conversationId?: string;
  model?: string;
}
