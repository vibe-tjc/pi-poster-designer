/**
 * Google Gemini / Nano Banana image generation provider
 *
 * Uses Gemini 2.5 Flash Image (Nano Banana) model by default.
 * Designed for speed and efficiency, optimized for high-volume, low-latency tasks.
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import type { GeneratedImage, GenerationRequest, ImageProvider } from "./types.js";

export class GeminiProvider implements ImageProvider {
	name = "gemini";
	model: string;
	private apiKey: string;

	constructor(apiKey: string, model: string = "gemini-2.5-flash-image") {
		this.apiKey = apiKey;
		this.model = model;
	}

	async generate(request: GenerationRequest): Promise<GeneratedImage> {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: request.prompt,
								},
							],
						},
					],
					generationConfig: {
						responseModalities: ["image", "text"],
					},
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Gemini API error: ${response.status} - ${error}`);
		}

		const result = await response.json();

		if (!result.candidates || result.candidates.length === 0) {
			throw new Error("No candidates in Gemini response");
		}

		const candidate = result.candidates[0];
		if (!candidate.content || !candidate.content.parts) {
			throw new Error("No content parts in Gemini response");
		}

		for (const part of candidate.content.parts) {
			if (part.inlineData && part.inlineData.data) {
				return {
					data: Buffer.from(part.inlineData.data, "base64"),
					mimeType: part.inlineData.mimeType || "image/png",
					filename: `poster-${Date.now()}.png`,
				};
			}
		}

		throw new Error("No image data found in Gemini response");
	}
}

export function createGeminiProvider(model?: string): ImageProvider | null {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		return null;
	}
	return new GeminiProvider(apiKey, model);
}
