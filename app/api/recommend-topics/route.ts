/**
 * POST /api/recommend-topics
 *
 * Given a list of recently accessed classrooms (name + scene titles),
 * calls the LLM to generate recommended learning topics for the user
 * to explore next.
 *
 * Request:
 *   { classrooms: { name: string; description?: string; sceneTitles: string[] }[] }
 *
 * Response:
 *   { topics: string[] }  — up to 6 recommended topic sentences
 */
import { NextRequest } from 'next/server';
import { apiError } from '@/lib/server/api-response';
import { resolveModel } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';

const log = createLogger('RecommendTopics');

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      classrooms?: { name: string; description?: string; sceneTitles?: string[] }[];
    };
    const classrooms = body.classrooms ?? [];

    // Build a compact summary of what the user has been learning
    const summaryLines = classrooms.map((c) => {
      const scenes = c.sceneTitles?.length ? ` (scenes: ${c.sceneTitles.slice(0, 8).join(', ')})` : '';
      return `- ${c.name}${c.description ? `: ${c.description}` : ''}${scenes}`;
    });
    const historySummary = summaryLines.length > 0
      ? summaryLines.join('\n')
      : '(no recent classrooms — suggest broad learning topics)';

    const promptText = `Based on the user's recent learning history, suggest 6 engaging topics they could study next. Each topic should be a short, self-contained phrase (10-20 words in Chinese) that would make a good classroom subject.

Recent learning history:
${historySummary}

Return ONLY a JSON array of strings, no explanation, no markdown:
["topic 1", "topic 2", "topic 3", "topic 4", "topic 5", "topic 6"]`;

    const { model: languageModel, apiKey, baseUrl, providerId } = await resolveModel({
      modelString: undefined, // use default
      stage: 'chat-adapter',
    });

    const result = await callLLM(
      {
        model: languageModel,
        messages: [
          { role: 'system', content: 'You are a helpful educational advisor. Suggest diverse, engaging topics that build on the user\'s learning history. Reply in the user\'s language.' },
          { role: 'user', content: promptText },
        ],
        apiKey,
        baseUrl,
      },
      'recommend-topics',
    );

    const text = result.text || '[]';
    // Try to parse JSON array from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let topics: string[] = [];
    if (jsonMatch) {
      try {
        topics = JSON.parse(jsonMatch[0]);
      } catch {
        log.warn('Failed to parse topics JSON:', text.slice(0, 200));
      }
    }

    // Always fall back to at least 3 sensible defaults
    const fallbackTopics = classrooms.length > 0
      ? classrooms.slice(0, 3).map((c) => `继续深入学习：${c.name}`)
      : ['选择一个你感兴趣的学科开始学习'];

    topics = topics.filter((t) => typeof t === 'string' && t.length > 0);
    if (topics.length < 1) topics = fallbackTopics;

    return new Response(JSON.stringify({ topics: topics.slice(0, 6) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log.error('Recommend topics failed:', error);
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : 'Failed');
  }
}
