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
      model?: string;
      apiKey?: string;
      baseUrl?: string;
      providerType?: string;
    };
    const classrooms = body.classrooms ?? [];
    const modelString = body.model;
    const apiKey = body.apiKey;
    const baseUrl = body.baseUrl;
    const providerType = body.providerType;

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

    let topics: string[] = [];

    try {
      const { model: languageModel, apiKey: resolvedKey, baseUrl: resolvedBase } = await resolveModel({
        modelString: modelString || undefined,
        stage: 'chat-adapter',
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
        providerType: providerType || undefined,
      });

      const result = await callLLM(
        {
          model: languageModel,
          messages: [
            { role: 'system', content: 'You are a helpful educational advisor. Suggest diverse, engaging topics that build on the user\'s learning history. Reply in the user\'s language.' },
            { role: 'user', content: promptText },
          ],
          apiKey: resolvedKey,
          baseUrl: resolvedBase,
        },
        'recommend-topics',
      );

      const text = result.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          topics = JSON.parse(jsonMatch[0]);
        } catch {
          log.warn('Failed to parse topics JSON:', text.slice(0, 200));
        }
      }
    } catch (llmErr) {
      log.warn('LLM call failed, using fallback topics:', llmErr);
    }

    // Always fall back to sensible defaults based on classroom names
    const fallbackTopics = classrooms.length > 0
      ? (() => {
          const names = classrooms.map((c) => c.name).filter(Boolean);
          const from = (templates: string[], src: string[]) =>
            templates.slice(0, Math.max(6, templates.length)).map((t, i) =>
              t.replace('{name}', src[i % src.length] || src[0]));
          if (names.length === 1) {
            return from([
              `深入探究：${names[0]}`,
              `${names[0]} 实战项目`,
              `${names[0]} 进阶技巧`,
              `${names[0]} 常见误区解析`,
              `${names[0]} 面试真题`,
              `${names[0]} 教学案例`,
            ], names);
          }
          if (names.length === 2) {
            return [
              `继续深入学习：${names[0]}`,
              `继续深入学习：${names[1]}`,
              `${names[0]} 与 ${names[1]} 的综合应用`,
              `${names[0]} 实战进阶`,
              `${names[1]} 高阶专题`,
              `从 ${names[0]} 到 ${names[1]}：知识串联`,
            ];
          }
          // 3+ classrooms: cross-reference them
          const tpl = [
            (i: number) => `继续深入学习：${names[i % names.length]}`,
            (i: number) => `${names[(i + 1) % names.length]} 进阶专题`,
            (i: number) => `${names[i % names.length]} 与 ${names[(i + 2) % names.length]} 的交叉应用`,
            (i: number) => `${names[(i + 3) % names.length]} 实战案例`,
            (i: number) => `${names[(i + 4) % names.length]} 高阶技巧`,
            (i: number) => `从 ${names[i % names.length]} 到 ${names[(i + 1) % names.length]}：构建知识体系`,
          ];
          return tpl.map((fn, i) => fn(i));
        })()
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
