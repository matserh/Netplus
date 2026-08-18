/**
 * LLM Abstraction Layer for NetPlus
 *
 * Primary: Cloudflare Workers AI binding (env.AI) — free, 10k req/day on Pages
 * Fallback providers (set via LLM_PROVIDER env var):
 *   - "groq"   : Groq API (free tier, ultra-fast LPU inference)
 *   - "openai" : OpenAI API (best quality, paid)
 *   - "zai"    : NetPlus AI SDK
 */

import type { ChatCompletionMessage } from './llm-types';

// ─── Types ───

export interface LLMConfig {
  provider: 'cf-binding' | 'groq' | 'openai' | 'zai';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ChatCompletionParams {
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

// ─── Cloudflare Workers AI Binding ───

// The env.AI binding is available in Cloudflare Workers/Pages at runtime.
// We access it via a global that gets set by the worker entry point.
declare global {
  // eslint-disable-next-line no-var
  var __CF_AI_BINDING: any;
}

function getCfAIBinding(): any {
  return globalThis.__CF_AI_BINDING || null;
}

async function callCfBinding(params: ChatCompletionParams, model: string): Promise<ChatCompletionResult> {
  const ai = getCfAIBinding();
  if (!ai) throw new Error('CF AI binding not available');

  const response = await ai.run(model, {
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 2048,
  });

  const content = response?.response || response?.choices?.[0]?.message?.content || '';
  return { content, provider: 'cf-binding', model, tokensUsed: response?.usage?.total_tokens };
}

// ─── Cloudflare Workers AI REST API (fallback with API token) ───

async function callCfRest(params: ChatCompletionParams, config: LLMConfig): Promise<ChatCompletionResult> {
  const accountId = process.env.CF_ACCOUNT_ID || '';
  const apiToken = process.env.CF_API_TOKEN || '';
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${config.model}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`CF REST AI error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.result?.response || data.choices?.[0]?.message?.content || '';
  return { content, provider: 'cf-rest', model: config.model };
}

// ─── Groq API (OpenAI-compatible) ───

async function callGroq(params: ChatCompletionParams, config: LLMConfig): Promise<ChatCompletionResult> {
  const url = `${config.baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: params.messages, temperature: params.temperature ?? 0.7, max_tokens: params.max_tokens ?? 2048 }),
  });
  if (!response.ok) throw new Error(`Groq error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', provider: 'groq', model: config.model, tokensUsed: data.usage?.total_tokens };
}

// ─── OpenAI API ───

async function callOpenAI(params: ChatCompletionParams, config: LLMConfig): Promise<ChatCompletionResult> {
  const url = `${config.baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: params.messages, temperature: params.temperature ?? 0.7, max_tokens: params.max_tokens ?? 2048 }),
  });
  if (!response.ok) throw new Error(`OpenAI error (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', provider: 'openai', model: config.model, tokensUsed: data.usage?.total_tokens };
}

// ─── NetPlus AI SDK ───

async function callZAI(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({ messages: params.messages, temperature: params.temperature ?? 0.7, max_tokens: params.max_tokens ?? 2048 });
  return { content: completion.choices[0]?.message?.content || '', provider: 'zai', model: 'z-ai-default' };
}

// ─── Provider Config ───

function getProviderConfig(): LLMConfig {
  const provider = process.env.LLM_PROVIDER || 'cloudflare';

  switch (provider) {
    case 'cloudflare':
      return {
        provider: 'cf-binding',
        model: process.env.LLM_MODEL || '@cf/meta/llama-3.1-8b-instruct',
      };
    case 'groq':
      return {
        provider: 'groq',
        model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
        apiKey: process.env.GROQ_API_KEY || '',
        baseUrl: 'https://api.groq.com/openai/v1',
      };
    case 'openai':
      return {
        provider: 'openai',
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: 'https://api.openai.com/v1',
      };
    case 'zai':
      return { provider: 'zai', model: 'z-ai-default' };
    default:
      return { provider: 'cf-binding', model: '@cf/meta/llama-3.1-8b-instruct' };
  }
}

// ─── Main API ───

/**
 * Send a chat completion request. Tries CF AI binding first, then fallback.
 */
export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const config = getProviderConfig();
  const model = config.model;

  // Try CF AI binding first (free, no API key needed)
  if (getCfAIBinding()) {
    try {
      return await callCfBinding(params, model);
    } catch (e) {
      console.warn('CF AI binding failed, trying fallback:', e);
    }
  }

  // Fallback based on configured provider
  switch (config.provider) {
    case 'cf-binding':
      // Try REST API as fallback for CF
      try {
        return await callCfRest(params, config);
      } catch (e) {
        console.warn('CF REST AI also failed:', e);
        throw new Error('Cloudflare AI unavailable. Set LLM_PROVIDER=groq or openai as fallback.');
      }
    case 'groq':
      return callGroq(params, config);
    case 'openai':
      return callOpenAI(params, config);
    case 'zai':
      return callZAI(params);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

export function getLLMProviderName(): string {
  if (getCfAIBinding()) return 'cf-binding';
  return process.env.LLM_PROVIDER || 'cloudflare';
}

export function isLLMReady(): boolean {
  if (getCfAIBinding()) return true;
  const provider = process.env.LLM_PROVIDER || 'cloudflare';
  switch (provider) {
    case 'cloudflare': return !!(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID);
    case 'groq': return !!process.env.GROQ_API_KEY;
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'zai': return true;
    default: return false;
  }
}

export default { chatCompletion, getLLMProviderName, isLLMReady };
