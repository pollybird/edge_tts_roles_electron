# Upgrade Log

## v2.0.2

### New Features

- **Arabic (ar-SA) translation** with full RTL layout support.
- **Traditional Chinese (zh-TW) translation** (Taiwan terminology).
- **Runtime language switcher**: a language dropdown in the editor header supports instant switching across 9 languages. The app follows the system language on startup; switching only affects the current session.
- **Auto-update**: the app checks for updates 5 seconds after launch, with a manual trigger under **Help → Check for Updates**. The primary feed is GitHub Releases; if GitHub is unreachable, it falls back to the `latest*.yml` files hosted on GitCode.

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
