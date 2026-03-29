export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiClientConfig {
  provider: 'openrouter' | 'lmstudio' | 'none';
  openrouterKey?: string;
  openrouterModel?: string;
  lmstudioUrl?: string;
  lmstudioModel?: string;
}

function getEndpoint(config: AiClientConfig): string {
  if (config.provider === 'openrouter') {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }
  const base = (config.lmstudioUrl || 'http://localhost:1234').replace(/\/+$/, '');
  return `${base}/v1/chat/completions`;
}

function getHeaders(config: AiClientConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.provider === 'openrouter' && config.openrouterKey) {
    headers['Authorization'] = `Bearer ${config.openrouterKey}`;
    headers['HTTP-Referer'] = 'https://bugout-monitor.app';
    headers['X-Title'] = 'Bugout Monitor';
  }
  return headers;
}

function getModel(config: AiClientConfig): string {
  if (config.provider === 'openrouter') {
    return config.openrouterModel || 'google/gemini-2.0-flash-001';
  }
  return config.lmstudioModel || 'default';
}

export async function sendChatMessage(
  config: AiClientConfig,
  messages: ChatMessage[],
  onChunk?: (text: string) => void
): Promise<string> {
  if (config.provider === 'none') {
    throw new Error('No AI provider configured. Go to Settings to set up OpenRouter or LM Studio.');
  }

  const endpoint = getEndpoint(config);
  const headers = getHeaders(config);
  const model = getModel(config);

  const body = JSON.stringify({
    model,
    messages,
    stream: !!onChunk,
    max_tokens: 2048,
    temperature: 0.7,
  });

  const response = await fetch(endpoint, { method: 'POST', headers, body });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorMsg = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      errorMsg = parsed.error?.message || parsed.message || errorMsg;
    } catch {
      if (errorText) errorMsg += `: ${errorText.slice(0, 200)}`;
    }
    throw new Error(errorMsg);
  }

  // Non-streaming
  if (!onChunk) {
    const json = await response.json();
    return json.choices?.[0]?.message?.content || '';
  }

  // Streaming SSE
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body for streaming');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  return fullText;
}

export async function testConnection(
  config: AiClientConfig
): Promise<{ ok: boolean; error?: string; models?: string[] }> {
  if (config.provider === 'none') {
    return { ok: false, error: 'No provider selected' };
  }

  try {
    if (config.provider === 'lmstudio') {
      const base = (config.lmstudioUrl || 'http://localhost:1234').replace(/\/+$/, '');
      const res = await fetch(`${base}/v1/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const models = (json.data || []).map((m: { id: string }) => m.id);
      return { ok: true, models };
    }

    // OpenRouter: send a tiny completion to validate key
    const endpoint = getEndpoint(config);
    const headers = getHeaders(config);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: getModel(config),
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error?.message || msg;
      } catch { /* use default msg */ }
      throw new Error(msg);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}
