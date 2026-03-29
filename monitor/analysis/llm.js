/**
 * OpenRouter LLM client for threat analysis.
 */

import { getSystemPrompt, buildUserPrompt } from './prompt.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Send collected threat data to OpenRouter for LLM analysis.
 * Returns structured threat assessment or throws on failure.
 */
export async function analyzeThreats(solarData, nuclearData, weatherData, donkiData, swpcAlertsData, gdeltData, droughtData, economicData) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in .env');
  }

  const [systemPrompt, userPrompt] = await Promise.all([
    getSystemPrompt(),
    buildUserPrompt(solarData, nuclearData, weatherData, donkiData, swpcAlertsData, gdeltData, droughtData, economicData),
  ]);

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bugout-monitor.local',
      'X-Title': 'Bugout Threat Monitor',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
    throw new Error(`OpenRouter returned ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  if (!result.choices?.[0]?.message?.content) {
    throw new Error('OpenRouter response missing choices[0].message.content');
  }

  let content = result.choices[0].message.content.trim();

  // Strip markdown code fences if the model wraps in ```json
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const assessment = JSON.parse(content);

  // Validate structure
  const required = ['solar', 'nuclear', 'weather', 'overall'];
  for (const key of required) {
    if (!assessment[key]) {
      throw new Error(`Assessment missing required key: ${key}`);
    }
    if (typeof assessment[key].level !== 'number' || !assessment[key].label || !assessment[key].reasoning) {
      throw new Error(`Assessment.${key} missing level, label, or reasoning`);
    }
    // Clamp level to 1-10
    assessment[key].level = Math.max(1, Math.min(10, Math.round(assessment[key].level)));
  }

  // Validate Diamond framework (optional — don't fail if missing, but clamp if present)
  if (assessment.diamond) {
    const diamondKeys = ['environmental', 'climate', 'hostile', 'trade', 'response', 'composite'];
    for (const key of diamondKeys) {
      if (assessment.diamond[key] && typeof assessment.diamond[key].level === 'number') {
        assessment.diamond[key].level = Math.max(1, Math.min(10, Math.round(assessment.diamond[key].level)));
      }
    }
    // Ensure composite has a label
    if (assessment.diamond.composite && !assessment.diamond.composite.label) {
      const l = assessment.diamond.composite.level;
      if (l <= 2) assessment.diamond.composite.label = 'Minimal';
      else if (l <= 4) assessment.diamond.composite.label = 'Low';
      else if (l <= 6) assessment.diamond.composite.label = 'Elevated';
      else if (l <= 8) assessment.diamond.composite.label = 'High';
      else if (l <= 9) assessment.diamond.composite.label = 'Severe';
      else assessment.diamond.composite.label = 'Extreme';
    }
  }

  // Add metadata
  assessment._meta = {
    model,
    source: 'llm',
    tokensUsed: result.usage?.total_tokens,
  };

  return assessment;
}
