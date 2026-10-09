# Upgrade Log

## v2.0.5

### New Features

- **Synchronized subtitle generation**: audio generation can now also export **LRC / SRT subtitles**. Timestamps are collected during the concatenation stage by counting PCM samples (sample-aligned with the output audio), and the actual speech boundaries within each segment are located via energy detection; the LRC role prefix uses full-width 【A】 (avoiding the syntax conflict with enhanced-LRC per-word timestamps `<mm:ss.xx>` — some players parse `<B>` as a timestamp and drop the whole line), while SRT uses the `[A]` prefix; subtitle times are automatically offset when intro/outro audio is present.
- **Update confirmation dialog**: when a new version is found, the app no longer downloads silently — it shows a "New version available" dialog (**Install now / Remind later / Skip this version**). The download (with progress) starts only after the user clicks "Install now", and installation is confirmed again once the download completes. "Skip this version" is persisted per version number; higher versions still prompt. The manual "Check for Updates" action ignores this preference.
- **TTS provider abstraction layer**: the new `src/main/tts/provider/` module defines the `TTSProvider` interface and the per-segment synthesis contract; edge-tts-universal is the default implementation, injected into `SegmentSynthesizer` via a factory. This reserves an extension point for future local offline engines while keeping external behavior unchanged.

### Improvements

- **Default export format is now MP3**: the format dropdown order is MP3 / OGG / FLAC / WAV with MP3 selected by default.
- **MP3 output unified at 44.1 kHz**: the previous 24 kHz output is MPEG-2 LSF, whose duration/position calculation is inaccurate in some players (subtitle drift); output is now resampled to 44.1 kHz (MPEG-1), the most compatible spec across players.
- **Simplified-Chinese systems prefer GitCode**: when the OS locale is Simplified Chinese (`zh-CN` / `zh-Hans*`), the update feed probes GitCode first — these systems are mostly in mainland China, where direct GitHub access is unstable and installer downloads are slow even when the manifest probe succeeds — falling back to GitHub when GitCode is unreachable. All other locales keep GitHub first with GitCode fallback.

### Bug Fixes

- **UI reset after stopping a task**: the main process now sends a `task:stopped` event to the renderer when generation is stopped, fixing the generate button not recovering.
- **Triple integrity check for synthesis**: on top of "stream finalization signal (`turn.end`)" and "cross-validation of the server-declared speech end against actual PCM duration", a third independent criterion is added — **tail alignment** between the server's word-boundary (WordBoundary) texts and the source text (`spokenTail`). When the server ends early and swallows trailing words, their word boundaries are never pushed, so the declared end and the audio remain "self-consistent" and duration checks cannot detect it; the mismatch between the spoken word sequence and the source text tail is the only prior that does not rely on server self-reporting. Failing segments are always discarded and retried, never written to the cache; the cache key is versioned to v3 so historical truncated entries self-heal.
- **1 second of trailing silence**: every export now appends 1 second of silence at the end. Some playback chains (Bluetooth audio latency, players closing the audio device early) cut off the last few hundred milliseconds of actual speech before the file finishes ("the last few words are missing"); with the added silence, only silence gets cut.

### Testing

- Added `tests/subtitles.test.ts` (16 cases covering LRC / SRT formatting, timestamps, role prefixes and edge cases) and `tests/updatePrompt.test.ts` (4 cases covering per-version skip persistence and manual-check semantics); `ttsService` tests now cover the tail-alignment check (`isSpokenTailAligned`); `updateFeed` tests add the Simplified-Chinese GitCode-first paths and the `prefersGitCodeFirst` predicate (+5 cases). **8 test files, 105 cases all passing**.

### Engineering

- **Subtitle alignment debug switch**: with the environment variable `EDGE_TTS_DEBUG_CUES=1`, per-segment timeline data (segment start / length / detected speech boundaries) is written to `/tmp/cues-debug.json` to investigate subtitle/audio time offsets.

## v2.0.4

### Improvements

- **TTS main-process modularization**: the original 481-line `ttsService.ts` has been split into four responsibility-focused modules (the public API and the `ttsService` singleton are unchanged):
  - `src/main/tts/voiceCatalog.ts` — voice catalog caching.
  - `src/main/tts/segmentCache.ts` — PCM disk cache (lazy `cacheDir` initialization with `tmpdir` fallback, SHA-256 `keyFor`, LRU prune 300→200).
  - `src/main/tts/segmentSynthesizer.ts` — single-segment streaming synthesis with up to 15 retries and a 15 s idle watchdog.
  - `src/main/ttsService.ts` — pipeline orchestration, progress reporting and `attachExtras` (~240 lines).

### Testing

- **UI automated tests (Playwright / Electron)**: 9 end-to-end cases added, covering:
  - First-launch agreement gate (5): dialog shown on fresh userData, ESC/mask click cannot bypass, decline exits the app, accept without checkbox still prompts on restart, accept with checkbox persists and skips the dialog on restart.
  - Language menu switching and persistence (1): drives the native Language menu via `app.evaluate`, verifies the placeholder text changes and `settings.locale` is persisted across restarts.
  - Text editor marker insertion (3): role markers `[A][C]` in click order, custom pause + beep + quick pause producing `[A][500][R][1000]`, and markers mixed with manual typing (`[B]hello`).
  - Configured via `playwright.config.ts`; CI runs `xvfb-run --auto-servernum npm run test:e2e` and uploads the Playwright report on failure.

### Bug Fixes

- **App.vue IPC subscription timing**: all IPC subscriptions (`onProgress`, `onFinished`, `onError`, `onLocaleChanged`, `onMenuAction`, etc.) were previously registered *after* `await window.api.listVoices()`, so the `locale:changed` broadcast was lost when the voice list had not yet returned — language switching could silently fail shortly after first launch. Subscriptions are now registered synchronously at the top of `onMounted`, with async initialization moved into an IIFE. This regression was caught by the new E2E tests.

### Repository

- **Issue / PR templates & Code of Conduct**: added Issue templates (bug report, feature request), a Pull Request template, and a Contributor Covenant v2.1 Code of Conduct — all bilingual (Chinese + English).
- **README polish**: added shields.io badges (Star / License / Release / CI), a "Star this repo" call to action, and a product screenshot.
- **MANUAL update**: documented the `tts/` subdirectory project structure, Playwright in the technology stack, an E2E testing section, and the CI description.

## v2.0.3

### Improvements

- **Persistent language switching**: the language dropdown in the editor header has been removed. Language selection now lives in a new top-level **Language** menu (between Edit and Help), listing all 9 languages as radio items with the active one checked. The choice is persisted and reapplied on restart; users who never pick a language still follow the system language by default.
- **Feedback for manual update checks**: when **Help → Check for Updates** finds that the latest version is already installed, the app now shows an explicit message. The automatic background check on startup remains silent.
- **First-run user agreement gate**: on first launch the app shows a modal User Agreement dialog. The main window is fully blocked until the user clicks **I have read and agree to the User Agreement**; the dialog cannot be dismissed via mask click, ESC or a close button. A **Do not show again next time** checkbox persists the acceptance (leaving it unchecked allows this session but prompts again next launch), and **Disagree and Exit** terminates the app.

### Engineering

- **Testable feed resolution**: network probing was extracted from `updater.ts` into an Electron-free module, `src/main/updateFeed.ts`, which accepts an injected mock fetch. 15 new unit cases cover GitHub-first selection (GitCode never contacted), GitCode fallback (including GitHub serving an HTML error page), and both-sources-fail paths (API 5xx / network error / missing tag in response / attachment 404 / attachment served as HTML), plus platform-to-`latest*.yml` file-name mapping.
- **Release automation (CI)**:
  - `.github/workflows/ci.yml`: typecheck, lint and unit tests run on every push to `main` and every pull request.
  - `.github/workflows/release.yml`: pushing a `v*` tag builds Linux / Windows / macOS installers for both architectures on a Linux runner and publishes all 17 artifacts (installers, blockmaps, `latest*.yml`) to the GitHub Release. If the repository secret `GITCODE_TOKEN` is configured, the tag is pushed to GitCode and all assets are mirrored to the GitCode Release via `scripts/publish-gitcode.mjs` (existing attachments are skipped because GitCode cannot overwrite them). The workflow can also be re-run manually for an existing tag.
  - Gitee remains a manual source-only release due to its 100 MB per-asset limit.

## v2.0.2

### New Features

- **Arabic (ar-SA) translation** with full RTL layout support.
- **Traditional Chinese (zh-TW) translation** (Taiwan terminology).
- **Runtime language switcher**: a language dropdown in the editor header supports instant switching across 9 languages. The app follows the system language on startup; switching only affects the current session.
- **Auto-update**: the app checks for updates 5 seconds after launch, with a manual trigger under **Help → Check for Updates**. The primary feed is GitHub Releases; if GitHub is unreachable, it resolves the latest GitCode Release via the public API and falls back to the attached `latest*.yml`.

### Bug Fixes

- **Auto-update error handling**: when a feed returned an unexpected response (e.g. GitCode served an HTML page because `latest.yml` did not exist yet), the raw HTML/error text was written into the main window status bar. Update errors now show only a generic "Update check failed" dialog — no error content ever appears in the main window.

### Legal

- **User agreement clause 4 revised**: the original prohibition on reverse engineering/cracking conflicted with the AGPL-3.0 open-source nature. It now states compliance with the AGPL-3.0 license and prohibits infringing the rights of Microsoft and other service providers.

### Internal

- Added `electron-updater` dependency and the `src/main/updater.ts` module.
- CSS migrated to logical properties (`margin-inline-start/end`, `text-align: end`) for RTL compatibility.
- Updated user agreement clause 4 across all 9 language packs.

## v2.0.1

### Bug Fixes

- **i18n**: Preview dialog stop status was hardcoded in Chinese (`'已停止'`); now uses the translated key `preview.stopped` for all 7 built-in languages.

### Security

- **IPC path validation**: `readAudioFile` now validates the file extension against an allowlist (`mp3`, `wav`, `ogg`, `flac`, `m4a`, `aac`, `opus`, `wma`) before reading, preventing arbitrary file access through the IPC channel.

### Testing

- **Introduced unit tests**: Added [vitest](https://vitest.dev/) 4.1.11 as the test runner (`npm test`).
- **56 passing tests** covering:
  - `textParser` — marker parsing, role switching, pauses, beeps, edge cases
  - `voiceGroups` — grouping and sorting by system language priority
  - `voiceDisplay` — voice name / locale / gender formatting and fallback
  - `audioProcessor` — silence generation, beep synthesis, PCM concatenation, looping, mixing with hard clipping, gain scaling
  - `ttsService` — retry backoff table ±20% jitter, stop-requested interruption, segment cache key stability

### Maintenance

- Code formatted with `npm run format`.
- `AudioExtrasPanel.vue` `handlePickFile` catch block now logs errors to the console instead of silently swallowing them.

---

## v2.0.0

### New Features

- **Extra Audio Tracks**: upload local audio files as intro, outro, and background music, each with an independent 0–100% volume slider; background music is automatically looped to cover the entire voice track.
- **Launch Maximized**: the main window now opens maximized by default.

### Full Feature Set

- Four switchable speaker roles (A–D), each with independent neural voice, rate, volume, and pitch.
- Marker-based script: `[A]` `[B]` `[1000]` `[R]`.
- Reliable long-form synthesis: up to 15 retries per segment, 15 s idle watchdog, disk cache for resumable generation.
- Export to WAV / MP3 / OGG / FLAC (bundled ffmpeg, no system install required).
- Seven built-in UI languages: English, Simplified Chinese, French, German, Spanish, Russian, Japanese.
- Cross-platform: Windows (x64 / arm64), macOS (Intel / Apple Silicon), Linux (x86_64 / arm64).

### Infrastructure

- Built-in ffmpeg binaries are downloaded for all target platforms during packaging and selected at runtime.
- NSIS installer displays the full GNU AGPL v3 license page.
