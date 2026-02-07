/**
 * Image generation provider types
 */

export interface GeneratedImage {
	data: Buffer;
	mimeType: string;
	filename: string;
}

export interface GenerationRequest {
	prompt: string;
	width: number;
	height: number;
	style?: string;
}

export interface ImageProvider {
	name: string;
	generate(request: GenerationRequest): Promise<GeneratedImage>;
}

export interface ProviderConfig {
	name: string;
	apiKeyEnv: string;
	enabled: boolean;
}
