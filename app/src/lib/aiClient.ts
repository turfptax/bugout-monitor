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

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', headers, body });
  } catch (fetchErr) {
    if (config.provider === 'lmstudio') {
      throw new Error(
        'Cannot reach LM Studio. Make sure:\n' +
        '1. LM Studio is open with a model loaded\n' +
        '2. The Local Server is running\n' +
        '3. CORS is enabled in server settings\n\n' +
        'Go to Settings → AI Assistant to configure.'
      );
    }
    throw new Error('Network error — check your internet connection.');
  }

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

export interface DiscoveredServer {
  url: string;
  models: string[];
  hostname: string;
}

/**
 * Scan the local network for LM Studio instances.
 * Checks localhost + common LAN IPs on port 1234 (default LM Studio port).
 * Also checks port 1235, 5000, 8080 as common alternatives.
 */
export async function scanForLMStudio(
  onFound?: (server: DiscoveredServer) => void
): Promise<DiscoveredServer[]> {
  const found: DiscoveredServer[] = [];
  const ports = [1234, 1235];
  const timeout = 1500; // ms per probe

  // Build candidate list: localhost + local network IPs
  const candidates: string[] = [
    'localhost',
    '127.0.0.1',
  ];

  // Detect local subnet — try common private ranges
  // We'll probe the /24 subnet of common ranges
  const subnets = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];

  // To find the actual subnet, we can check if any known IPs respond
  // But for speed, we'll probe a focused range (1-30) on each subnet + broadcast common IPs
  for (const subnet of subnets) {
    for (let i = 1; i <= 30; i++) {
      candidates.push(`${subnet}.${i}`);
    }
    // Also check .100-.110 range (common DHCP assignments)
    for (let i = 100; i <= 115; i++) {
      candidates.push(`${subnet}.${i}`);
    }
  }

  // Deduplicate
  const uniqueCandidates = [...new Set(candidates)];

  // Probe each candidate in parallel with a timeout
  const probeOne = async (host: string, port: number): Promise<DiscoveredServer | null> => {
    const url = `http://${host}:${port}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(`${url}/v1/models`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      const models = (json.data || []).map((m: { id: string }) => m.id);
      if (models.length === 0) return null;
      const server: DiscoveredServer = { url, models, hostname: host };
      if (onFound) onFound(server);
      found.push(server);
      return server;
    } catch {
      return null;
    }
  };

  // Probe in batches to avoid overwhelming the network
  const BATCH_SIZE = 20;
  const allProbes: Array<{ host: string; port: number }> = [];
  for (const host of uniqueCandidates) {
    for (const port of ports) {
      allProbes.push({ host, port });
    }
  }

  for (let i = 0; i < allProbes.length; i += BATCH_SIZE) {
    const batch = allProbes.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(({ host, port }) => probeOne(host, port)));
  }

  return found;
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
      let res: Response;
      try {
        res = await fetch(`${base}/v1/models`);
      } catch (fetchErr) {
        // fetch() itself failed — this is almost always CORS or server not running
        const errMsg = fetchErr instanceof Error ? fetchErr.message : '';
        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('CORS')) {
          return {
            ok: false,
            error: `Cannot reach LM Studio at ${base}. Check these steps:\n` +
              `1. Open LM Studio and load a model\n` +
              `2. Go to the "Local Server" tab (left sidebar, </> icon)\n` +
              `3. Click "Start Server" if it's not running\n` +
              `4. Enable CORS: In the server settings, turn ON "Enable CORS" or set the CORS origin to "*"\n` +
              `5. Verify the server is running at ${base}/v1/models in your browser`
          };
        }
        throw fetchErr;
      }
      if (!res.ok) throw new Error(`LM Studio responded with HTTP ${res.status}. Is the server running and a model loaded?`);
      const json = await res.json();
      const models = (json.data || []).map((m: { id: string }) => m.id);
      if (models.length === 0) {
        return { ok: false, error: 'LM Studio server is running but no models are loaded. Load a model in LM Studio first, then try again.' };
      }
      return { ok: true, models };
    }

    // OpenRouter: send a tiny completion to validate key
    const endpoint = getEndpoint(config);
    const headers = getHeaders(config);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: getModel(config),
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      });
    } catch (fetchErr) {
      return { ok: false, error: 'Cannot reach OpenRouter. Check your internet connection.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error?.message || msg;
      } catch { /* use default msg */ }
      if (res.status === 401 || res.status === 403) {
        msg = 'Invalid API key. Check your OpenRouter key and try again.';
      }
      throw new Error(msg);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}
