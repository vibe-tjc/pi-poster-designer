/**
 * OpenAI DALL-E image generation provider
 */

import type { GeneratedImage, GenerationRequest, ImageProvider } from "./types.js";

export class OpenAIProvider implements ImageProvider {
	name = "openai";
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model: string = "dall-e-3") {
		this.apiKey = apiKey;
		this.model = model;
	}

	async generate(request: GenerationRequest): Promise<GeneratedImage> {
		// Map dimensions to DALL-E supported sizes
		const size = this.mapSize(request.width, request.height);

		const response = await fetch("https://api.openai.com/v1/images/generations", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: this.model,
				prompt: request.prompt,
				n: 1,
				size: size,
				response_format: "b64_json",
				quality: "hd",
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI API error: ${response.status} - ${error}`);
		}

		const result = await response.json();

		if (!result.data || result.data.length === 0) {
			throw new Error("No image data in OpenAI response");
		}

		const imageData = result.data[0];
		return {
			data: Buffer.from(imageData.b64_json, "base64"),
			mimeType: "image/png",
			filename: `poster-${Date.now()}.png`,
		};
	}

	private mapSize(width: number, height: number): string {
		// DALL-E 3 supported sizes: 1024x1024, 1024x1792, 1792x1024
		const ratio = width / height;

		if (ratio > 1.5) {
			return "1792x1024"; // Landscape
		} else if (ratio < 0.67) {
			return "1024x1792"; // Portrait
		} else {
			return "1024x1024"; // Square
		}
	}
}

export function createOpenAIProvider(): ImageProvider | null {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return null;
	}
	return new OpenAIProvider(apiKey);
}
