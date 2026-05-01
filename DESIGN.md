# brito-ai-kit — Design

Kit canônico de chat IA pros projetos do Paulo. **Não é pacote npm publicado** — é um repositório de referência cujos arquivos podem ser:

1. **Importados via path mapping local** (Fase 1–2): `pnpm add file:../brito-ai-kit` ou via tsconfig paths.
2. **Copiados e adaptados** (alternativa pragmática enquanto o kit estabiliza).
3. **Promovidos a pacote `@brito/ai-kit` em GitHub Packages** (Fase 3, quando o terceiro projeto consumir).

## Por que esse desenho

Os 4 projetos do Paulo (Finanças, Brito's Skynet, Acampamento Maranata, Skynet dashboard) divergem em **DB** (Prisma vs Supabase), **auth** (NextAuth vs Supabase Auth) e **domínio** (tools próprias). Mas convergem em:

- Vercel AI SDK v6 + Zod
- Schema `conversations` + `messages`
- Padrão de tool `create/search/update/delete/complete`
- UI com `useChat` (após alinhamento)

O kit isola **só o que converge** — chat shell, registro de tools, schema canônico, factory de endpoint, hook UI. Tudo que diverge (DB, auth, tools de domínio) entra via **adapter** ou é definido em cada projeto.

## Contratos

### `ChatStore` — persistência de conversas

```ts
interface ChatStore {
  createConversation(input: { ownerId: string; title?: string }): Promise<{ id: string }>;
  getConversation(id: string): Promise<ConversationRow | null>;
  listConversations(ownerId: string, limit?: number): Promise<ConversationRow[]>;
  listMessages(conversationId: string, limit?: number): Promise<MessageRow[]>;
  appendMessage(input: AppendMessageInput): Promise<void>;
  touchConversation(id: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
}
```

Implementações: `adapters/prisma.ts`, `adapters/supabase.ts`.

### `AuthAdapter` — identificação do ator

```ts
interface AuthAdapter<Actor = unknown> {
  resolve(req: Request): Promise<Actor | null>;
  ownerIdOf(actor: Actor): string;
}
```

`Actor` é genérico — cada projeto define sua forma (`{ userId, email, role }`, `{ profileId, kind }`, etc.). O kit só precisa do `ownerId` pra escopar conversas.

### `ToolContext` — contexto passado pras tools

```ts
interface ToolContext<Actor = unknown> {
  actor: Actor;
  conversationId: string;
  now: Date;
}
```

Cada projeto define suas tools como `(ctx: ToolContext<MyActor>) => Record<string, Tool>`. O kit nunca conhece tools de domínio.

## Schema canônico

Tabelas `conversations` e `messages`. **Toda implementação (Prisma ou Supabase) deve respeitar estes campos**, com nomes podendo variar por convenção (camelCase no Prisma, snake_case no Postgres bare).

### `conversations`
| campo | tipo | nota |
|---|---|---|
| id | uuid/cuid | PK |
| owner_id | text | FK lógica pro user/profile do projeto |
| title | text | default 'Nova conversa' |
| scope | text? | opcional, pra projetos com múltiplos domínios (ex: Finanças usa "finance"/"agenda") |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `messages`
| campo | tipo | nota |
|---|---|---|
| id | uuid/cuid | PK |
| conversation_id | uuid/cuid | FK |
| role | text | `user` \| `assistant` \| `system` \| `tool` |
| content | text | |
| tool_calls | jsonb? | array de tool calls do assistant |
| tool_call_id | text? | quando role=tool |
| model | text? | id do modelo que gerou |
| tokens_in | int? | |
| tokens_out | int? | |
| created_at | timestamptz | |

## Fluxo do `chat-route`

`createChatRoute({ store, auth, tools, systemPrompt, models, defaultModel })` retorna um handler `POST` Next.js:

1. `auth.resolve(req)` → 401 se null
2. Parse body: `{ messages, conversationId?, model? }`
3. Resolve `model` do registry
4. `conversationId ?? store.createConversation()`
5. `streamText({ model, system: await systemPrompt(actor), messages, tools, stopWhen: stepCountIs(8), onFinish })`
6. `onFinish`: persiste user + assistant + tool messages, atualiza conversa
7. Retorna `result.toUIMessageStreamResponse()`

## UI headless

O kit **não impõe componente final** (cada projeto tem design system próprio: shadcn no Maranata/Skynet, Tailwind direto no Finanças, etc.). Em vez disso exporta:

- `useChatKit()` — wrapper sobre `useChat` do `@ai-sdk/react` com defaults sensatos
- `<ToolPart />` — renderiza estado de tool (pending/result/error) com slot pra ícone e label customizáveis
- `dbMessagesToUI(rows)` — converte mensagens persistidas pro formato esperado pelo `useChat`
- `chat-component.tsx` template completo — copy-paste-ready, comentado, **adaptar visual em cada projeto**

## Decisões deliberadas

- **Sem RAG/embeddings no core.** Quando um projeto precisar, vira plugin opcional.
- **Sem memória de longo prazo.** Histórico em DB já cobre o caso.
- **Sem slash commands no core.** Padrão UX do projeto, fica no template.
- **Anexos (imagem/PDF) são primeira-classe.** O Finanças já usa, vai ser portado pro core como helpers opcionais.
- **Auto-categorização** via `categorize.ts` (call separado `gpt-nano` com `generateObject` + timeout). Determinístico, barato, observável — melhor que confiar no system prompt.
- **System prompt é função `(actor) => Promise<string>`**, não string fixa. Cada projeto carrega contexto dinâmico (membros, categorias, contas) ali dentro.
- **Tools são definidas no projeto, não no kit.** Kit só recebe `Record<string, Tool>` do AI SDK.

## Roadmap

- **Fase 1** (este repo): contratos + factories + adapters + migrations canônicas.
- **Fase 2**: aplicar nos 2 projetos existentes (Brito's Skynet primeiro — mais próximo; Finanças com 3 alinhamentos: streamText, useChat, schema messages atualizado).
- **Fase 3**: promover a `@brito/ai-kit` em GitHub Packages quando o 3º projeto for consumir (provavelmente Maranata ou Skynet dashboard).

## Não-objetivos

- Não é framework. Não esconde o AI SDK — quem usa ainda vê `streamText`, `tool()`, `useChat`.
- Não é provider abstraction. Usa o registry do AI SDK como ele é.
- Não tem versionamento semver real até virar pacote.
