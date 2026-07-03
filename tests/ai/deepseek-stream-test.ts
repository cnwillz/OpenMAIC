/**
 * Quick test: does DeepSeek V4 Flash return anything via streaming with a short prompt?
 * Run: npx tsx tests/ai/deepseek-stream-test.ts
 */
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { streamLLM } from '@/lib/ai/llm';

const MODEL = 'deepseek-v4-flash';
const BASE_URL = 'https://api.deepseek.com/v1';

async function testStreaming() {
  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY not set');
    process.exit(1);
  }

  // Test 1: Direct AI SDK call (no thinking config)
  console.log('\n=== Test 1: Direct streamText ===');
  try {
    const openai = createOpenAI({ apiKey, baseURL: BASE_URL });
    const model = openai.chat(MODEL);
    const result = streamText({
      model,
      messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
    });
    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
      process.stdout.write(chunk);
    }
    console.log('\n--- Result ---');
    console.log('Full text:', JSON.stringify(text));
    console.log('Length:', text.length);
  } catch (e) {
    console.error('Test 1 error:', e);
  }

  // Test 2: with wrapped model (extractReasoningMiddleware)
  console.log('\n=== Test 2: Wrapped model (like the app does) ===');
  try {
    const openai = createOpenAI({ apiKey, baseURL: BASE_URL });
    const raw = openai.chat(MODEL);
    const { wrapLanguageModel, extractReasoningMiddleware } = await import('ai');
    const model = wrapLanguageModel({
      model: raw,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
    const result = streamText({
      model,
      messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
    });
    let text = '';
    let reasoning = '';
    for await (const chunk of result.textStream) {
      text += chunk;
      process.stdout.write(chunk);
    }
    if (result.reasoningStream) {
      for await (const r of result.reasoningStream) {
        reasoning += r;
      }
    }
    console.log('\n--- Result ---');
    console.log('Full text:', JSON.stringify(text));
    console.log('Reasoning:', JSON.stringify(reasoning));
    console.log('Length:', text.length);
  } catch (e) {
    console.error('Test 2 error:', e);
  }

  // Test 3: With thinking DISABLED (injected via compatFetch)
  console.log('\n=== Test 3: Thinking disabled ===');
  try {
    const openai = createOpenAI({ apiKey, baseURL: BASE_URL });
    const raw = openai.chat(MODEL);
    const { wrapLanguageModel, extractReasoningMiddleware } = await import('ai');
    const model = wrapLanguageModel({
      model: raw,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
    // Inject disabled thinking into body via custom fetch
    const compatFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === 'string') {
        const body = JSON.parse(init.body);
        body.thinking = { type: 'disabled' };
        init = { ...init, body: JSON.stringify(body) };
      }
      return globalThis.fetch(url, init);
    };
    const openai2 = createOpenAI({
      apiKey,
      baseURL: BASE_URL,
      fetch: compatFetch as typeof globalThis.fetch,
    });
    const raw2 = openai2.chat(MODEL);
    const model2 = wrapLanguageModel({
      model: raw2,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
    const result = streamText({
      model: model2,
      messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
    });
    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
      process.stdout.write(chunk);
    }
    console.log('\n--- Result ---');
    console.log('Full text:', JSON.stringify(text));
    console.log('Length:', text.length);
  } catch (e) {
    console.error('Test 3 error:', e);
  }
}

testStreaming().catch(console.error);
