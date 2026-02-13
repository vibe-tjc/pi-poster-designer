/**
 * Google Nano Banana Pro (Gemini 3 Pro Image Preview) provider
 *
 * Designed for professional asset production with advanced reasoning ("Thinking")
 * to follow complex instructions and render high-fidelity text.
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import type { GeneratedImage, GenerationRequest, ImageProvider } from "./types.js";

export class NanaBananaProProvider implements ImageProvider {
	name = "nano-banana-pro";
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model: string = "gemini-3-pro-image-preview") {
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
						responseModalities: ["IMAGE", "TEXT"],
					},
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Nano Banana Pro API error: ${response.status} - ${error}`);
		}

		const result = await response.json();

		if (!result.candidates || result.candidates.length === 0) {
			throw new Error("No candidates in Nano Banana Pro response");
		}

		const candidate = result.candidates[0];
		if (!candidate.content || !candidate.content.parts) {
			throw new Error("No content parts in Nano Banana Pro response");
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

		throw new Error("No image data found in Nano Banana Pro response");
	}
}

export function createNanaBananaProProvider(): ImageProvider | null {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		return null;
	}
	return new NanaBananaProProvider(apiKey);
}
