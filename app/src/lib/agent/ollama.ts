// src/lib/agent/ollama.ts
// Ollama client for local Gemma 4 E4B inference

import type { Message, AgentConfig } from './core';

export interface OllamaResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface InferenceStats {
  totalTokens: number;
  promptTokens: number;
  durationMs: number;
  tokensPerSecond: number;
}

export interface OllamaStreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string, stats: InferenceStats) => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  config: AgentConfig,
  systemPrompt: string,
  messages: Message[],
  callbacks: OllamaStreamCallbacks
): Promise<void> {
  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: allMessages,
        stream: true,
        options: { num_ctx: config.maxContextTokens },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullResponse = '';
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const data: OllamaResponse = JSON.parse(line);
          if (data.message?.content) {
            fullResponse += data.message.content;
            callbacks.onToken(data.message.content);
          }
          if (data.done) {
            const durationMs = Date.now() - startTime;
            const stats: InferenceStats = {
              totalTokens: data.eval_count || 0,
              promptTokens: data.prompt_eval_count || 0,
              durationMs,
              tokensPerSecond: (data.eval_count || 0) / (durationMs / 1000),
            };
            callbacks.onComplete(fullResponse, stats);
          }
        } catch { /* skip malformed JSON */ }
      }
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function checkOllamaStatus(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
