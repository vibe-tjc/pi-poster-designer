/**
 * Default configuration for poster designer
 */

export interface StyleConfig {
	id: string;
	name: string;
	description: string;
	promptTemplate: string;
}

export interface SizeConfig {
	width: number;
	height: number;
	name: string;
}

export interface ProviderConfigItem {
	apiKeyEnv: string;
	enabled: boolean;
	defaultModel: string;
	availableModels: string[];
}

export interface Config {
	defaultSize: SizeConfig;
	sizes: Record<string, SizeConfig>;
	styles: StyleConfig[];
	defaultProvider: string;
	providers: Record<string, ProviderConfigItem>;
}

export const defaultConfig: Config = {
	defaultSize: {
		width: 2480,
		height: 3508,
		name: "A4 (300dpi)",
	},
	sizes: {
		a4: { width: 2480, height: 3508, name: "A4 (300dpi)" },
		"a4-landscape": { width: 3508, height: 2480, name: "A4 Landscape" },
		instagram: { width: 1080, height: 1080, name: "Instagram Square" },
		"instagram-story": { width: 1080, height: 1920, name: "Instagram Story" },
		facebook: { width: 1200, height: 630, name: "Facebook Post" },
	},
	styles: [
		{
			id: "tjc-style",
			name: "真耶穌教會風格",
			description: "符合活動主題與真耶穌教會的風格，排除一切不適合的設計",
			promptTemplate: `Design a professional event poster for True Jesus Church.
Style: Clean, reverent, dignified.
Use appropriate religious imagery that aligns with True Jesus Church values.
Avoid: crosses with human figures, Catholic/Orthodox iconography, overly decorative or flashy elements, anything inappropriate for a conservative Christian church.
Colors: Prefer blue, white, gold, or earth tones.
Typography: Clear, readable, professional.
Include subtle Christian elements like dove, bible, wheat, or simple geometric patterns.

Event details:
{eventInfo}`,
		},
		{
			id: "christian-general",
			name: "一般基督教風格",
			description: "符合活動主題與多數基督教可接受的設計元素，避免過度偏激的設計",
			promptTemplate: `Design an event poster suitable for a Christian church event.
Style: Modern, welcoming, spiritually uplifting.
Use general Christian design elements that are broadly acceptable across denominations.
Include: soft lighting, nature elements, community/fellowship themes, subtle religious symbols.
Avoid: controversial imagery, extreme or provocative designs, denominational-specific symbols.
Colors: Warm and inviting palette.
Typography: Modern yet respectful.

Event details:
{eventInfo}`,
		},
		{
			id: "creative-free",
			name: "創意自由風格",
			description: "符合活動即可，可以天馬行空的設計",
			promptTemplate: `Design a creative and eye-catching event poster.
Style: Bold, innovative, artistic freedom.
Be creative with colors, typography, and visual elements.
Match the event theme with imaginative interpretations.
Can use abstract art, modern design trends, unique layouts, striking visuals.
Make it memorable and visually impactful while still clearly communicating the event information.

Event details:
{eventInfo}`,
		},
	],
	defaultProvider: "gemini",
	providers: {
		gemini: {
			apiKeyEnv: "GEMINI_API_KEY",
			enabled: true,
			defaultModel: "gemini-2.5-flash-image",
			availableModels: [
				"gemini-2.5-flash-image",
				"gemini-3-pro-image-preview",
				"imagen-4.0-generate-001",
			],
		},
		"nano-banana-pro": {
			apiKeyEnv: "GEMINI_API_KEY",
			enabled: true,
			defaultModel: "nano-banana-pro",
			availableModels: ["nano-banana-pro"],
		},
		grok: {
			apiKeyEnv: "GROK_API_KEY",
			enabled: true,
			defaultModel: "grok-2-image",
			availableModels: ["grok-2-image"],
		},
		openai: {
			apiKeyEnv: "OPENAI_API_KEY",
			enabled: true,
			defaultModel: "dall-e-3",
			availableModels: ["dall-e-3", "dall-e-2"],
		},
	},
};
