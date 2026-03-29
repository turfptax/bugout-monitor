export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
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

import { TOOL_DEFINITIONS, executeTool, type ToolCallResult } from './chatTools';

export interface ToolUseEvent {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

/**
 * Send a chat message with tool-use support.
 *
 * Flow:
 * 1. Send messages + tool definitions to the LLM
 * 2. If the LLM returns tool_calls, execute them locally and send results back
 * 3. Repeat until the LLM returns a final text response (no more tool calls)
 * 4. Stream the final text response to the UI
 *
 * Max 5 tool-call rounds to prevent infinite loops.
 */
export async function sendChatMessage(
  config: AiClientConfig,
  messages: ChatMessage[],
  onChunk?: (text: string) => void,
  onToolUse?: (event: ToolUseEvent) => void,
): Promise<string> {
  if (config.provider === 'none') {
    throw new Error('No AI provider configured. Go to Settings to set up OpenRouter or LM Studio.');
  }

  const endpoint = getEndpoint(config);
  const headers = getHeaders(config);
  const model = getModel(config);
  const MAX_TOOL_ROUNDS = 5;

  // Clean incoming messages: strip tool-related history from previous turns
  // Clean incoming messages for compatibility with all models (esp. Qwen on LM Studio)
  // 1. Strip tool-related messages from previous turns
  // 2. Ensure first non-system message is a user message (Qwen template requirement)
  const cleanIncoming: ChatMessage[] = [];
  let foundFirstUser = false;

  for (const m of messages) {
    // Skip tool role messages from previous turns
    if (m.role === 'tool') continue;

    // Strip tool_calls from assistant messages
    if (m.role === 'assistant' && m.tool_calls) {
      cleanIncoming.push({ role: 'assistant', content: m.content || '' });
      continue;
    }

    // Track if we've seen a user message after system
    if (m.role === 'user') foundFirstUser = true;

    // If this is an assistant message and we haven't had a user message yet,
    // inject a synthetic user message so templates don't break
    if (m.role === 'assistant' && !foundFirstUser) {
      cleanIncoming.push({ role: 'user', content: '(continuing conversation)' });
      foundFirstUser = true;
    }

    cleanIncoming.push(m);
  }

  // Working conversation starts clean — tool messages only added within current round
  const conversation: ChatMessage[] = [...cleanIncoming];

  // First, try WITH tools. If the model doesn't support them, fall back to no tools.
  let useTools = true;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // For sending: if tools disabled, use clean conversation without any tool artifacts
    const cleanMessages = useTools
      ? conversation
      : conversation.filter(m => m.role !== 'tool').map(m => {
          if (m.role === 'assistant' && m.tool_calls) {
            return { role: m.role as const, content: m.content || '' };
          }
          return m;
        });

    const requestBody: Record<string, unknown> = {
      model,
      messages: cleanMessages,
      max_tokens: 2048,
      temperature: 0.7,
    };

    // Only include tools if enabled
    if (useTools) {
      requestBody.tools = TOOL_DEFINITIONS;
    }

    // Stream on the last round or when tools are disabled
    if (!useTools || round === MAX_TOOL_ROUNDS - 1) {
      requestBody.stream = !!onChunk;
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (fetchErr) {
      if (config.provider === 'lmstudio') {
        throw new Error(
          'Cannot reach LM Studio. Make sure:\n' +
          '1. LM Studio is open with a model loaded\n' +
          '2. The Local Server is running (click "Start Server")\n' +
          '3. CORS is enabled in Server Settings → Enable CORS\n' +
          `4. Server URL matches settings: ${endpoint}\n\n` +
          'Go to Settings → AI Assistant to configure.'
        );
      }
      throw new Error('Network error — check your internet connection.');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const status = response.status;

      // If 400 and we had tools — model doesn't support function calling
      // Disable tools and retry this round
      if (status === 400 && useTools) {
        console.warn(`Model returned 400 with tools — disabling tool use and retrying`);
        useTools = false;
        round--; // retry this round
        continue;
      }

      // Parse error details for a better message
      let errorMsg = `HTTP ${status}`;
      let errorDetail = '';
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.error?.message || parsed.message || errorMsg;
        errorDetail = parsed.error?.type || parsed.error?.code || '';
      } catch {
        if (errorText) errorDetail = errorText.slice(0, 300);
      }

      // Provide helpful context based on status code
      if (status === 400) {
        errorMsg += '\n\nThe model rejected the request. Try a different model in Settings.';
        if (errorDetail) errorMsg += `\n\nDetail: ${errorDetail}`;
      } else if (status === 401) {
        errorMsg = 'Invalid API key. Check your OpenRouter key in Settings.';
      } else if (status === 402) {
        errorMsg = 'OpenRouter account has insufficient credits.';
      } else if (status === 429) {
        errorMsg = 'Rate limited — wait a moment and try again.';
      } else if (status === 503) {
        errorMsg = 'Model is temporarily unavailable. Try again or switch models.';
      }

      throw new Error(errorMsg);
    }

    // If streaming was requested and enabled, handle SSE stream
    if (requestBody.stream && onChunk) {
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let fullText = '';
        let sseBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const sseLines = sseBuffer.split('\n');
          sseBuffer = sseLines.pop() || '';
          for (const sseLine of sseLines) {
            const trimmed = sseLine.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const sseData = trimmed.slice(6);
            if (sseData === '[DONE]') continue;
            try {
              const parsed = JSON.parse(sseData);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) { fullText += delta; onChunk(delta); }
            } catch { /* skip malformed chunks */ }
          }
        }
        return fullText;
      }
    }

    // Parse non-streaming JSON response
    const json = await response.json();
    const choice = json.choices?.[0];

    if (!choice) throw new Error('No response from model');

    const message = choice.message;

    // Check if the model wants to call tools
    if (useTools && message.tool_calls && message.tool_calls.length > 0) {
      // Add the assistant's tool-calling message to the conversation
      conversation.push({
        role: 'assistant',
        content: message.content || null,
        tool_calls: message.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          fnArgs = {};
        }

        // Execute the tool
        const result = await executeTool(fnName, fnArgs);

        // Notify the UI
        if (onToolUse) {
          onToolUse({ name: fnName, args: fnArgs, result });
        }

        // Add the tool result to the conversation
        conversation.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: fnName,
          content: result,
        });
      }

      // Continue the loop — send tool results back to the model
      continue;
    }

    // No tool calls — this is the final text response
    const textContent = message.content || '';

    // If we have a chunk handler, simulate streaming from the already-received text
    if (onChunk && textContent) {
      const words = textContent.split(/(\s+)/);
      for (const word of words) {
        onChunk(word);
        await new Promise(r => setTimeout(r, 15));
      }
    }

    return textContent;
  }

  return 'I tried to use too many tools in a row. Please try a simpler request.';
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
