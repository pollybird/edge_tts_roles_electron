# edge-tts-roles User Manual

**Edge-TTS Multi-Voice Audio Generator** (v2.0.3)

A desktop application that turns marker-based text scripts into multi-speaker audio. It uses Microsoft's online Edge speech synthesis service: assign a different neural voice to each speaker, switch roles freely in one script, control pauses and beeps, optionally add music, and export WAV / MP3 / OGG / FLAC files.

> This manual addresses both **end users** and **developers**: the first half is a usage guide, the second half covers development, building and releasing.

---

## Table of Contents

### Part I — End-User Guide

- [1. About the App](#1-about-the-app)
- [2. Installation & First Launch](#2-installation--first-launch)
- [3. Quick Start: A Voice-Over in Ten Minutes](#3-quick-start-a-voice-over-in-ten-minutes)
- [4. Marker Syntax](#4-marker-syntax)
- [5. Role Voice Settings](#5-role-voice-settings)
- [6. The Text Editor](#6-the-text-editor)
- [7. Audio Extras: Intro / Outro / Background Music](#7-audio-extras-intro--outro--background-music)
- [8. Preview](#8-preview)
- [9. Generating & Exporting](#9-generating--exporting)
- [10. Interface Language](#10-interface-language)
- [11. Automatic Updates](#11-automatic-updates)
- [12. Keyboard Shortcuts](#12-keyboard-shortcuts)
- [13. FAQ](#13-faq)
- [14. Troubleshooting](#14-troubleshooting)

### Part II — Developer Guide

- [15. Project Structure](#15-project-structure)
- [16. Technology Stack](#16-technology-stack)
- [17. Requirements & Local Development](#17-requirements--local-development)
- [18. Unit Tests](#18-unit-tests)
- [19. Building & Packaging](#19-building--packaging)
- [20. How Auto-Update Works](#20-how-auto-update-works)
- [21. Adding a Language](#21-adding-a-language)
- [22. Release Process](#22-release-process)

**Appendix**

- [A. Useful Links](#a-useful-links)
- [B. License & Copyright](#b-license--copyright)
- [C. Version History](#c-version-history)

---

# Part I — End-User Guide

## 1. About the App

**Edge-TTS Multi-Voice Audio Generator (edge-tts-roles)** is a local desktop app that:

- Takes a **plain-text script** with lightweight markers: `[A]`, `[B]`, `[1000]`, `[R]`;
- Lets you assign a different **neural voice** to **four roles (A–D)**, each with its own rate, volume and pitch;
- Synthesizes each segment through Microsoft's online Edge speech service and stitches it together with pauses and beeps;
- Optionally mixes in an **intro, outro and background music**;
- Exports WAV (32-bit float), MP3, OGG and FLAC audio files.

### 1.1 Key Features

| Feature | Description |
| --- | --- |
| Four switchable roles | Each role (A–D) has its own voice, rate, volume and pitch |
| Marker-based scripts | Switch voices, insert millisecond pauses and beeps without leaving the text |
| Full voice catalog | Voices are fetched from the service, grouped by language with localized names |
| Reliable long-form synthesis | Up to 15 automatic retries per segment, a 15-second idle watchdog and jittered backoff |
| Resume from breakpoint | Completed segments are cached on disk, so a re-run skips what already worked |
| Audio extras | Intro / outro / background music, each with a 0–100% volume control; BGM loops automatically |
| Instant preview | Audition the whole text or just the selection before exporting (extras included) |
| Four output formats | WAV, MP3, OGG Vorbis, FLAC — all processed by a bundled ffmpeg, no system install needed |
| Config import/export | Save the four roles' voice / rate / volume / pitch to a JSON file and reuse it |
| 9 interface languages | English, Simplified Chinese, Traditional Chinese, French, German, Spanish, Russian, Japanese, Arabic (with RTL layout) |
| Auto-update | Silent check after launch, or manual check anytime; GitHub primary source + GitCode fallback |

### 1.2 Important Notes

- **Internet access is required**: speech synthesis is provided by Microsoft's online Edge speech service; nothing can be generated offline.
- This app is an **independent client** and is not affiliated with, sponsored by, or endorsed by Microsoft.
- Please use the generated speech lawfully and respect the reasonable limits of voice and content use.

---

## 2. Installation & First Launch

### 2.1 Download & Install

Download the installer for your platform from the official release channel:

| Platform | Installer | Architecture |
| --- | --- | --- |
| Windows | `edge-tts-roles-*-setup.exe` (NSIS setup wizard) | x64 / arm64 |
| macOS | `.dmg` (drag to Applications) or `.zip` | Intel (x64) / Apple Silicon (arm64) |
| Linux | `.AppImage` / `.deb` / `.rpm` | x86_64 / arm64 |

Notes:

- **Windows**: the NSIS installer is an assisted (non-one-click) installer. It shows the complete **GNU AGPL v3 license** page, lets you choose the installation directory, and creates desktop and Start Menu shortcuts by default.
- **macOS**: if Gatekeeper flags the app as "unidentified developer", allow it in **System Settings → Privacy & Security** (required when the app is not notarized).
- **Linux AppImage**: after downloading, run `chmod +x edge-tts-roles-*.AppImage` and double-click to launch.

### 2.2 First Launch: User Agreement

On first launch, a **mandatory User Agreement dialog** appears before the main window:

- You must click **"I have read and agree to the User Agreement"** to continue;
- Check **"Do not show again next time"** to persist your acceptance — it will not be asked again;
- Without the checkbox, the agreement is accepted for this session only and will appear again next launch;
- Clicking **"Disagree and Exit"** quits the application immediately.

The dialog **cannot** be bypassed by clicking the overlay, pressing Esc, or using a close button.

> Open-source notice in the agreement: the app is released under GNU AGPL v3 and bundles a GPL build of FFmpeg; the full attribution list is shown under **Help → About**.

### 2.3 Main Window Overview

The window opens **maximized** by default:

```
┌──────────────────────────────────────────────────────────────┐
│ Menu bar: File  Edit  Language  Help                          │
├───────────────────────────────┬──────────────────────────────┤
│                               │  Voice Settings (A/B/C/D)    │
│        Text Editor            │  ─────────────────────────── │
│       (toolbar & find bar)    │  Audio Extras                │
│                               │  (Intro / Outro / BGM)       │
├───────────────────────────────┴──────────────────────────────┤
│ Output panel: Output File | Format | Generate | Stop | progress│
└──────────────────────────────────────────────────────────────┘
```

- **Text Editor** (left): write and edit the script; role/pause/beep insert buttons, quick pauses, find & replace.
- **Voice Settings** (top right): assign a voice and tune rate, volume, pitch for roles A–D.
- **Audio Extras** (bottom right): pick local audio files for intro / outro / background music.
- **Output panel** (bottom): choose the output path and format, trigger generation and watch progress.

---

## 3. Quick Start: A Voice-Over in Ten Minutes

### Step 1 — Pick voices

In **Voice Settings** on the right, choose a voice for each role you will use:

1. Click the voice dropdown; voices are grouped by language (system language first, then English, then others);
2. Select a neural voice that fits your character;
3. (Optional) drag the Rate / Volume / Pitch sliders to fine-tune.

### Step 2 — Write the script

Type or paste the script into the editor using the marker syntax:

```
[A]Hello everyone, welcome to the show.[B]And I'm your co-host B.[1000]
[C]I take over after a one-second pause. Thank you.[R]
```

You can also use the `[A]` `[B]` `[C]` `[D]` buttons on the toolbar to insert markers at the cursor.

### Step 3 — Preview

- Select part of the text and click **Preview Selection**;
- Or click **Preview All Text**.

The app synthesizes a temporary WAV file and plays it in a built-in player, so you can check the result before exporting.

### Step 4 — Export

1. Click **Output File...** at the bottom and choose a save path;
2. Pick a **Format** (WAV / MP3 / OGG / FLAC);
3. Click **Generate Audio**.

Progress is shown segment by segment; when finished, the status bar shows the output path. You now have a complete multi-speaker audio file.

---

## 4. Marker Syntax

The script is plain text; square-bracket markers control "who speaks, how long to pause, and what beep".

| Marker | Meaning |
| --- | --- |
| `[A]` / `[B]` / `[C]` / `[D]` | Switch to role A / B / C / D from this point on |
| `[number]` | Insert a pause of that many **milliseconds**, e.g. `[1000]` = 1 second (any non-negative integer) |
| `[R]` | Insert a beep tone (**500 ms / 1000 Hz**, with fade in/out to avoid clicks) |

Rules and examples:

- **Text before the first role marker** is spoken by role A.
- Role markers are **stateful**: after switching, all following text belongs to that role until the next switch.
- A script may contain any number of role switches, pauses and beeps, executed in order.

```text
[A]First line, role A.[500][B]Role B with a half-second pause between sentences.[R]

[C]Role C now, note the switch has no pause.[D]
The final line goes to role D,[2000]then two seconds of silence.
```

Parsing behavior:

- Unknown markers such as `[X]` are **not parsed** and are read **as plain text** by the current role;
- Consecutive markers with no text between them do not create empty speech segments;
- Numbers inside markers are milliseconds; malformed constructs (e.g. `[abc]`, `[]`) are treated as plain text;
- Every role used in the script **must have a voice assigned**, otherwise generation stops with "Role X has no voice selected".

---

## 5. Role Voice Settings

### 5.1 The Four Roles & Voices

- The roles are identified as A, B, C, D (shown as "Role A" … "Role D" in English UI).
- Each role's dropdown lists the full Edge TTS catalog, grouped by language.
- Voices are shown as "Name - Language (Region) - Gender"; hovering an option reveals the internal short name (e.g. `en-US-AriaNeural`).

### 5.2 Voice Parameters

| Parameter | Range | Description |
| --- | --- | --- |
| Rate | −100 ~ +100 | Percent offset; 0 = original speaking rate |
| Volume | −100 ~ +100 | Percent offset; 0 = original volume |
| Pitch | −100 ~ +100 | Hz offset; 0 = original pitch |

The current value is shown next to each slider. Start from 0 and adjust gently to avoid distortion.

### 5.3 Config Import / Export

Save all four roles' settings as a JSON file and reuse them across scripts:

- **Save Config**: `Ctrl/Cmd + Shift + S` (or the "Save Config" button on the right panel).
- **Load Config**: `Ctrl/Cmd + Shift + O` (or the "Load Config" button).

The exported file looks like this:

```json
{
  "app": "edge-tts-roles",
  "version": 1,
  "savedAt": "2026-10-07T08:00:00.000Z",
  "roleSettings": {
    "A": { "voice": "en-US-AriaNeural", "rate": 0, "volume": 0, "pitch": 0 },
    "B": { "voice": "en-US-GuyNeural", "rate": 5, "volume": -10, "pitch": 2 },
    "C": { "voice": "", "rate": 0, "volume": 0, "pitch": 0 },
    "D": { "voice": "", "rate": 0, "volume": 0, "pitch": 0 }
  }
}
```

Validation rules when loading:

- Both the wrapped form (`{ roleSettings: {...} }`) and a bare per-role object are accepted;
- Numeric fields are rounded and clamped to −100 ~ +100;
- At least one role must have a voice, or the app reports "No selected voice was found in the config file";
- Empty roles stay empty (you will be prompted to pick a voice when generating).

---

## 6. The Text Editor

### 6.1 Toolbar

| Area | Button / control | Purpose |
| --- | --- | --- |
| Roles | `[A]` `[B]` `[C]` `[D]` | Insert the corresponding role marker at the cursor |
| Pause | "Insert Pause" + a ms input | Insert `[value]` using the number box (default 1000 ms, 10–10000) |
| Quick pause | ⏱ 0.5s / 1s / 2s / 3s / 5s | One-click insertion of a pause of that length |
| Beep | "Insert Beep [R]" | Insert `[R]` at the cursor |
| Files | Open Text / Save Text | Read and write `.txt` script files |
| Preview | Preview Selection / Preview All Text | See [Chapter 8](#8-preview) |

All inserts happen **at the cursor position** and keep the focus in the editor for continuous typing.

### 6.2 Marker Highlighting

Markers are highlighted live while you type:

- Role markers `[A]`–`[D]`: role color;
- Pause `[number]`: pause color;
- Beep `[R]`: beep color.

The editor is built as a transparent `textarea` over a synchronized highlight layer: typing and highlighting never interfere, and all normal clipboard/context-menu behaviors apply.

### 6.3 Find & Replace

- Open the find bar: `Ctrl/Cmd + F`;
- Open replace mode: `Ctrl/Cmd + H`;
- "Match case" toggle available;
- `Enter` next / `Shift + Enter` previous;
- "Replace" replaces one match at a time, "Replace All" replaces everything;
- Selecting a single line of text before opening the bar pre-fills the find box.

### 6.4 Other Bits

- The footer shows a live **character count**;
- Opening a file shows its path in the status bar;
- Text save and voice-config save/load use native system dialogs.

---

## 7. Audio Extras: Intro / Outro / Background Music

The **Audio Extras** panel sits below Voice Settings and hosts three local audio tracks:

| Track | Playback |
| --- | --- |
| Intro | Played once **before** the narration |
| Outro | Played once **after** the narration |
| Background Music | Mixed **under** the narration; loops if shorter, truncated if longer |

Each track has an independent volume slider (0–100%):

- Intro / outro default to 100%;
- Background music defaults to **30%** (kept low so it never drowns the voice).

Accepted formats: MP3, WAV, OGG, FLAC, M4A, AAC, OPUS, WMA (anything the bundled ffmpeg can decode).

> Mixing is hard-clipped to ±1.0 to prevent clipping; mixing runs only when at least one track is selected, otherwise it is skipped to save time.

---

## 8. Preview

Click **Preview Selection** (after selecting text) or **Preview All Text**:

1. If the text contains no role marker at all, `[A]` is added automatically so role A speaks it;
2. The app runs the exact same pipeline as a real export (extras included) but only writes a temporary WAV under the system temp directory;
3. The **Audio Preview** dialog opens:

| Control | Description |
| --- | --- |
| Seek bar & time | Drag to jump; shows `current / total` |
| Play / Pause / Stop | Basic transport controls |
| Volume | Per-player volume (default 80%) |
| Status | Loading / Ready / Playing / Paused / Stopped / Finished |

- Closing the dialog stops playback and releases the temporary file;
- A preview never modifies what is in the editor.

---

## 9. Generating & Exporting

### 9.1 Steps

1. In the bottom output panel click **Output File...** and pick a path (defaults to `output.<format>` in your Music folder);
2. Choose a **Format**:
   - **WAV** — 32-bit float stereo, largest size, lossless;
   - **MP3** — `libmp3lame` high-quality compression, best compatibility;
   - **OGG** — Vorbis compression;
   - **FLAC** — lossless compression;
3. Click **Generate Audio**.

### 9.2 During Generation

- The status bar shows live progress (percentage + localized messages: which segment is being synthesized, retries, cache hits, pauses, beeps, mixing, encoding);
- **Stop** interrupts the job at any time (takes effect within 0.2 s);
- On success the output path is shown in the status bar.

### 9.3 Reliability Notes (advanced users)

- **Automatic retries**: each text segment retries up to 15 times on network interruption; backoff grows from 1 s to 30 s with ±20% random jitter (fast retries for transient glitches, long waits for sustained outages);
- **Idle watchdog**: 15 seconds without audio data marks the connection as dead and triggers a retry instead of hanging forever;
- **Inter-segment cooldown**: after a retried segment, the next one waits 0.5–2 s; two consecutive clean successes relax the cooldown;
- **Disk cache (resume)**: every successful segment is cached under `userData/tts-segment-cache` keyed by `voice|rate|volume|pitch|text`; re-running a script that failed mid-way hits the cache and only synthesizes what is missing. The cache prunes to 200 entries (LRU) once it exceeds 300.

### 9.4 Formats & Encoders

| Format | Encoder | Notes |
| --- | --- | --- |
| WAV | written directly | IEEE 32-bit float, stereo, 24 kHz |
| MP3 | `libmp3lame` (quality q2) | lossy, small |
| OGG | `libvorbis` (quality q4) | |
| FLAC | `flac` | lossless |

Internal pipeline: Edge TTS streams MP3 → ffmpeg decodes to 24 kHz stereo 32-bit float PCM → silence and beeps are concatenated → audio extras are mixed → the final format is encoded. Everything is done by the **bundled ffmpeg**; no system tools are required.

---

## 10. Interface Language

### 10.1 Built-in Languages

The app ships **9 languages**: English, Simplified Chinese, Traditional Chinese, French, German, Spanish, Russian, Japanese and Arabic.

### 10.2 Switching & Persistence

- Language switching lives in the system menu's **"Language"** menu (between "Edit" and "Help");
- The menu lists the 9 languages as radio items; the active one is checked;
- Selecting one applies **immediately** and **persists** across restarts;
- If you have never chosen one, the app **follows the system language**.

### 10.3 RTL Layout

Arabic is written right-to-left. Choosing Arabic switches the entire UI (menus, panels, editor) to an RTL layout.

> Changing the language rebuilds the native menus instantly; the rest of the UI refreshes via the renderer's reactive locale.

---

## 11. Automatic Updates

### 11.1 When Checks Happen

- About **5 seconds after launch** a silent check runs: if a new version exists it starts downloading and notifies you; if not, it stays quiet;
- Use **Help → Check for Updates** anytime: if you are already up to date, a message **explicitly tells you so**; otherwise it offers the download.

### 11.2 Update Flow

1. A new version is found (silently or manually) → download starts automatically with progress shown;
2. When the download finishes you are prompted; the update installs on **app quit**;
3. You may also postpone and let it install on the next restart.

### 11.3 Update Sources

- **Primary**: GitHub Releases;
- **Fallback**: GitCode Release assets (used when GitHub is unreachable; probe timeout ≈ 3.5 s).

> Updates are only pulled from these official sources. Do not install builds from third-party sites.

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + O` | Open a text file |
| `Ctrl/Cmd + S` | Save the text |
| `Ctrl/Cmd + Shift + O` | Load voice config (JSON) |
| `Ctrl/Cmd + Shift + S` | Save voice config (JSON) |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + X` / `C` / `V` | Cut / Copy / Paste |
| `Ctrl/Cmd + F` | Find (open the find bar) |
| `Ctrl/Cmd + H` | Replace (open replace mode) |
| `Alt + F4` | Quit (Windows/Linux) |
| `F1` | Open the Help dialog |
| `F12` | Toggle DevTools (development builds only) |

Inside the find/replace inputs: `Enter` next, `Shift + Enter` previous, `Esc` close.

---

## 13. FAQ

**Q1: Is internet access really required?**

Yes. Voices are synthesized by Microsoft's online Edge service; the local app only parses, assembles and encodes.

**Q2: It says "Role X has no voice selected". What do I do?**

Open Voice Settings and assign a voice to that role. Each role is configured independently; any role you use must have a voice. Unused roles may stay empty.

**Q3: Will generation fail on a flaky network?**

Not immediately. Each segment retries up to 15 times with jittered backoff, and completed segments are cached. After the network recovers, re-running the script resumes from the breakpoint, usually completing fine.

**Q4: I hit Stop halfway. Can I continue?**

Cached segments are kept. Re-running the same script (same text and settings) will hit the cache for completed parts and only synthesize the rest.

**Q5: Where is the cache, and does it grow forever?**

Under the system's app-data directory (`userData/tts-segment-cache`). Once it exceeds 300 entries it prunes to 200 (oldest first). No manual cleanup needed.

**Q6: Will mixing clip?**

No. Every overlay (BGM, gain scaling) is hard-clipped to ±1.0. Keeping BGM around 30% gives the cleanest result.

**Q7: Whose voice is this?**

It is the neural voice you selected from Microsoft Edge's TTS catalog (e.g. `en-US-AriaNeural`). Different roles with different voices produce a multi-person conversation.

**Q8: Can I play exported audio offline later?**

Yes. Exports are standard audio files playable anywhere.

**Q9: How do I share my role settings with someone?**

Click "Save Config" in Voice Settings, send the JSON file, and the other person clicks "Load Config".

**Q10: "Check for updates" failed?**

Auto-update depends on GitHub or GitCode reachability. Try again later or use Help → Check for Updates manually. This never affects locally exported files.

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Cannot connect" on startup | No network / system proxy off | Check the network and proxy; the app needs Edge TTS and update sources |
| "Edge TTS server error (5xx)" while generating | Temporary Microsoft-side failure or regional issue | Retry later (backoff is automatic); try another network if it persists |
| A role's voice is unclear | Voice or settings mismatch | Tune that role's volume/rate; lower BGM volume if it competes |
| "Failed to load extra audio" | Unsupported format or corrupt file | Retry with a common format (MP3/WAV) or re-encode first |
| Cached audio seems stale | Settings changed → cache key changed | Expected behavior; no cleanup needed, LRU prunes automatically |
| Menus switch back to the system language | Locale preference reset / first launch | Re-pick it in the Language menu; the choice persists |

---

# Part II — Developer Guide

## 15. Project Structure

```
edge_tts_roles_electron/
├── src/
│   ├── main/                 Electron main process
│   │   ├── index.ts          App lifecycle, main window, startup init
│   │   ├── ipc.ts            IPC handlers: dialogs, config import/export, agreement quit
│   │   ├── ttsService.ts     Synthesis pipeline: parse → synthesize → retry → cache → mix → encode
│   │   ├── audioProcessor.ts PCM math + ffmpeg decode/encode (24 kHz stereo f32)
│   │   ├── ffmpegResolver.ts Runtime ffmpeg path resolution (packaged/dev/PATH)
│   │   ├── updater.ts        electron-updater glue: event forwarding, silent/manual checks
│   │   ├── updateFeed.ts     Feed probing (pure logic, mockable for unit tests)
│   │   ├── menu.ts           Localized application menu (File/Edit/Language/Help)
│   │   └── settings.ts       Typed electron-store settings
│   ├── preload/
│   │   └── index.ts          contextBridge API exposed as window.api
│   ├── renderer/             Vue 3 renderer
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts       Bootstrap: apply persisted locale, then mount
│   │       ├── App.vue       Root component: state, agreement gate, update events
│   │       ├── components/   TextEditor, RoleSettings, AudioExtrasPanel,
│   │       │                 OutputPanel, PreviewDialog, AgreementDialog
│   │       └── composables/  useI18n (reactive locale + RTL)
│   └── shared/               Shared by main and renderer (no Electron deps)
│       ├── types.ts          Request/response types and RendererApi contract
│       ├── ipc.ts            IPC channel names (single source of truth)
│       ├── textParser.ts     Marker parser
│       ├── voiceGroups.ts    Voice grouping/sorting
│       ├── voiceDisplay.ts   Localized voice display names
│       └── i18n/             i18n core + 9 locale packs
├── tests/                    vitest unit tests
├── scripts/
│   ├── download-ffmpeg-binaries.mjs   Download cross-platform ffmpeg
│   ├── package-dist.mjs               Per-arch packaging (extraResources workaround)
│   └── publish-gitcode.mjs            Mirror assets to GitCode Release
├── .github/workflows/
│   ├── ci.yml                typecheck / lint / test
│   └── release.yml           v* tag triggers three-platform release
├── electron-builder.yml      Packaging config
├── electron.vite.config.ts   electron-vite config
└── package.json
```

## 16. Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Electron 39, electron-vite 5 |
| Renderer | Vue 3.5 (Composition API + `<script setup>`), TypeScript 5.9 |
| Synthesis | `edge-tts-universal` (Microsoft Edge online TTS client, AGPL-3.0) |
| Audio | `ffmpeg-static` (bundled ffmpeg binary) |
| Persistence | `electron-store` |
| Updates | `electron-updater` |
| Tests | `vitest` |
| Static checks | ESLint 9 + Prettier + TypeScript strict (`noUnusedLocals`) |

## 17. Requirements & Local Development

### 17.1 Prerequisites

- Node.js `^20.19 || >=22.12` (LTS recommended)
- npm
- Network access to Microsoft Edge TTS for synthesis

### 17.2 Install & Run

```bash
npm install
npm run dev
```

- `npm run dev` starts the electron-vite HMR dev environment;
- Auto-update is **disabled in dev** (skipped unless `app.isPackaged`);
- No manual ffmpeg needed in dev — `ffmpeg-static` downloads the current platform's binary during `npm install`.

### 17.3 Useful Scripts

```bash
npm run dev          # dev run (HMR)
npm run typecheck    # tsc (main/preload) + vue-tsc (renderer), no emit
npm run lint         # ESLint
npm run format       # Prettier write
npm test             # vitest unit tests
npm run build        # typecheck + electron-vite build (output in out/)
```

## 18. Unit Tests

Tests use **vitest** 4.x with the config in `vitest.config.mts` (Node environment, pure-logic `tests/` only). Currently **5 test files, 56 tests**, all passing:

```bash
npm test
```

Coverage:

| Module | What is covered |
| --- | --- |
| `textParser` | Marker parsing, role switching, pauses, beeps, edge cases (`[X]` kept as text, empty input, consecutive markers) |
| `voiceGroups` | Language-first grouping/sorting, same-language merge, stable order |
| `voiceDisplay` | Person/region/gender formatting and fallbacks |
| `audioProcessor` | Silence, beep with fades, PCM concat, loop-to-length, mixing hard-clip, gain scaling |
| `ttsService` | Backoff table ±20% jitter, stop interruption, segment cache key stability |
| `updateFeed` | GitHub-first preference, GitCode fallback (incl. HTML-page detection), dual-source failure, platform → latest*.yml mapping |

Design rule: core business logic is extracted into **Electron-free pure functions/classes** (e.g. `updateFeed.ts`) so it can be unit-tested with injected mocks.

## 19. Building & Packaging

### 19.1 Base Build

```bash
npm run build             # typecheck + bundle JS into out/
npm run build:unpack      # unpacked app into dist/ (fast local test)
```

### 19.2 Platform Installers

```bash
npm run build:linux       # AppImage + deb + rpm (x64 + arm64)
npm run build:win         # NSIS installers (x64 + arm64; Wine used on Linux)
npm run build:mac         # DMG + ZIP (must run on macOS)
npm run build:mac:zip     # ZIP only (produces on Linux/Windows too)
npm run build:all         # linux + win + mac:zip (used by CI releases)
```

Platform notes:

- Every `build:*` has a `pre` hook that runs `prepare:ffmpeg`, downloading all target-platform ffmpeg binaries (Linux x64/arm64, Windows x64, macOS x64/arm64, ~320 MB total) into `resources/ffmpeg/` (git-ignored); set `FFMPEG_BINARIES_URL` to use a mirror when GitHub is slow (the script also falls back to npmmirror automatically);
- Windows on ARM has no official ffmpeg: the arm64 package ships the x64 `ffmpeg.exe` (runs via Windows 11 on ARM's x64 emulation); if missing, the app falls back to a system `ffmpeg` on PATH;
- DMG creation requires macOS; signing/notarization must run on macOS;
- `electron-builder.yml` sets `publish.provider` to GitHub; local builds always use `--publish never` to avoid accidental uploads.

### 19.3 Why a Per-Arch Script?

`scripts/package-dist.mjs` exists because `extraResources` is a static config that cannot point to different ffmpeg directories per architecture in a single x64+arm64 run. It stages `resources/ffmpeg/<triplet>` into `resources/.ffmpeg-stage-<platform>/`, generates a temporary config whose `extraResources` points there, invokes electron-builder per architecture, then cleans up.

## 20. How Auto-Update Works

### 20.1 Module Split

- `src/main/updateFeed.ts` (pure logic): decides the right `latest*.yml` for the current platform, probes the GitHub feed, resolves the latest GitCode tag, and builds the fallback feed base;
- `src/main/updater.ts` (Electron glue): configures `electron-updater`'s generic provider with the resolved base URL, forwards events to the renderer, and distinguishes silent vs. manual checks.

### 20.2 Events & IPC

The renderer subscribes via `onUpdateEvent`:

| Event | Payload | UI behavior |
| --- | --- | --- |
| `checking` | — | "Checking for updates..." |
| `available` | version / releaseDate | Offer and download the new version |
| `not-available` | version / manual | Show "already up to date" **only when manual** |
| `download-progress` | percent / bytesPerSecond / total / transferred | Show download progress |
| `downloaded` | version | Offer restart-to-install |
| `error` | empty | Generic "check failed" dialog (details stay in the main-process log) |

- The error payload is intentionally **not forwarded verbatim**, so HTML/stacks never leak into the UI;
- `update:install` calls `quitAndInstall(false, true)` — user-confirmed quit, install, restart.

### 20.3 Feed Resolution

1. Pick the platform manifest: `win → latest.yml`, `mac → latest-mac.yml`, `linux → latest-linux.yml`;
2. Probe `https://github.com/.../releases/latest/download/<file>` (3.5 s timeout, `Range: bytes=0-0`); use GitHub if reachable and not HTML;
3. Otherwise call GitCode's public API for the latest release `tag_name` and probe `/releases/download/<tag>/<file>` as the fallback base;
4. If both fail, skip the check for this run (no requests to invalid endpoints).

## 21. Adding a Language

### 21.1 Locale Pack Structure

UI strings live in `src/shared/i18n/locales/<locale>.ts`, a typed object:

- `messages`: UI copy (menus, buttons, statuses, errors) with dotted keys;
- `voices.voiceNames`: localized voice names keyed by short name;
- `voices.localeNames`: localized region names keyed by locale;
- `voices.gender`: gender terms;
- `voices.displayPattern`: display template (`{name} - {region} - {gender}`).

`en-US` is the fallback pack — any missing key automatically falls back to English, so the UI never shows an empty string.

### 21.2 Adding a New Language

1. Copy `locales/en-US.ts` to `locales/xx-XX.ts` and translate `messages` (and voice terms);
2. In `src/shared/i18n/index.ts`:
   - Import the new pack;
   - Add it to `LOCALE_PACKS` (exact match) and `LANGUAGE_PREFIX_PACKS` (prefix fallback);
   - Add an entry in `availableLocales()` (native self-name);
   - If it is an RTL language, extend `isRtlLocale()`;
3. Run typecheck — locale packs are strongly typed.

### 21.3 Language Switch Flow (native menu)

- The "Language" menu is handled by `changeLocale` in `src/main/menu.ts`:
  1. `setSetting('locale', code)` persists it;
  2. `setLocale(code)` updates the main-process i18n;
  3. `buildMenu()` rebuilds the native menus;
  4. `locale:changed` is broadcast over IPC;
- The renderer's `useI18n` listens and calls `applyLocaleLocal(code)` — updating the shared `localeRef` and `<html dir>`;
- On startup, `renderer/main.ts` reads `getSetting('locale')` first so the UI never flashes the system language.

## 22. Release Process

### 22.1 CI & Pre-flight

- On pushes to `main` or PRs, `.github/workflows/ci.yml` runs `typecheck`, `lint` and `npm test`;
- Before releasing, ensure locally: `npm run typecheck && npm run lint && npm test` all pass.

### 22.2 Automated Release (recommended)

1. Tag and push:

   ```bash
   git tag v2.0.x
   git push origin v2.0.x
   ```

2. `.github/workflows/release.yml` then:
   - On a Linux runner: `npm ci` and `npm run build:all` (full three-platform, dual-architecture set: installers, blockmaps and three `latest*.yml`, 17 artifacts in total);
   - Publishes to GitHub Release via `softprops/action-gh-release`;
   - If `GITCODE_TOKEN` is configured: pushes the tag to GitCode and runs `node scripts/publish-gitcode.mjs` to mirror assets (existing assets are skipped — GitCode does not support overwrite);
   - Gitee (per-file 100 MB limit) must be released manually with a source archive that points to GitHub/GitCode for downloads.
3. The Actions UI also supports re-running the workflow against an **existing tag** to backfill missing assets.

### 22.3 Manual Local Release (no CI)

```bash
npm run build:linux
npm run build:win
npm run build:mac:zip        # build:mac (DMG) must run on macOS

GITCODE_TOKEN=xxx npm run release:gitcode   # mirror to GitCode
```

Before release, verify that `electron-builder.yml`'s `artifactName` matches the `latest*.yml` contents (paths inside the yml are relative to the feed base).

### 22.4 Changelog

Each release prepends a section to `UPGRADE.md` / `UPGRADE_CN.md` (categorized: New features / Bug fixes / Security / Engineering / License changes) in sync with the version number.

---

# Appendix

## A. Useful Links

| Resource | URL |
| --- | --- |
| Project homepage (AtomGit) | https://atomgit.com/pollybird/edge_tts_roles_electron |
| GitHub mirror | https://github.com/pollybird/edge_tts_roles_electron |
| Releases / downloads | Release pages on each platform |
| Company website | https://www.tzzhy.cn/ |

## B. License & Copyright

- **License**: GNU Affero General Public License v3.0 (AGPL-3.0-only). The project links `edge-tts-universal` (AGPL-3.0), so the app as a whole is released under AGPL; it also bundles a GPL build of FFmpeg (GPL-3.0-or-later), whose source is available at https://ffmpeg.org/download.html#get-sources.
- **Copyright**: © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. All rights reserved.
- Speech synthesis is provided by Microsoft's online Edge speech service; this project is an independent client and is not affiliated with, sponsored by, or endorsed by Microsoft.
- The full open-source attribution list is shown in-app under **Help → About**.

---

## C. Version History

| Version | Highlights |
| --- | --- |
| v2.0.3 | **Persisted language switching** (editor dropdown replaced by the "Language" menu radio items; choice saved); **first-launch User Agreement gate** (mandatory modal, persisted with "Do not show again"); **manual check feedback** ("already up to date" only for manual checks, silent startup check stays quiet); feed probing extracted into a mockable pure module (15 tests); CI (typecheck/lint/test) and automated release workflows; GitCode mirror script (`scripts/publish-gitcode.mjs`) |
| v2.0.2 | **Auto-update** (GitHub primary + GitCode fallback); **runtime language switching** (editor dropdown in v2.0.2, moved to the native menu in v2.0.3); **Arabic (RTL) and Traditional Chinese**; fixed update-error content leaking into the status bar; agreement clause 4 aligned with AGPL-3.0 |
| v2.0.1 | Fixed hard-coded Chinese "已停止" in the preview dialog; `readAudioFile` IPC now validates an audio-extension allowlist; introduced vitest unit tests; full Prettier pass |
| v2.0.0 | Audio extras (intro/outro/BGM); maximized window by default; cross-platform dual-arch builds (Win NSIS / macOS DMG+ZIP / Linux AppImage+deb+rpm); bundled ffmpeg |

Full changelogs live in `UPGRADE.md` / `UPGRADE_CN.md` at the repository root.

---

*This manual is written against v2.0.3. On-screen labels follow the selected language; wording may differ from the screenshots described here.*