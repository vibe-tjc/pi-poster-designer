/**
 * Poster Designer Extension for Pi
 *
 * Automatically generates event invitation posters using AI image generation.
 * Supports multiple styles and providers (Gemini, Grok, OpenAI).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "@sinclair/typebox";
import { defaultConfig, type Config } from "./config.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createGrokProvider } from "./providers/grok.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createNanaBananaProProvider } from "./providers/nano-banana-pro.js";
import type { ImageProvider } from "./providers/types.js";

// Tool parameters schema
const DesignPosterParams = Type.Object({
	eventInfo: Type.String({
		description: "活動資訊，包含主題、主領、時間、地點、活動程序等",
	}),
	styles: Type.Optional(
		Type.Array(Type.String(), {
			description: "指定要使用的風格 ID 列表，不指定則使用所有預設風格",
		}),
	),
	size: Type.Optional(
		Type.String({
			description: "圖片尺寸：a4, a4-landscape, instagram, instagram-story, facebook（預設 a4）",
		}),
	),
	provider: Type.Optional(
		Type.String({
			description: "圖片生成服務：gemini, nano-banana-pro, grok, openai（預設 gemini）",
		}),
	),
});

type DesignPosterInput = Static<typeof DesignPosterParams>;

function getProvider(name: string, config: Config): ImageProvider | null {
	const providerConfig = config.providers[name];
	if (!providerConfig || !providerConfig.enabled) {
		return null;
	}

	switch (name) {
		case "gemini":
			return createGeminiProvider();
		case "nano-banana-pro":
			return createNanaBananaProProvider();
		case "grok":
			return createGrokProvider();
		case "openai":
			return createOpenAIProvider();
		default:
			return null;
	}
}

export default function (pi: ExtensionAPI) {
	const config = defaultConfig;

	// Register the design_poster tool
	pi.registerTool({
		name: "design_poster",
		label: "設計海報",
		description: `設計活動邀請卡/海報。根據活動資訊自動產生多種風格的設計草稿。

可用風格：
${config.styles.map((s) => `- ${s.id}: ${s.name} - ${s.description}`).join("\n")}

可用尺寸：${Object.entries(config.sizes)
			.map(([k, v]) => `${k} (${v.name})`)
			.join(", ")}`,

		parameters: DesignPosterParams,

		async execute(toolCallId, params: DesignPosterInput, signal, onUpdate, ctx) {
			const { eventInfo, styles: requestedStyles, size, provider: requestedProvider } = params;

			// Get size configuration
			const sizeKey = size || "a4";
			const sizeConfig = config.sizes[sizeKey] || config.defaultSize;

			// Get styles to generate
			const stylesToUse = requestedStyles
				? config.styles.filter((s) => requestedStyles.includes(s.id))
				: config.styles;

			if (stylesToUse.length === 0) {
				return {
					content: [{ type: "text", text: "錯誤：找不到指定的風格" }],
					details: { error: "No matching styles found" },
				};
			}

			// Get provider
			const providerName = requestedProvider || config.defaultProvider;
			const imageProvider = getProvider(providerName, config);

			if (!imageProvider) {
				return {
					content: [
						{
							type: "text",
							text: `錯誤：圖片生成服務 ${providerName} 不可用。請確認 API 金鑰已設定。`,
						},
					],
					details: { error: `Provider ${providerName} not available` },
				};
			}

			// Create output directory
			const outputDir = join(tmpdir(), "poster-designer", `${Date.now()}`);
			mkdirSync(outputDir, { recursive: true });

			const results: Array<{
				style: string;
				styleName: string;
				path: string;
				success: boolean;
				error?: string;
				imageData?: string;
				mimeType?: string;
			}> = [];

			// Generate images for each style
			for (let i = 0; i < stylesToUse.length; i++) {
				const style = stylesToUse[i];

				// Update progress
				onUpdate?.({
					content: [
						{
							type: "text",
							text: `正在生成第 ${i + 1}/${stylesToUse.length} 張海報（${style.name}）...`,
						},
					],
					details: { progress: i + 1, total: stylesToUse.length },
				});

				// Build prompt
				const prompt = style.promptTemplate.replace("{eventInfo}", eventInfo);

				try {
					if (signal?.aborted) {
						break;
					}

					const image = await imageProvider.generate({
						prompt,
						width: sizeConfig.width,
						height: sizeConfig.height,
						style: style.id,
					});

					const outputPath = join(outputDir, `${style.id}-${image.filename}`);
					writeFileSync(outputPath, image.data);

					results.push({
						style: style.id,
						styleName: style.name,
						path: outputPath,
						success: true,
						imageData: image.data.toString("base64"),
						mimeType: image.mimeType,
					});
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : "Unknown error";
					results.push({
						style: style.id,
						styleName: style.name,
						path: "",
						success: false,
						error: errorMsg,
					});
				}
			}

			// Build result summary
			const successful = results.filter((r) => r.success);
			const failed = results.filter((r) => !r.success);

			let summary = `海報設計完成！\n\n`;
			summary += `尺寸：${sizeConfig.name}\n`;
			summary += `成功：${successful.length} 張\n`;

			if (successful.length > 0) {
				summary += `\n生成的海報：\n`;
				for (const r of successful) {
					summary += `- ${r.styleName}: ${r.path}\n`;
				}
			}

			if (failed.length > 0) {
				summary += `\n失敗：${failed.length} 張\n`;
				for (const r of failed) {
					summary += `- ${r.styleName}: ${r.error}\n`;
				}
			}

			// Build content array with text summary and images
			const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
				{ type: "text", text: summary },
			];

			// Add successful images to content
			for (const r of successful) {
				if (r.imageData && r.mimeType) {
					content.push({
						type: "image",
						data: r.imageData,
						mimeType: r.mimeType,
					});
				}
			}

			return {
				content,
				details: {
					outputDir,
					size: sizeConfig,
					results: results.map(({ imageData, ...rest }) => rest), // Exclude imageData from details to reduce size
					successful: successful.length,
					failed: failed.length,
				},
			};
		},
	});

	// Register command to list available styles
	pi.registerCommand("poster-styles", {
		description: "顯示可用的海報設計風格",
		handler: async (_args, ctx) => {
			let text = "可用的海報設計風格：\n\n";
			for (const style of config.styles) {
				text += `${style.id}\n`;
				text += `  名稱：${style.name}\n`;
				text += `  說明：${style.description}\n\n`;
			}
			ctx.ui.notify(text, "info");
		},
	});

	// Register command to list available sizes
	pi.registerCommand("poster-sizes", {
		description: "顯示可用的海報尺寸",
		handler: async (_args, ctx) => {
			let text = "可用的海報尺寸：\n\n";
			for (const [key, size] of Object.entries(config.sizes)) {
				text += `${key}: ${size.name} (${size.width}x${size.height})\n`;
			}
			ctx.ui.notify(text, "info");
		},
	});

	// Notify on load
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.hasUI) {
			ctx.ui.setStatus("poster-designer", "海報設計工具已載入");
			setTimeout(() => ctx.ui.setStatus("poster-designer", undefined), 3000);
		}
	});
}
