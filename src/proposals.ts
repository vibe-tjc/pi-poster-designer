/**
 * Design proposal generator
 *
 * Analyzes event info and generates 3-5 tailored design proposals,
 * each with a unique copy direction, visual style, and color scheme.
 */

export interface DesignProposal {
	id: string;
	name: string;
	copyText: string;
	visualStyle: string;
	colorScheme: string;
	baseStyleId: string;
	promptTemplate: string;
}

interface EventAnalysis {
	type: EventType;
	keywords: string[];
	eventName: string;
	hasDate: boolean;
	hasLocation: boolean;
	rawInfo: string;
}

type EventType =
	| "evangelism"
	| "music"
	| "youth"
	| "prayer"
	| "seminar"
	| "fellowship"
	| "holiday"
	| "baptism"
	| "general";

// Keyword patterns for event type detection
const EVENT_PATTERNS: Record<EventType, RegExp[]> = {
	evangelism: [/佈道/i, /福音/i, /evangelis/i, /gospel/i, /傳道/i, /慕道/i],
	music: [/詩歌/i, /音樂/i, /music/i, /concert/i, /讚美/i, /worship/i, /獻詩/i],
	youth: [/青年/i, /youth/i, /學生/i, /young/i, /teen/i, /少年/i, /大專/i],
	prayer: [/禱告/i, /prayer/i, /靈恩/i, /spiritual/i, /聖靈/i, /靈修/i],
	seminar: [/講習/i, /研習/i, /seminar/i, /workshop/i, /課程/i, /宗教教育/i, /查經/i, /培靈/i],
	fellowship: [/團契/i, /fellowship/i, /聯誼/i, /交誼/i, /聚會/i, /野餐/i, /郊遊/i],
	holiday: [/聖誕/i, /christmas/i, /新年/i, /感恩/i, /thanksgiving/i, /復活/i, /easter/i, /春節/i],
	baptism: [/洗禮/i, /受洗/i, /浸禮/i, /baptis/i],
	general: [],
};

function analyzeEvent(eventInfo: string): EventAnalysis {
	let detectedType: EventType = "general";

	for (const [type, patterns] of Object.entries(EVENT_PATTERNS) as [EventType, RegExp[]][]) {
		if (patterns.some((p) => p.test(eventInfo))) {
			detectedType = type;
			break;
		}
	}

	// Extract event name (first line or line after 活動名稱/主題)
	const lines = eventInfo.split("\n").map((l) => l.trim()).filter(Boolean);
	let eventName = lines[0] || "活動";
	for (const line of lines) {
		const match = line.match(/(?:活動名稱|主題|名稱|活動)[：:]\s*(.+)/);
		if (match) {
			eventName = match[1].trim();
			break;
		}
	}

	return {
		type: detectedType,
		keywords: [],
		eventName,
		hasDate: /\d{4}[/.-]\d{1,2}[/.-]\d{1,2}|月|日|date/i.test(eventInfo),
		hasLocation: /地點|地址|location|教會|church/i.test(eventInfo),
		rawInfo: eventInfo,
	};
}

// ─── Proposal templates per event type ───

interface ProposalTemplate {
	name: string;
	copyDirection: string;
	visualStyle: string;
	colorScheme: string;
	baseStyleId: string;
	promptKeywords: string;
}

const UNIVERSAL_TEMPLATES: ProposalTemplate[] = [
	{
		name: "莊嚴典雅",
		copyDirection: "以經文為核心，傳達神的話語力量",
		visualStyle: "經典教會風格，對稱構圖，聖經元素",
		colorScheme: "深藍、白色、金色",
		baseStyleId: "tjc-style",
		promptKeywords: "classic church style, symmetrical composition, bible elements, dove, wheat, dignified typography",
	},
	{
		name: "溫暖光芒",
		copyDirection: "強調愛與盼望的溫暖訊息",
		visualStyle: "柔和光線、暖色調、自然元素",
		colorScheme: "暖橙、金色、米白",
		baseStyleId: "christian-general",
		promptKeywords: "warm golden light, soft glow, sunrise or sunset tones, nature elements, welcoming atmosphere",
	},
	{
		name: "現代簡約",
		copyDirection: "簡潔有力的一句話文案",
		visualStyle: "大面積留白、強調文字排版、幾何元素",
		colorScheme: "黑白配色加一個強調色",
		baseStyleId: "creative-free",
		promptKeywords: "modern minimalist, large white space, bold typography, geometric accent, clean layout",
	},
];

const TYPE_TEMPLATES: Record<EventType, ProposalTemplate[]> = {
	evangelism: [
		{
			name: "光照黑暗",
			copyDirection: "從黑暗走向光明的轉變意象",
			visualStyle: "光束穿透黑暗、希望意象",
			colorScheme: "深色漸變到金色光芒",
			baseStyleId: "christian-general",
			promptKeywords: "dramatic light beam breaking through darkness, hope imagery, spiritual awakening, warm golden light emerging",
		},
		{
			name: "敞開大門",
			copyDirection: "歡迎每個人來認識真理",
			visualStyle: "開放的門、道路意象、溫馨氛圍",
			colorScheme: "柔和綠色、天藍、白色",
			baseStyleId: "christian-general",
			promptKeywords: "open door with light, welcoming path, gentle nature backdrop, community warmth, inviting atmosphere",
		},
	],
	music: [
		{
			name: "天籟之聲",
			copyDirection: "用音樂讚美神的榮耀",
			visualStyle: "音符飄揚、優美的音樂元素",
			colorScheme: "紫色、金色、白色",
			baseStyleId: "christian-general",
			promptKeywords: "musical notes flowing gracefully, elegant music elements, soft purple and gold, praise atmosphere, artistic composition",
		},
		{
			name: "活力節奏",
			copyDirection: "用歡樂的心來歌唱",
			visualStyle: "動感音波、鮮明色彩、年輕活力",
			colorScheme: "漸層彩色、活潑明亮",
			baseStyleId: "creative-free",
			promptKeywords: "dynamic sound waves, vibrant colors, energetic rhythm visual, modern concert poster style, bold and lively",
		},
	],
	youth: [
		{
			name: "新世代力量",
			copyDirection: "年輕人是教會的未來",
			visualStyle: "充滿活力的現代設計、大膽用色",
			colorScheme: "螢光配色、漸層色彩",
			baseStyleId: "creative-free",
			promptKeywords: "bold modern design, energetic youth vibe, gradient colors, dynamic composition, trendy graphic style",
		},
		{
			name: "同行夥伴",
			copyDirection: "在信仰路上一起成長",
			visualStyle: "同伴並肩、道路意象、溫暖色調",
			colorScheme: "橙色、天藍、暖白",
			baseStyleId: "christian-general",
			promptKeywords: "friends walking together, journey metaphor, warm companionship, growth imagery, youthful yet meaningful",
		},
	],
	prayer: [
		{
			name: "靜默深處",
			copyDirection: "在安靜中與神相遇",
			visualStyle: "寧靜意象、晨光、水面倒影",
			colorScheme: "淺藍、銀白、柔和灰",
			baseStyleId: "tjc-style",
			promptKeywords: "peaceful morning light, still water reflection, quiet contemplation atmosphere, gentle mist, serene spiritual moment",
		},
		{
			name: "聖靈之火",
			copyDirection: "聖靈的能力充滿我們",
			visualStyle: "火焰意象、鴿子、神聖氛圍",
			colorScheme: "紅金漸層、深藍背景",
			baseStyleId: "tjc-style",
			promptKeywords: "holy spirit flame imagery, dove descending, sacred atmosphere, red and gold gradient, deep blue background, powerful spiritual",
		},
	],
	seminar: [
		{
			name: "智慧之書",
			copyDirection: "深入神的話語，裝備信仰",
			visualStyle: "書本、光線、知識意象",
			colorScheme: "深綠、金色、象牙白",
			baseStyleId: "tjc-style",
			promptKeywords: "open bible with divine light, knowledge and wisdom imagery, study atmosphere, deep green and gold, scholarly yet spiritual",
		},
		{
			name: "扎根成長",
			copyDirection: "在真理中扎根，向上結果",
			visualStyle: "樹木、根系、成長意象",
			colorScheme: "自然綠色、土色、陽光色",
			baseStyleId: "christian-general",
			promptKeywords: "tree with deep roots growing upward, nature growth metaphor, sunlight filtering through leaves, earthy and organic",
		},
	],
	fellowship: [
		{
			name: "歡聚時光",
			copyDirection: "在主裡彼此相愛的美好時光",
			visualStyle: "溫馨聚會氛圍、暖色調",
			colorScheme: "暖黃、橙色、米白",
			baseStyleId: "christian-general",
			promptKeywords: "warm gathering atmosphere, cozy community feel, golden warm tones, fellowship imagery, joyful togetherness",
		},
		{
			name: "繽紛樂活",
			copyDirection: "一起享受快樂的交誼時光",
			visualStyle: "歡樂活潑、彩色元素、戶外感",
			colorScheme: "多彩繽紛、明亮色調",
			baseStyleId: "creative-free",
			promptKeywords: "colorful celebration, outdoor fun atmosphere, bright cheerful elements, festive confetti or balloons, lively and joyful",
		},
	],
	holiday: [
		{
			name: "節慶祝福",
			copyDirection: "在特別的日子感受神的祝福",
			visualStyle: "節慶裝飾、喜慶氛圍",
			colorScheme: "紅金配色、節日色彩",
			baseStyleId: "christian-general",
			promptKeywords: "festive celebration decor, holiday atmosphere, red and gold accents, blessings imagery, seasonal elements",
		},
		{
			name: "永恆之約",
			copyDirection: "記念神永恆不變的應許",
			visualStyle: "星空、永恆意象、莊嚴感",
			colorScheme: "深藍星空、銀白星光",
			baseStyleId: "tjc-style",
			promptKeywords: "starry night sky, eternal covenant imagery, majestic atmosphere, silver starlight, deep blue cosmos, timeless spiritual",
		},
	],
	baptism: [
		{
			name: "新生命",
			copyDirection: "在水中與主同死同復活",
			visualStyle: "水面、光線、重生意象",
			colorScheme: "水藍、白色、金光",
			baseStyleId: "tjc-style",
			promptKeywords: "water and light rebirth imagery, baptism symbolism, crystal clear water, golden divine light, new life beginning, sacred moment",
		},
		{
			name: "歸入基督",
			copyDirection: "受洗歸入基督，成為神的兒女",
			visualStyle: "潔白、鴿子、聖潔氛圍",
			colorScheme: "純白、淡藍、銀色",
			baseStyleId: "tjc-style",
			promptKeywords: "pure white dove, holy baptism atmosphere, clean and sacred, gentle blue water, silver accents, spiritual purity",
		},
	],
	general: [],
};

/**
 * Generate 3-5 design proposals based on event info
 */
export function generateProposals(eventInfo: string): DesignProposal[] {
	const analysis = analyzeEvent(eventInfo);
	const proposals: DesignProposal[] = [];

	// Get type-specific templates
	const typeTemplates = TYPE_TEMPLATES[analysis.type] || [];

	// Combine: type-specific first, then universal to fill up to 3-5
	const allTemplates = [...typeTemplates, ...UNIVERSAL_TEMPLATES];

	// Deduplicate by baseStyleId - ensure variety
	const seen = new Set<string>();
	const selected: ProposalTemplate[] = [];

	for (const t of allTemplates) {
		// Allow up to 2 of the same base style
		const countOfStyle = selected.filter((s) => s.baseStyleId === t.baseStyleId).length;
		if (countOfStyle < 2) {
			selected.push(t);
			if (selected.length >= 5) break;
		}
	}

	// Ensure at least 3
	if (selected.length < 3) {
		for (const t of UNIVERSAL_TEMPLATES) {
			if (!selected.includes(t)) {
				selected.push(t);
				if (selected.length >= 3) break;
			}
		}
	}

	// Build proposals
	for (let i = 0; i < selected.length; i++) {
		const t = selected[i];
		const styleLabel = {
			"tjc-style": "真耶穌教會風格",
			"christian-general": "一般基督教風格",
			"creative-free": "創意自由風格",
		}[t.baseStyleId] || t.baseStyleId;

		proposals.push({
			id: `proposal-${i + 1}`,
			name: t.name,
			copyText: t.copyDirection,
			visualStyle: t.visualStyle,
			colorScheme: t.colorScheme,
			baseStyleId: t.baseStyleId,
			promptTemplate: buildPrompt(t, analysis),
		});
	}

	return proposals;
}

function buildPrompt(template: ProposalTemplate, analysis: EventAnalysis): string {
	const styleInstructions = {
		"tjc-style": `Style: Clean, reverent, dignified. Suitable for True Jesus Church.
Avoid: crosses with human figures, Catholic/Orthodox iconography, overly decorative or flashy elements.
Typography: Clear, readable, professional.`,
		"christian-general": `Style: Modern, welcoming, spiritually uplifting.
Use general Christian design elements broadly acceptable across denominations.
Avoid: controversial imagery, extreme or provocative designs.
Typography: Modern yet respectful.`,
		"creative-free": `Style: Bold, innovative, artistic freedom.
Be creative with colors, typography, and visual elements.
Make it memorable and visually impactful.`,
	}[template.baseStyleId] || "";

	return `Design a professional event poster.

${styleInstructions}

Design direction: "${template.name}" - ${template.copyDirection}
Visual approach: ${template.visualStyle}
Color scheme: ${template.colorScheme}
Visual keywords: ${template.promptKeywords}

The poster should clearly communicate the event information with beautiful layout and typography.
All text on the poster must be clearly readable.

Event details:
${analysis.rawInfo}`;
}

/**
 * Format a proposal for display in selection UI
 */
export function formatProposalForDisplay(proposal: DesignProposal, index: number): string {
	const styleEmoji = {
		"tjc-style": "⛪",
		"christian-general": "✝️",
		"creative-free": "🎨",
	}[proposal.baseStyleId] || "📄";

	return `${styleEmoji} ${proposal.name}｜${proposal.copyText}（${proposal.colorScheme}）`;
}
