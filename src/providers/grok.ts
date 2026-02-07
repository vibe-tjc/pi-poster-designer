/**
 * xAI Grok image generation provider
 */

import type { GeneratedImage, GenerationRequest, ImageProvider } from "./types.js";

export class GrokProvider implements ImageProvider {
	name = "grok";
	private apiKey: string;
	private model: string;

	constructor(apiKey: string, model: string = "grok-2-image") {
		this.apiKey = apiKey;
		this.model = model;
	}

	async generate(request: GenerationRequest): Promise<GeneratedImage> {
		const response = await fetch("https://api.x.ai/v1/images/generations", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: this.model,
				prompt: request.prompt,
				n: 1,
				response_format: "b64_json",
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Grok API error: ${response.status} - ${error}`);
		}

		const result = await response.json();

		if (!result.data || result.data.length === 0) {
			throw new Error("No image data in Grok response");
		}

		const imageData = result.data[0];
		return {
			data: Buffer.from(imageData.b64_json, "base64"),
			mimeType: "image/png",
			filename: `poster-${Date.now()}.png`,
		};
	}
}

export function createGrokProvider(): ImageProvider | null {
	const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
	if (!apiKey) {
		return null;
	}
	return new GrokProvider(apiKey);
}
