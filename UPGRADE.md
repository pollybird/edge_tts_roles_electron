# Upgrade Log

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
