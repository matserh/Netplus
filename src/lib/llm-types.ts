/**
 * Shared types for the LLM abstraction layer
 */

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
