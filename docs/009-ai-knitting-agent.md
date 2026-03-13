# AI Knitting Agent

**Status:** Schema not yet in database, no implementation

## Problem Statement

Knitting patterns contain dense, abbreviation-heavy instructions that confuse beginners and even intermediate crafters. Users frequently need help understanding instructions, choosing the right size, substituting yarn, or figuring out what to make next from their stash. Currently, they leave the app to search forums or ask in Ravelry groups.

## Solution Overview

An in-app AI assistant powered by GPT-4o that answers knitting and crochet questions, recommends patterns based on the user's stash and preferences, and guides through pattern instructions. The agent has access to the user's data (stash, projects, measurements, saved patterns) via tool calling. All inference runs server-side through Next.js API routes.

## Key Components

### Backend (Next.js API)

- `POST /api/v1/agent/conversations` - create a new conversation. **Not started.**
- `GET /api/v1/agent/conversations` - list user's conversations. **Not started.**
- `DELETE /api/v1/agent/conversations/:id` - delete a conversation and its messages. **Not started.**
- `POST /api/v1/agent/conversations/:id/messages` - send a message, stream the response via SSE (Server-Sent Events). Calls OpenAI with tool definitions, executes tool calls against the database, streams partial responses back. **Not started.**
- `GET /api/v1/agent/conversations/:id/messages` - fetch message history for a conversation. **Not started.**
- Tool definitions for OpenAI function calling: **Not started.**
  - `search_patterns` - search saved_patterns and patterns by craft, weight, yardage, difficulty
  - `read_stash` - fetch user's yarn stash with filters
  - `read_measurements` - fetch user's body measurements
  - `read_projects` - fetch user's projects with status filter
  - `read_pattern_detail` - fetch full pattern with sections and rows
  - `gauge_calculator` - compute row/stitch estimates from gauge
  - `search_ravelry` - proxy search to Ravelry API (if user has connection)
- System prompt engineering with knitting domain knowledge, abbreviation glossary, and instructions for tone/format. **Not started.**

### iOS (SwiftUI)

- `AgentChatView` - chat interface with message bubbles, streaming text display, suggested prompts for new conversations. **Not started.**
- `ConversationListView` - list of past conversations with titles and timestamps. **Not started.**
- `AgentViewModel` - manages conversation state, SSE streaming, message history. **Not started.**
- Suggested prompts: "What can I make with my stash?", "Explain this instruction: [paste]", "What size should I make?", "Help me substitute yarn for this pattern". **Not started.**
- Tab bar or nav entry point. **Not started.**

### Web (Next.js)

- `(app)/agent/page.tsx` - chat page with conversation sidebar and message area. **Not started.**
- `components/features/agent/ChatMessage.tsx` - message bubble with markdown rendering. **Not started.**
- `components/features/agent/ChatInput.tsx` - text input with send button. **Not started.**
- `components/features/agent/SuggestedPrompts.tsx` - starter prompts for empty conversations. **Not started.**
- `hooks/use-agent-stream.ts` - SSE hook for streaming responses. **Not started.**

### Database

Tables needed (not yet in schema):

- `agent_conversations` - id, user_id, title (auto-generated from first message), created_at, updated_at.
- `agent_messages` - id, conversation_id, role ("user" | "assistant" | "tool"), content (text), tool_calls (JSON, for assistant messages that invoke tools), tool_call_id (for tool response messages), metadata (JSON, for token usage tracking), created_at.

## Implementation Checklist

- [ ] Add agent_conversations and agent_messages tables to Prisma schema
- [ ] Run db:push / db:generate
- [ ] Conversation CRUD API routes
- [ ] Message creation route with OpenAI integration
- [ ] SSE streaming endpoint
- [ ] Tool definitions for OpenAI function calling
- [ ] Tool execution layer (read stash, patterns, measurements, projects, gauge calc)
- [ ] Ravelry search proxy tool (only for users with ravelry_connections)
- [ ] System prompt with knitting domain knowledge
- [ ] Token usage tracking in message metadata
- [ ] Pro gate on all agent routes
- [ ] Rate limiting (e.g., 50 messages/day)
- [ ] iOS AgentChatView with streaming display
- [ ] iOS ConversationListView
- [ ] iOS AgentViewModel with SSE parsing
- [ ] iOS suggested prompts
- [ ] Web agent chat page
- [ ] Web ChatMessage with markdown rendering
- [ ] Web ChatInput component
- [ ] Web SSE streaming hook
- [ ] Web suggested prompts

## Dependencies

- Auth (Clerk) - required for user identity and data access
- OpenAI API key - required for GPT-4o inference
- User stash (010) - tool reads user_stash and yarns tables
- User measurements - tool reads user_measurements table
- Projects and patterns - tools read these for context
- Ravelry connection (optional) - enables search_ravelry tool
- Prisma schema update - agent tables do not exist yet

## Tier Gating

| Feature | Free | Pro |
|---------|------|-----|
| AI agent access | No | Yes |
| All conversations and tools | No | Yes |

This feature is Pro only. Free users see a preview/upsell screen.

## Technical Notes

- All OpenAI calls go through Next.js API routes. The iOS app never calls OpenAI directly. This keeps the API key server-side and allows centralized rate limiting.
- Use OpenAI's streaming API (`stream: true`) with Server-Sent Events for the response. The endpoint sends `data: { content: "partial text" }` chunks. iOS and web clients parse the SSE stream incrementally.
- Tool calling flow: (1) send user message + tool definitions to OpenAI, (2) if the response includes `tool_calls`, execute each tool against the database, (3) send tool results back to OpenAI, (4) stream the final response. This may involve multiple round-trips.
- The agent should only query the current user's data. All tool executions must include `user_id` in the WHERE clause. Never expose other users' data.
- For "What can I make with my stash?", the agent reads the user's stash (yarn weights, yardage), then either searches saved_patterns locally or proxies to Ravelry's pattern search API filtered by weight and yardage range.
- The system prompt should include a knitting abbreviation glossary (k, p, yo, k2tog, ssk, etc.) so the model can explain instructions without hallucinating.
- Conversation titles should be auto-generated from the first user message (truncated to 60 characters). Update the title after the first message is created.
- Store token usage (prompt_tokens, completion_tokens) in `agent_messages.metadata` for cost monitoring.
- Rate limit: 50 messages per day per user. Check count of user's messages created today before processing.
