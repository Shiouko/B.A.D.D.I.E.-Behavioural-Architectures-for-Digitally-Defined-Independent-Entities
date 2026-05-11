<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_AGENT_CONFIG, DEFAULT_PERSONALITY, buildSystemPrompt } from '$lib/agent/core';
  import { streamChat, checkOllamaStatus, type InferenceStats } from '$lib/agent/ollama';
  import { TypedMemoryStore } from '$lib/memory/rag';
  import { VoicePipeline, DEFAULT_VOICE_CONFIG } from '$lib/voice/pipeline';
  import { VisionModule, DEFAULT_VISION_CONFIG } from '$lib/vision/capture';
  import { AvatarRenderer, DEFAULT_AVATAR_CONFIG, type Expression } from '$lib/avatar/renderer';

  let messages: { role: string; content: string; stats?: InferenceStats }[] = [];
  let inputText = '';
  let isConnected = false;
  let isGenerating = false;
  let currentExpression: Expression = 'neutral';
  let memoryStats = { episodic: 0, semantic: 0, procedural: 0, total: 0 };

  const memory = new TypedMemoryStore();
  const voice = new VoicePipeline(DEFAULT_VOICE_CONFIG);
  const vision = new VisionModule(DEFAULT_VISION_CONFIG);
  const avatar = new AvatarRenderer(DEFAULT_AVATAR_CONFIG);

  onMount(async () => {
    isConnected = await checkOllamaStatus(DEFAULT_AGENT_CONFIG.baseUrl);
    avatar.loadModel(DEFAULT_AVATAR_CONFIG.modelPath);
  });

  async function sendMessage() {
    if (!inputText.trim() || isGenerating) return;

    const userMessage = inputText.trim();
    inputText = '';
    isGenerating = true;
    currentExpression = 'thinking';
    avatar.setExpression('thinking');

    messages = [...messages, { role: 'user', content: userMessage }];

    const context = memory.query(userMessage, undefined, 3);
    const contextStr = context.map(m => `[${m.type}] ${m.content}`).join('\n');
    const systemPrompt = buildSystemPrompt(DEFAULT_PERSONALITY) +
      (contextStr ? `\n\nRelevant memories:\n${contextStr}` : '');

    let assistantContent = '';
    messages = [...messages, { role: 'assistant', content: '' }];

    await streamChat(
      DEFAULT_AGENT_CONFIG,
      systemPrompt,
      messages.filter(m => m.role !== 'stats').map(m => ({ role: m.role, content: m.content, timestamp: Date.now() })),
      {
        onToken: (token) => {
          assistantContent += token;
          messages[messages.length - 1].content = assistantContent;
          messages = [...messages];
        },
        onComplete: (fullResponse, stats) => {
          messages[messages.length - 1].content = fullResponse;
          messages[messages.length - 1].stats = stats;
          messages = [...messages];
          isGenerating = false;
          currentExpression = 'neutral';
          avatar.setExpression('neutral');

          memory.add({
            id: crypto.randomUUID(),
            type: 'episodic',
            content: `User: ${userMessage} | Assistant: ${fullResponse.slice(0, 200)}`,
            metadata: { timestamp: Date.now(), source: 'conversation', importance: 0.5, tags: [] },
          });
          memoryStats = memory.getStats();
        },
        onError: (error) => {
          messages[messages.length - 1].content = `Error: ${error.message}`;
          messages = [...messages];
          isGenerating = false;
          currentExpression = 'concerned';
          avatar.setExpression('concerned');
        },
      }
    );
  }
</script>

<main class="baddie-app">
  <header>
    <h1>B.A.D.D.I.E.</h1>
    <span class="status" class:connected={isConnected}>
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  </header>

  <div class="main-content">
    <aside class="avatar-panel">
      <div class="avatar-canvas">
        <div class="avatar-placeholder">
          <span class="expression">{currentExpression}</span>
        </div>
      </div>
      <div class="memory-stats">
        <h3>Memory</h3>
        <p>Episodic: {memoryStats.episodic}</p>
        <p>Semantic: {memoryStats.semantic}</p>
        <p>Procedural: {memoryStats.procedural}</p>
      </div>
    </aside>

    <section class="chat-panel">
      <div class="messages">
        {#each messages as msg}
          <div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
            <div class="content">{msg.content}</div>
            {#if msg.stats}
              <div class="stats">
                {msg.stats.totalTokens} tokens | {msg.stats.tokensPerSecond.toFixed(1)} tok/s
              </div>
            {/if}
          </div>
        {/each}
        {#if isGenerating}
          <div class="message assistant generating">
            <div class="typing-indicator">...</div>
          </div>
        {/if}
      </div>

      <div class="input-area">
        <textarea
          bind:value={inputText}
          placeholder="Talk to B.A.D.D.I.E..."
          onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          disabled={isGenerating || !isConnected}
        />
        <button onclick={sendMessage} disabled={isGenerating || !isConnected || !inputText.trim()}>
          Send
        </button>
      </div>
    </section>
  </div>
</main>

<style>
  .baddie-app { display: flex; flex-direction: column; height: 100vh; background: #0a0a0f; color: #e0e0e0; font-family: 'Inter', system-ui, sans-serif; }
  header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid #1a1a2e; }
  header h1 { font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg, #a855f7, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .status { font-size: 0.85rem; color: #ef4444; }
  .status.connected { color: #22c55e; }
  .main-content { display: flex; flex: 1; overflow: hidden; }
  .avatar-panel { width: 280px; border-right: 1px solid #1a1a2e; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .avatar-canvas { aspect-ratio: 1; background: #12121a; border-radius: 1rem; display: flex; align-items: center; justify-content: center; }
  .avatar-placeholder { text-align: center; color: #6366f1; font-size: 0.9rem; }
  .memory-stats h3 { font-size: 0.85rem; color: #888; margin-bottom: 0.5rem; }
  .memory-stats p { font-size: 0.8rem; color: #aaa; margin: 0.25rem 0; }
  .chat-panel { flex: 1; display: flex; flex-direction: column; }
  .messages { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .message { max-width: 80%; padding: 0.75rem 1rem; border-radius: 1rem; line-height: 1.5; }
  .message.user { align-self: flex-end; background: #6366f1; color: white; border-bottom-right-radius: 0.25rem; }
  .message.assistant { align-self: flex-start; background: #1a1a2e; border-bottom-left-radius: 0.25rem; }
  .message .stats { font-size: 0.7rem; color: #666; margin-top: 0.5rem; }
  .typing-indicator { animation: pulse 1.5s infinite; color: #6366f1; }
  .input-area { display: flex; padding: 1rem 1.5rem; border-top: 1px solid #1a1a2e; gap: 0.75rem; }
  .input-area textarea { flex: 1; background: #12121a; border: 1px solid #2a2a3e; border-radius: 0.75rem; padding: 0.75rem 1rem; color: #e0e0e0; resize: none; font-family: inherit; font-size: 0.95rem; min-height: 44px; max-height: 120px; }
  .input-area textarea:focus { outline: none; border-color: #6366f1; }
  .input-area button { background: #6366f1; color: white; border: none; border-radius: 0.75rem; padding: 0 1.5rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .input-area button:hover:not(:disabled) { background: #7c3aed; }
  .input-area button:disabled { opacity: 0.5; cursor: not-allowed; }
  @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
</style>
