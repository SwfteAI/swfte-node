/**
 * Comprehensive Gateway Test Script - JavaScript/TypeScript SDK
 * Tests all modalities: Chat, Embeddings, Images, TTS, STT
 * Tests all providers: OpenAI, Anthropic, RunPod
 */
import { SwfteClient } from '../src/client';
import * as fs from 'fs';

const client = new SwfteClient({
  apiKey: 'test-api-key',
  baseUrl: 'http://localhost:3388/v2/gateway',
  workspaceId: 'test-workspace'
});

// ==================== PROPRIETARY PROVIDER TESTS ====================

async function testOpenAIChat(): Promise<boolean> {
  console.log('\n=== Test: OpenAI Chat ===');
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: "Say 'Hello from OpenAI' in exactly 3 words" }],
    max_tokens: 20,
    temperature: 0
  });
  const content = response.choices[0].message.content;
  console.log(`Response: ${content}`);
  if (!content) throw new Error('No content in response');
  console.log('PASSED: OpenAI Chat');
  return true;
}

async function testAnthropicChat(): Promise<boolean> {
  console.log('\n=== Test: Anthropic Chat ===');
  const response = await client.chat.completions.create({
    model: 'claude-3-haiku-20240307',
    messages: [{ role: 'user', content: "Say 'Hello from Claude' in exactly 3 words" }],
    max_tokens: 20,
    temperature: 0
  });
  const content = response.choices[0].message.content;
  console.log(`Response: ${content}`);
  if (!content) throw new Error('No content in response');
  console.log('PASSED: Anthropic Chat');
  return true;
}

async function testEmbeddings(): Promise<boolean> {
  console.log('\n=== Test: Embeddings ===');
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'Hello world'
  });
  const dims = response.data[0].embedding.length;
  console.log(`Embedding dimensions: ${dims}`);
  if (dims !== 1536) throw new Error(`Expected 1536 dims, got ${dims}`);
  console.log('PASSED: Embeddings');
  return true;
}

async function testImageGeneration(): Promise<boolean> {
  console.log('\n=== Test: DALL-E Image Generation ===');
  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt: 'A simple blue square on white background',
    size: '1024x1024',
    n: 1
  });
  const url = response.data[0].url;
  console.log(`Image URL: ${url?.substring(0, 80)}...`);
  if (!url) throw new Error('No URL in response');
  console.log('PASSED: Image Generation');
  return true;
}

async function testTTS(): Promise<boolean> {
  console.log('\n=== Test: OpenAI Text-to-Speech ===');
  const audioData = await client.audio.speech.create({
    model: 'tts-1',
    input: 'Hello, this is a test of OpenAI text to speech.',
    voice: 'alloy'
  });
  console.log(`Audio size: ${audioData.byteLength} bytes`);
  if (audioData.byteLength === 0) throw new Error('No audio data');
  // Save audio to file
  fs.writeFileSync('/tmp/test_speech_js.mp3', Buffer.from(audioData));
  console.log('PASSED: OpenAI TTS (saved to /tmp/test_speech_js.mp3)');
  return true;
}

async function testSTT(): Promise<boolean> {
  console.log('\n=== Test: OpenAI Speech-to-Text ===');
  const audioBuffer = fs.readFileSync('/tmp/test_speech_js.mp3');
  const transcript = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file: new Blob([audioBuffer])
  });
  console.log(`Transcript: ${transcript.text}`);
  if (!transcript.text) throw new Error('No transcript text');
  console.log('PASSED: OpenAI STT');
  return true;
}

async function testStreamingChat(): Promise<boolean> {
  console.log('\n=== Test: Streaming Chat ===');
  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Count from 1 to 5, one number per line' }],
    max_tokens: 50,
    stream: true
  });
  let content = '';
  process.stdout.write('Streaming: ');
  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    // Handle both delta (streaming) and message (wrapped) response formats
    if (choice?.delta?.content) {
      content += choice.delta.content;
      process.stdout.write(choice.delta.content);
    } else if (choice?.message?.content) {
      content += choice.message.content;
      process.stdout.write(choice.message.content);
    }
  }
  console.log();
  if (content.length === 0) throw new Error('No streamed content');
  console.log('PASSED: Streaming Chat');
  return true;
}

async function testErrorHandling(): Promise<boolean> {
  console.log('\n=== Test: Error Handling ===');
  try {
    await client.chat.completions.create({
      model: 'invalid-model-xyz-12345',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    console.log('FAILED: Should have thrown');
    return false;
  } catch (error) {
    console.log(`Got expected error: ${(error as Error).constructor.name}`);
    console.log('PASSED: Error Handling');
    return true;
  }
}

// ==================== RUNPOD TESTS ====================

const QWEN_DEPLOYMENT_ID = process.env.QWEN_DEPLOYMENT_ID || '';
const TTS_DEPLOYMENT_ID = process.env.TTS_DEPLOYMENT_ID || '';
const STT_DEPLOYMENT_ID = process.env.STT_DEPLOYMENT_ID || '';
const COMFYUI_DEPLOYMENT_ID = process.env.COMFYUI_DEPLOYMENT_ID || '';

async function testQwenChat(): Promise<boolean | null> {
  if (!QWEN_DEPLOYMENT_ID) {
    console.log('\n=== Test: Qwen 2.5 Chat (RunPod) - SKIPPED (no deployment ID) ===');
    return null;
  }

  console.log('\n=== Test: Qwen 2.5 Chat (RunPod) ===');
  const response = await client.chat.completions.create({
    model: `deployed:${QWEN_DEPLOYMENT_ID}`,
    messages: [{ role: 'user', content: 'Explain machine learning in 2 sentences' }],
    max_tokens: 100,
    temperature: 0.7
  });
  const content = response.choices[0].message.content;
  console.log(`Response: ${content}`);
  if (!content) throw new Error('No content');
  console.log('PASSED: Qwen 2.5 Chat');
  return true;
}

async function testComfyUIImage(): Promise<boolean | null> {
  if (!COMFYUI_DEPLOYMENT_ID) {
    console.log('\n=== Test: ComfyUI SDXL Image (RunPod) - SKIPPED (no deployment ID) ===');
    return null;
  }

  console.log('\n=== Test: ComfyUI SDXL Image (RunPod) ===');
  const response = await client.images.generate({
    model: 'comfy:sdxl',
    prompt: 'A futuristic city skyline at sunset, cyberpunk style',
    size: '1024x1024',
    n: 1
  });
  const url = response.data[0].url;
  console.log(`Image URL: ${url?.substring(0, 80)}...`);
  if (!url) throw new Error('No URL');
  console.log('PASSED: ComfyUI SDXL');
  return true;
}

async function testRunPodTTS(): Promise<boolean | null> {
  if (!TTS_DEPLOYMENT_ID) {
    console.log('\n=== Test: RunPod TTS - SKIPPED (no deployment ID) ===');
    return null;
  }

  console.log('\n=== Test: RunPod TTS (XTTS-v2) ===');
  const audioData = await client.audio.speech.create({
    model: `deployed:${TTS_DEPLOYMENT_ID}`,
    input: 'Hello from self-hosted text to speech on RunPod.',
    voice: 'alloy'
  });
  console.log(`Audio size: ${audioData.byteLength} bytes`);
  fs.writeFileSync('/tmp/test_js_runpod_speech.mp3', Buffer.from(audioData));
  if (audioData.byteLength === 0) throw new Error('No audio');
  console.log('PASSED: RunPod TTS');
  return true;
}

async function testRunPodSTT(): Promise<boolean | null> {
  if (!STT_DEPLOYMENT_ID) {
    console.log('\n=== Test: RunPod STT - SKIPPED (no deployment ID) ===');
    return null;
  }

  console.log('\n=== Test: RunPod STT (Whisper) ===');
  const audioFile = fs.existsSync('/tmp/test_js_runpod_speech.mp3')
    ? '/tmp/test_js_runpod_speech.mp3'
    : '/tmp/test_speech_js.mp3';
  const audioBuffer = fs.readFileSync(audioFile);
  const transcript = await client.audio.transcriptions.create({
    model: `deployed:${STT_DEPLOYMENT_ID}`,
    file: new Blob([audioBuffer])
  });
  console.log(`Transcript: ${transcript.text}`);
  if (!transcript.text) throw new Error('No transcript');
  console.log('PASSED: RunPod STT');
  return true;
}

// ==================== MAIN ====================

interface TestResult {
  name: string;
  fn: () => Promise<boolean | null>;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Comprehensive Gateway Test - JavaScript SDK');
  console.log(`Base URL: ${client.baseUrl}`);
  console.log(`Workspace: ${client.workspaceId}`);
  console.log('='.repeat(60));

  const proprietaryTests: TestResult[] = [
    { name: 'OpenAI Chat', fn: testOpenAIChat },
    { name: 'Anthropic Chat', fn: testAnthropicChat },
    { name: 'Embeddings', fn: testEmbeddings },
    { name: 'DALL-E Image', fn: testImageGeneration },
    { name: 'OpenAI TTS', fn: testTTS },
    { name: 'OpenAI STT', fn: testSTT },
    { name: 'Streaming Chat', fn: testStreamingChat },
    { name: 'Error Handling', fn: testErrorHandling },
  ];

  const runpodTests: TestResult[] = [
    { name: 'Qwen 2.5 Chat', fn: testQwenChat },
    { name: 'ComfyUI SDXL', fn: testComfyUIImage },
    { name: 'RunPod TTS', fn: testRunPodTTS },
    { name: 'RunPod STT', fn: testRunPodSTT },
  ];

  const allTests = [...proprietaryTests, ...runpodTests];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of allTests) {
    try {
      const result = await test.fn();
      if (result === true) {
        passed++;
      } else if (result === null) {
        skipped++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`FAILED: ${test.name}: ${error}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
