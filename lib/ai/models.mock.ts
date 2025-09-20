import type { LanguageModel } from 'ai';

const createMockModel = (): LanguageModel => {
    return {
        specificationVersion: 'v2',
        provider: 'mock',
        modelId: 'mock-model',
        defaultObjectGenerationMode: 'tool',
        supportedUrls: [],
        supportsImageUrls: false,
        supportsStructuredOutputs: false,
        doGenerate: async () => ({
            rawCall: { rawPrompt: null, rawSettings: {} },
            finishReason: 'stop',
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [{ type: 'text', text: 'My mock model is happy talking!' }],
            warnings: [],
        }),
        // Provide a streaming implementation that matches AI SDK v2 chunk protocol
        doStream: async () => ({
            stream: new ReadableStream({
                start(controller) {
                    const id = 'mock-id';
                    // signal start of a text message
                    controller.enqueue({ id, type: 'text-start' });
                    // emit one or more text deltas
                    controller.enqueue({ id, type: 'text-delta', delta: 'My mock model is happy talking!' });
                    // end of the text message
                    controller.enqueue({ id, type: 'text-end' });
                    // final finish event with usage
                    controller.enqueue({
                        type: 'finish',
                        finishReason: 'stop',
                        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
                    });
                    controller.close();
                },
            }),
            rawCall: { rawPrompt: null, rawSettings: {} },
        }),
    } as unknown as LanguageModel;
};

export const chatModel = createMockModel();
export const reasoningModel = createMockModel();
export const titleModel = createMockModel();
export const artifactModel = createMockModel();
