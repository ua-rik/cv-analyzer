import OpenAI from 'openai';

export interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface LLMScore {
  id: string;
  score: number;
  evidence: string[];
}

export interface LLMResponse {
  scores: LLMScore[];
  notes: string[];
}

function getClient(apiKey?: string) {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('Missing OpenAI API key');
  }
  return new OpenAI({ apiKey: key });
}

export async function evaluateWithLLM(params: {
  resumeText: string;
  criteria: Criterion[];
  apiKey?: string;
}): Promise<LLMResponse> {
  const { resumeText, criteria, apiKey } = params;
  const client = getClient(apiKey);
  const model = process.env.LLM_MODEL ?? 'gpt-4.1-mini';
  const prompt = `Оціни кандидата за критеріями. Поверни тільки JSON:
{"scores":[{"id":"...", "score":1-10, "evidence":["..."]}], "notes":["..."]}

Якщо інформації бракує — score=1 і reason "insufficient evidence".

Критерії: ${JSON.stringify(criteria)}
Резюме: ${resumeText}`;

  const response = await client.responses.create({
    model,
    input: prompt,
    response_format: { type: 'json_object' }
  });

  const content = response.output?.[0]?.content?.[0];
  const text = content && 'text' in content ? content.text : response.output_text;
  if (!text) {
    throw new Error('LLM did not return any text');
  }

  const parsed = JSON.parse(text) as LLMResponse;
  return {
    scores: parsed.scores ?? [],
    notes: parsed.notes ?? []
  };
}
