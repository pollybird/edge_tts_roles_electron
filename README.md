# edge-tts-roles

**Edge-TTS Multi-Voice Audio Generator** — a desktop application that turns marker-based scripts into multi-speaker audio using the online Microsoft Edge TTS service. Built with Electron + Vue 3 + TypeScript.

English | [简体中文](./README_CN.md)

You write a plain-text script with lightweight markers (`[A]`, `[B]`, `[1000]`, `[R]`), assign a different neural voice to each of the four roles, and the app synthesizes every segment, stitches it together with pauses and beeps, optionally mixes in intro / outro / background music, and exports a WAV / MP3 / OGG / FLAC file.

> The speech synthesis itself is provided by Microsoft Edge's online speech service. **An internet connection is required.**

## Features

- **Four switchable speaker roles (A–D)** — each role has its own neural voice plus independent rate, volume and pitch settings.
- **Marker-based script format** — switch speakers, insert precise millisecond pauses and beeps without leaving the text.
- **Full Edge TTS voice catalog** — voices are fetched from the service, grouped by language, and shown with localized display names.
- **Reliable long-form generation** — every segment is retried automatically on network interruption (up to 15 attempts) with an idle-connection watchdog and adaptive backoff; completed segments are cached on disk, so re-running a failed job resumes from the breakpoint.
- **Audio extras (v2.0.0)** — attach local audio files as **intro**, **outro** and **background music**, each with an independent 0–100 % volume control. Background music automatically loops for the duration of the narration.
- **Instant preview** — preview the whole text or just the selection in a built-in player (extras included), before exporting.
- **Four output formats** — WAV (32-bit float), MP3, OGG Vorbis and FLAC, all processed through a bundled ffmpeg binary (no system ffmpeg required).
- **Voice config import/export** — save the four roles' voice / rate / volume / pitch to a JSON file and reuse it across scripts.
- **Editor conveniences** — find & replace, one-click marker insertion, quick-pause buttons, live character count, open/save text files.
- **8 built-in languages** — English, Simplified Chinese, French, German, Spanish, Russian, Japanese and Arabic; the UI follows the system language automatically.
- The main window opens maximized by default.

## Marker Syntax

| Marker                  | Meaning                                                   |
| ----------------------- | --------------------------------------------------------- |
| `[A]` `[B]` `[C]` `[D]` | Switch to role A / B / C / D from this point on           |
| `[1000]`                | Insert a pause of `1000` milliseconds (any integer works) |
| `[R]`                   | Insert a 500 ms / 1000 Hz beep                            |

Text before the first role marker is spoken by role A.

```
[A]Hello, I am voice A. [B]And I am voice B. [1000][C]After a 1-second pause, voice C. [R]
```

## Usage Guide

1. **Assign voices** — in _Voice Settings_ on the right, pick a neural voice for each role used in the script and adjust rate / volume / pitch if needed.
2. **Write the script** — type or paste text in the editor and use the toolbar buttons to insert role tags, pauses and beeps.
3. **(Optional) Add audio extras** — in the _Audio Extras_ panel below the voice settings, choose a local file for intro / outro / background music and drag each volume slider (0–100 %).
   - Intro plays before the narration; outro plays after it.
   - Background music is mixed underneath the narration and loops automatically if it is shorter.
4. **Preview** — use _Preview Selection_ / _Preview All Text_ to listen in the built-in player.
5. **Export** — choose an output format and a save path at the bottom, then click _Generate Audio_. Progress is shown per segment and the job can be stopped at any time.

Accepted extra-audio formats: MP3, WAV, OGG, FLAC, M4A, AAC, OPUS and WMA (anything the bundled ffmpeg can decode). Mixing is hard-clipped to ±1.0 to prevent clipping.

## Keyboard Shortcuts

| Shortcut               | Action                   |
| ---------------------- | ------------------------ |
| `Ctrl/Cmd + O`         | Open a text file         |
| `Ctrl/Cmd + S`         | Save the text            |
| `Ctrl/Cmd + Shift + O` | Load voice config (JSON) |
| `Ctrl/Cmd + Shift + S` | Save voice config (JSON) |
| `Ctrl/Cmd + F`         | Find                     |
| `Ctrl/Cmd + H`         | Replace                  |
| `F1`                   | Help                     |

## How It Works

1. **Parse** — the script is split into text / pause / beep segments ([textParser.ts](./src/shared/textParser.ts)).
2. **Synthesize** — each text segment is streamed from Edge TTS as MP3. A per-segment idle watchdog (15 s) detects stalled connections; failures trigger up to 15 retries with jittered backoff, and every successful segment is written to a disk cache (`userData/tts-segment-cache`, LRU-pruned).
3. **Decode & assemble** — segments are decoded to 24 kHz stereo 32-bit float PCM via the bundled ffmpeg, then concatenated with generated silence and beep tones.
4. **Mix extras** — intro/outro are gain-scaled and concatenated; background music is gain-scaled, looped to the narration length and overlaid, with ±1.0 clipping.
5. **Encode** — WAV is written directly; MP3 / OGG / FLAC are encoded through ffmpeg (`libmp3lame`, `libvorbis`, `flac`).

## Project Structure

```
src/
├── main/                 Electron main process
│   ├── index.ts          App lifecycle, maximized main window
│   ├── ttsService.ts     Synthesis pipeline: retries, cache, extras mixing
│   ├── audioProcessor.ts PCM math + ffmpeg decode/encode (24 kHz stereo f32)
│   ├── ipc.ts            IPC handlers, file dialogs, config import/export
│   ├── menu.ts           Localized application menu
│   └── settings.ts       electron-store schema
├── preload/
│   └── index.ts          contextBridge API exposed as window.api
├── renderer/             Vue 3 renderer
│   └── src/
│       ├── App.vue
│       ├── components/   TextEditor, RoleSettings, AudioExtrasPanel,
│       │                 OutputPanel, PreviewDialog
│       └── composables/  useI18n
└── shared/               Code shared by main and renderer
    ├── types.ts          Request/response types and IPC contract
    ├── ipc.ts            IPC channel names
    ├── textParser.ts     Marker parser
    ├── voiceGroups.ts    Voice list grouping/sorting
    └── i18n/             i18n core + 7 locale packs
```

## Tech Stack

- [Electron](https://www.electronjs.org/) 39 + [electron-vite](https://electron-vite.org/) 5
- [Vue](https://vuejs.org/) 3.5 (Composition API, `<script setup>`) + TypeScript 5.9
- [edge-tts-universal](https://www.npmjs.com/package/edge-tts-universal) — Edge TTS client
- [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static) — bundled ffmpeg binary
- [electron-builder](https://www.electron.build/) — packaging (NSIS / DMG / AppImage, snap, deb)
- electron-store — typed local settings

## Development

### Prerequisites

- Node.js `^20.19 || >=22.12` (LTS recommended)
- npm
- Network access to the Microsoft Edge TTS service for synthesis

### Install & Run

```bash
npm install
npm run dev
```

### Type Checking & Linting

```bash
npm run typecheck   # tsc (main/preload) + vue-tsc (renderer), no emit
npm run lint
npm run format
```

### Production Build

```bash
npm run build            # typecheck + electron-vite build (bundles into out/)
npm run build:unpack     # unpacked app in dist/ (fast local test)
npm run build:linux      # Linux x64 + arm64: AppImage, deb, rpm
npm run build:win        # Windows x64 + arm64: NSIS installers
npm run build:mac        # macOS x64 + arm64: DMG + ZIP (run on macOS)
npm run build:mac:zip    # macOS x64 + arm64 ZIP only (can run on Linux/Windows)
```

Each platform script automatically runs `prepare:ffmpeg`, which downloads the FFmpeg binaries for **all** target platforms (Linux x64/arm64, Windows x64, macOS x64/arm64, ~320 MB in total) into `resources/ffmpeg/` (git-ignored). They are the same GPL builds used by ffmpeg-static (release `b6.1.1`) and are placed into `resources/ffmpeg/<platform>-<arch>/` by electron-builder; the app selects the matching binary at runtime. If GitHub is slow, override the source with `FFMPEG_BINARIES_URL` (the script also falls back to the npmmirror binary mirror automatically).

### Auto-Update

The app checks for updates automatically on startup (5 s delay) and supports a manual check from **Help → Check for Updates**.

- **Primary feed**: [GitHub Releases](https://github.com/pollybird/edge_tts_roles_electron/releases) (`/releases/latest/download/latest*.yml`).
- **Fallback feed**: GitCode raw files in the repository root (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`). If GitHub is unreachable within 3.5 s, the app falls back to GitCode automatically.

Release workflow for maintainers:

1. Build all platform installers (`build:linux`, `build:win`, `build:mac:zip`). electron-builder generates `latest.yml` (Windows), `latest-mac.yml` (macOS), and `latest-linux.yml` (Linux) in `dist/`.
2. Upload the installer artifacts to **both** GitHub and GitCode Releases.
3. Copy the three `latest*.yml` files from `dist/` to the repository **root** and commit them. This makes the GitCode fallback feed available at `https://gitcode.com/pollybird/edge_tts_roles_electron/raw/main/latest*.yml`.
4. Push to all three remotes (GitHub / Gitee / GitCode).

`electron-builder.yml` is configured with `publish.provider: github`; running `electron-builder --publish always` (requires `GH_TOKEN`) uploads artifacts and the `latest*.yml` files to GitHub Releases automatically.

Platform notes:

- Installers must be built on their target OS family for native packaging. A Linux host can build Linux packages, Windows NSIS installers (Wine is used automatically by electron-builder), and macOS ZIP archives, but **DMG creation requires macOS**. For signed/notarized macOS apps or signed Windows installers, run the corresponding script on that OS (a CI matrix is recommended).
- The NSIS installer is an assisted (non-one-click) installer that displays the full **GNU AGPL v3** license page and lets users choose the installation directory.
- There is no native FFmpeg build for Windows on ARM. The arm64 installer ships the x64 `ffmpeg.exe`, which runs via Windows 11 on ARM's built-in x64 emulation; if it is absent, the app falls back to a system `ffmpeg` on `PATH`.
- `npm run build` runs both TypeScript projects with `noUnusedLocals` / strict settings before bundling, so it is the authoritative check. Development itself needs no FFmpeg installation (ffmpeg-static fetches the current platform's binary during `npm install`).

## Internationalization

All UI strings live in typed locale packs under [src/shared/i18n/locales](./src/shared/i18n/locales): English (base/fallback), Simplified Chinese, Traditional Chinese, French, German, Spanish, Russian, Japanese and Arabic. The renderer follows `navigator.language` and the main process follows the system locale; missing keys transparently fall back to English. Adding a language is a single new pack plus one registration entry.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-only)**. See [LICENSE](./LICENSE) for the full text.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU AGPL for details.

The application as a whole is released under the AGPL because it links [edge-tts-universal](https://www.npmjs.com/package/edge-tts-universal) (AGPL-3.0). It also bundles a GPL build of [FFmpeg](https://ffmpeg.org/) through ffmpeg-static (GPL-3.0-or-later); the corresponding FFmpeg source is available at <https://ffmpeg.org/download.html#get-sources>. Other notable components: Electron, Vue.js, electron-store, @electron-toolkit/\*, Vite and electron-vite (MIT), and TypeScript (Apache-2.0). The complete attribution list is shown in the app under **Help → About**.

## Copyright

Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. (https://www.tzzhy.cn/). All rights reserved.

Speech synthesis is provided by the online Microsoft Edge speech service. This project is an independent client and is not affiliated with or endorsed by Microsoft.
