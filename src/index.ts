/**
 * Poster Designer Extension for Pi
 *
 * Interactive multi-step poster design tool:
 * 1. Receive event info → generate 3-5 design proposals
 * 2. User selects a design proposal
 * 3. User selects output size
 * 4. User selects AI model
 * 5. Confirm and generate
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "@sinclair/typebox";
import { defaultConfig, type Config } from "./config.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createGrokProvider } from "./providers/grok.js";
import { createOpenAIProvider } from "./providers/openai.js";
import { createNanaBananaProProvider } from "./providers/nano-banana-pro.js";
import type { ImageProvider } from "./providers/types.js";
import { generateProposals, formatProposalForDisplay, type DesignProposal } from "./proposals.js";

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
			description:
				"圖片尺寸：a4, a4-landscape, instagram, instagram-story, facebook（預設 a4）",
		}),
	),
	provider: Type.Optional(
		Type.String({
			description: "圖片生成服務：gemini, nano-banana-pro, grok, openai（預設 gemini）",
		}),
	),
	model: Type.Optional(
		Type.String({
			description: "指定模型名稱，不指定則使用 provider 的預設模型",
		}),
	),
});

type DesignPosterInput = Static<typeof DesignPosterParams>;

function getProvider(name: string, model: string | undefined, config: Config): ImageProvider | null {
	const providerConfig = config.providers[name];
	if (!providerConfig || !providerConfig.enabled) {
		return null;
	}

	const modelToUse = model || providerConfig.defaultModel;

	switch (name) {
		case "gemini":
			return createGeminiProvider(modelToUse);
		case "nano-banana-pro":
			return createNanaBananaProProvider();
		case "grok":
			return createGrokProvider(modelToUse);
		case "openai":
			return createOpenAIProvider(modelToUse);
		default:
			return null;
	}
}

/**
 * Check which providers have API keys available
 */
function getAvailableProviders(config: Config): string[] {
	const available: string[] = [];
	for (const [name, cfg] of Object.entries(config.providers)) {
		if (cfg.enabled && process.env[cfg.apiKeyEnv]) {
			available.push(name);
		}
	}
	return available;
}

/**
 * Interactive step: select a design proposal
 */
async function stepSelectProposal(
	ctx: ExtensionContext,
	proposals: DesignProposal[],
): Promise<DesignProposal | null> {
	const options = proposals.map((p, i) => formatProposalForDisplay(p, i));

	const selected = await ctx.ui.select("選擇設計方案：", options);

	if (selected === undefined) return null;

	const index = options.indexOf(selected);
	return index >= 0 ? proposals[index] : null;
}

/**
 * Interactive step: select output size
 */
async function stepSelectSize(
	ctx: ExtensionContext,
	config: Config,
): Promise<string | null> {
	const sizeOptions = Object.entries(config.sizes).map(
		([key, size]) => `${key} — ${size.name} (${size.width}×${size.height})`,
	);

	const selected = await ctx.ui.select("選擇輸出尺寸：", sizeOptions);

	if (selected === undefined) return null;

	// Extract the key before the dash
	const key = selected.split(" — ")[0];
	return key;
}

/**
 * Interactive step: select provider and model
 */
async function stepSelectProviderModel(
	ctx: ExtensionContext,
	config: Config,
	presetProvider?: string,
	presetModel?: string,
): Promise<{ provider: string; model: string } | null> {
	const available = getAvailableProviders(config);

	if (available.length === 0) {
		ctx.ui.notify("錯誤：沒有可用的圖片生成服務，請設定 API 金鑰", "error");
		return null;
	}

	// Determine global default
	const globalDefaultProvider = presetProvider || config.defaultProvider;
	const globalDefaultModel = presetModel || config.providers[globalDefaultProvider]?.defaultModel;

	// Build provider options with their models
	const providerModelOptions: { label: string; provider: string; model: string }[] = [];

	for (const providerName of available) {
		const cfg = config.providers[providerName];
		for (const model of cfg.availableModels) {
			const isGlobalDefault = providerName === globalDefaultProvider && model === globalDefaultModel;
			const label = `${providerName} / ${model}${isGlobalDefault ? " ⭐ 預設" : ""}`;
			providerModelOptions.push({ label, provider: providerName, model });
		}
	}

	// Sort so the default option appears first
	const defaultIndex = providerModelOptions.findIndex(
		(o) => o.provider === globalDefaultProvider && o.model === globalDefaultModel,
	);
	if (defaultIndex > 0) {
		const [defaultOption] = providerModelOptions.splice(defaultIndex, 1);
		providerModelOptions.unshift(defaultOption);
	}

	const labels = providerModelOptions.map((o) => o.label);
	const selected = await ctx.ui.select("選擇圖片生成模型：", labels);

	if (selected === undefined) return null;

	const index = labels.indexOf(selected);
	if (index < 0) return null;

	return {
		provider: providerModelOptions[index].provider,
		model: providerModelOptions[index].model,
	};
}

/**
 * Generate a single poster image
 */
async function generatePoster(
	proposal: DesignProposal,
	sizeKey: string,
	providerName: string,
	modelName: string,
	config: Config,
	signal: AbortSignal | undefined,
	onUpdate: ((update: any) => void) | undefined,
): Promise<{
	success: boolean;
	path?: string;
	imageData?: string;
	mimeType?: string;
	error?: string;
	provider: string;
	model: string;
}> {
	const sizeConfig = config.sizes[sizeKey] || config.defaultSize;
	const imageProvider = getProvider(providerName, modelName, config);

	if (!imageProvider) {
		return {
			success: false,
			error: `圖片生成服務 ${providerName} 不可用`,
			provider: providerName,
			model: modelName,
		};
	}

	onUpdate?.({
		content: [
			{
				type: "text",
				text: `正在使用 ${providerName}/${imageProvider.model} 生成「${proposal.name}」風格海報...`,
			},
		],
	});

	try {
		if (signal?.aborted) {
			return { success: false, error: "已取消", provider: providerName, model: imageProvider.model };
		}

		const image = await imageProvider.generate({
			prompt: proposal.promptTemplate,
			width: sizeConfig.width,
			height: sizeConfig.height,
			style: proposal.baseStyleId,
		});

		// Save to temp directory
		const outputDir = join(tmpdir(), "poster-designer", `${Date.now()}`);
		mkdirSync(outputDir, { recursive: true });
		const outputPath = join(outputDir, `${proposal.baseStyleId}-${image.filename}`);
		writeFileSync(outputPath, image.data);

		return {
			success: true,
			path: outputPath,
			imageData: image.data.toString("base64"),
			mimeType: image.mimeType,
			provider: providerName,
			model: imageProvider.model,
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : "Unknown error",
			provider: providerName,
			model: imageProvider.model,
		};
	}
}

export default function (pi: ExtensionAPI) {
	const config = defaultConfig;

	// Build available models description
	const modelsDesc = Object.entries(config.providers)
		.map(([name, cfg]) => `${name}: ${cfg.availableModels.join(", ")}`)
		.join("\n");

	// Register the design_poster tool
	pi.registerTool({
		name: "design_poster",
		label: "設計海報",
		description: `設計活動邀請卡/海報。根據活動資訊自動產生多種風格的設計草稿。

可用風格：
${config.styles.map((s) => `- ${s.id}: ${s.name} - ${s.description}`).join("\n")}

可用尺寸：${Object.entries(config.sizes)
			.map(([k, v]) => `${k} (${v.name})`)
			.join(", ")}

可用模型：
${modelsDesc}`,

		parameters: DesignPosterParams,

		async execute(toolCallId, params: DesignPosterInput, signal, onUpdate, ctx) {
			const { eventInfo, styles: requestedStyles, size, provider: requestedProvider, model } = params;

			// ─── Interactive mode ───
			if (ctx.hasUI && !requestedStyles) {
				return await executeInteractive(eventInfo, size, requestedProvider, model, config, signal, onUpdate, ctx);
			}

			// ─── Non-interactive fallback (original behavior) ───
			return await executeNonInteractive(params, config, signal, onUpdate);
		},
	});

	// Register commands (unchanged)
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

	pi.registerCommand("poster-models", {
		description: "顯示可用的圖片生成模型",
		handler: async (_args, ctx) => {
			let text = "可用的圖片生成模型：\n\n";
			for (const [name, cfg] of Object.entries(config.providers)) {
				const status = cfg.enabled ? "✓" : "✗";
				text += `${status} ${name}:\n`;
				text += `  預設: ${cfg.defaultModel}\n`;
				text += `  可用: ${cfg.availableModels.join(", ")}\n`;
				text += `  API Key: ${cfg.apiKeyEnv}\n\n`;
			}
			ctx.ui.notify(text, "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.hasUI) {
			ctx.ui.setStatus("poster-designer", "海報設計工具已載入");
			setTimeout(() => ctx.ui.setStatus("poster-designer", undefined), 3000);
		}
	});
}

/**
 * Interactive multi-step poster design flow
 */
async function executeInteractive(
	eventInfo: string,
	presetSize: string | undefined,
	presetProvider: string | undefined,
	presetModel: string | undefined,
	config: Config,
	signal: AbortSignal | undefined,
	onUpdate: ((update: any) => void) | undefined,
	ctx: ExtensionContext,
) {
	// ── Step 1: Generate design proposals ──
	onUpdate?.({
		content: [{ type: "text" as const, text: "正在根據活動資訊生成設計提案..." }],
	});

	const proposals = generateProposals(eventInfo);

	if (proposals.length === 0) {
		return {
			content: [{ type: "text" as const, text: "錯誤：無法為此活動生成設計提案" }],
			details: { error: "No proposals generated" },
		};
	}

	// ── Step 2: User selects design proposal ──
	const selectedProposal = await stepSelectProposal(ctx, proposals);

	if (!selectedProposal) {
		return {
			content: [{ type: "text" as const, text: "使用者取消了海報設計" }],
			details: { cancelled: true },
		};
	}

	// ── Step 3: Select size ──
	let sizeKey = presetSize;
	if (!sizeKey) {
		sizeKey = await stepSelectSize(ctx, config);
		if (!sizeKey) {
			return {
				content: [{ type: "text" as const, text: "使用者取消了海報設計" }],
				details: { cancelled: true },
			};
		}
	}

	// ── Step 4: Select model ──
	const providerModel = await stepSelectProviderModel(ctx, config, presetProvider, presetModel);
	if (!providerModel) {
		return {
			content: [{ type: "text" as const, text: "使用者取消了海報設計" }],
			details: { cancelled: true },
		};
	}
	const providerName = providerModel.provider;
	const modelName = providerModel.model;

	// ── Step 5: Confirm ──
	const sizeConfig = config.sizes[sizeKey] || config.defaultSize;
	const confirmMsg = [
		`設計方案：${selectedProposal.name}（${selectedProposal.copyText}）`,
		`配色：${selectedProposal.colorScheme}`,
		`尺寸：${sizeConfig.name}`,
		`模型：${providerName} / ${modelName || config.providers[providerName]?.defaultModel}`,
	].join("\n");

	const confirmed = await ctx.ui.confirm("確認生成海報？", confirmMsg);
	if (!confirmed) {
		return {
			content: [{ type: "text" as const, text: "使用者取消了海報設計" }],
			details: { cancelled: true },
		};
	}

	// ── Step 6: Generate ──
	const result = await generatePoster(
		selectedProposal,
		sizeKey,
		providerName,
		modelName || config.providers[providerName]?.defaultModel,
		config,
		signal,
		onUpdate,
	);

	if (!result.success) {
		return {
			content: [{ type: "text" as const, text: `海報生成失敗：${result.error}` }],
			details: { error: result.error, provider: result.provider, model: result.model },
		};
	}

	// Build result
	const summary = [
		`海報設計完成！`,
		``,
		`設計方案：${selectedProposal.name}`,
		`文案方向：${selectedProposal.copyText}`,
		`視覺風格：${selectedProposal.visualStyle}`,
		`配色方案：${selectedProposal.colorScheme}`,
		`Provider: ${result.provider}`,
		`Model: ${result.model}`,
		`尺寸：${sizeConfig.name}`,
		`檔案：${result.path}`,
	].join("\n");

	const content: Array<
		{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
	> = [{ type: "text" as const, text: summary }];

	if (result.imageData && result.mimeType) {
		content.push({
			type: "image" as const,
			data: result.imageData,
			mimeType: result.mimeType,
		});
	}

	return {
		content,
		details: {
			proposal: {
				id: selectedProposal.id,
				name: selectedProposal.name,
				copyText: selectedProposal.copyText,
				visualStyle: selectedProposal.visualStyle,
				colorScheme: selectedProposal.colorScheme,
				baseStyleId: selectedProposal.baseStyleId,
			},
			provider: result.provider,
			model: result.model,
			size: sizeConfig,
			path: result.path,
			images: result.imageData
				? [
						{
							style: selectedProposal.baseStyleId,
							styleName: selectedProposal.name,
							base64: result.imageData,
							mimeType: result.mimeType,
							path: result.path,
						},
				  ]
				: [],
		},
	};
}

/**
 * Non-interactive mode (original behavior, for -p mode or when styles are explicitly specified)
 */
async function executeNonInteractive(
	params: DesignPosterInput,
	config: Config,
	signal: AbortSignal | undefined,
	onUpdate: ((update: any) => void) | undefined,
) {
	const { eventInfo, styles: requestedStyles, size, provider: requestedProvider, model } = params;

	const sizeKey = size || "a4";
	const sizeConfig = config.sizes[sizeKey] || config.defaultSize;

	const stylesToUse = requestedStyles
		? config.styles.filter((s) => requestedStyles.includes(s.id))
		: config.styles;

	if (stylesToUse.length === 0) {
		return {
			content: [{ type: "text" as const, text: "錯誤：找不到指定的風格" }],
			details: { error: "No matching styles found" },
		};
	}

	const providerName = requestedProvider || config.defaultProvider;
	const imageProvider = getProvider(providerName, model, config);

	if (!imageProvider) {
		return {
			content: [
				{
					type: "text" as const,
					text: `錯誤：圖片生成服務 ${providerName} 不可用。請確認 API 金鑰已設定。`,
				},
			],
			details: { error: `Provider ${providerName} not available` },
		};
	}

	const outputDir = join(tmpdir(), "poster-designer", `${Date.now()}`);
	mkdirSync(outputDir, { recursive: true });

	const results: Array<{
		style: string;
		styleName: string;
		path: string;
		success: boolean;
		error?: string;
		imageData?: string;
		base64?: string;
		mimeType?: string;
	}> = [];

	for (let i = 0; i < stylesToUse.length; i++) {
		const style = stylesToUse[i];

		onUpdate?.({
			content: [
				{
					type: "text",
					text: `正在生成第 ${i + 1}/${stylesToUse.length} 張海報（${style.name}）...`,
				},
			],
			details: { progress: i + 1, total: stylesToUse.length },
		});

		const prompt = style.promptTemplate.replace("{eventInfo}", eventInfo);

		try {
			if (signal?.aborted) break;

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
				base64: image.data.toString("base64"),
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

	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	let summary = `海報設計完成！\n\n`;
	summary += `Provider: ${providerName}\n`;
	summary += `Model: ${imageProvider.model}\n`;
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

	const content: Array<
		{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
	> = [{ type: "text" as const, text: summary }];

	for (const r of successful) {
		if (r.imageData && r.mimeType) {
			content.push({
				type: "image" as const,
				data: r.imageData,
				mimeType: r.mimeType,
			});
		}
	}

	return {
		content,
		details: {
			outputDir,
			provider: providerName,
			model: imageProvider.model,
			size: sizeConfig,
			results: results.map(({ imageData, ...rest }) => rest),
			successful: successful.length,
			failed: failed.length,
			images: successful.map((r) => ({
				style: r.style,
				styleName: r.styleName,
				base64: r.base64,
				mimeType: r.mimeType,
				path: r.path,
			})),
		},
	};
}
