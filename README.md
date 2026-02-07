# pi-poster-designer

A [Pi](https://github.com/badlogic/pi-mono) extension for designing event invitation posters using AI image generation.

## Features

- 🎨 Multiple design styles (Church, Christian, Creative)
- 📐 Multiple output sizes (A4, Instagram, Facebook, etc.)
- 🤖 Multiple AI providers (Gemini, Grok, OpenAI)
- 🌐 Bilingual support (Chinese/English)

## Installation

```bash
pi install npm:pi-poster-designer
```

Or for development:

```bash
pi -e /path/to/pi-poster-designer
```

## Configuration

Set the API key for your preferred image generation provider:

```bash
# Google Gemini (default)
export GEMINI_API_KEY="your-api-key"

# xAI Grok
export GROK_API_KEY="your-api-key"

# OpenAI DALL-E
export OPENAI_API_KEY="your-api-key"
```

## Usage

### Tool: design_poster

The extension registers a `design_poster` tool that the LLM can call:

```
設計海報：

活動：戶外音樂會
地點：永康教會
日期：2025/03/22
時間：15:30-17:00
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| eventInfo | string | Event information (topic, time, location, program) |
| styles | string[] | Style IDs to use (default: all) |
| size | string | Output size (default: a4) |
| provider | string | AI provider (default: gemini) |

### Available Styles

| ID | Name | Description |
|----|------|-------------|
| tjc-style | 真耶穌教會風格 | Clean, reverent design for TJC |
| christian-general | 一般基督教風格 | Modern, welcoming Christian design |
| creative-free | 創意自由風格 | Bold, innovative artistic design |

### Available Sizes

| ID | Dimensions | Use Case |
|----|------------|----------|
| a4 | 2480x3508 | Print (300dpi) |
| a4-landscape | 3508x2480 | Print landscape |
| instagram | 1080x1080 | Instagram square |
| instagram-story | 1080x1920 | Instagram story |
| facebook | 1200x630 | Facebook post |

### Commands

- `/poster-styles` - List available design styles
- `/poster-sizes` - List available output sizes

## API Pricing Reference

| Provider | Model | Price per Image |
|----------|-------|-----------------|
| Gemini | gemini-2.0-flash-exp-image-generation | ~$0.02 |
| Grok | grok-2-image | Requires credits |
| OpenAI | DALL-E 3 HD | $0.08-0.12 |

## Example Output

```
海報設計完成！

尺寸：A4 (300dpi)
成功：3 張

生成的海報：
- 真耶穌教會風格: /tmp/poster-designer/1234567890/tjc-style-poster-1234567890.png
- 一般基督教風格: /tmp/poster-designer/1234567890/christian-general-poster-1234567891.png
- 創意自由風格: /tmp/poster-designer/1234567890/creative-free-poster-1234567892.png
```

## Development

```bash
git clone https://github.com/siygle/pi-poster-designer
cd pi-poster-designer

# Test locally
pi -e ./src/index.ts
```

## License

MIT
