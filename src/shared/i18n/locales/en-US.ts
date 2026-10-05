/**
 * English (base) language pack.
 *
 * This is the FALLBACK pack: every UI message key must exist here.
 * Other language packs may omit any key — it automatically falls back to English.
 * Voice/locale name tables are intentionally empty: the Edge TTS API already
 * returns English names, which are used as-is in that case.
 *
 * Mnemonic labels follow Electron/GTK notation: top-level "&File",
 * subitems "&Open Text..." (GTK strips the (&X) wrappers automatically).
 */
import type { LocalePack } from '../types'

const enUS: LocalePack = {
  voices: {
    voiceNames: {},
    localeNames: {},
    gender: { female: 'Female', male: 'Male' },
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Edge-TTS Multi-Voice Audio Generator',
      copyright: '© 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.'
    },

    menu: {
      file: '&File',
      edit: '&Edit',
      help: '&Help',
      openText: '&Open Text...',
      saveText: '&Save Text',
      openConfig: 'Open &Config...',
      saveConfig: 'Sav&e Config',
      quit: 'E&xit',
      undo: '&Undo',
      redo: '&Redo',
      cut: 'Cu&t',
      copy: '&Copy',
      paste: '&Paste',
      find: '&Find...',
      replace: '&Replace...',
      helpItem: '&Help',
      agreement: 'User &Agreement',
      checkUpdate: 'Check for &Updates',
      website: '&Website',
      about: '&About'
    },

    editor: {
      header:
        'Text editor (use [A][B][C][D] to switch voices, [number] for pauses, [R] for a beep)',
      open: '📂 Open',
      findPlaceholder: 'Find',
      matchCase: 'Match case',
      prevMatch: 'Previous',
      nextMatch: 'Next',
      replacePlaceholder: 'Replace with',
      replace: 'Replace',
      replaceAll: 'Replace All',
      closeFind: 'Close (Esc)',
      placeholder:
        'Enter the text to convert to speech..\n\nMarkers:\n' +
        '[A] [B] [C] [D] - switch speaker voice\n' +
        '[number] - pause in milliseconds (e.g. [1000] = 1 second)\n' +
        '[R] - insert a beep\n\n' +
        'Example:\n' +
        '[A]Hello, I am voice A. [B]And I am voice B. [1000][C]After a 1-second pause, voice C. [R]',
      insertRole: '👤 Insert {tag}',
      insertPause: '⏱️ Insert Pause',
      pauseMs: 'Time (ms):',
      insertBeep: '🔊 Insert Beep [R]',
      quickPause: 'Quick pause:',
      secondsShort: '{n}s',
      openText: '📂 Open Text',
      saveText: '💾 Save Text',
      textSaved: 'Text saved',
      preview: 'Preview:',
      previewSelection: '🎧 Preview Selection',
      previewAll: '🔊 Preview All Text',
      charCount: '{n} characters'
    },

    roles: {
      title: 'Voice Settings',
      saveConfig: 'Save Config',
      loadConfig: 'Load Config',
      saveConfigTip: 'Save current voice / rate / volume / pitch to a config file',
      loadConfigTip: 'Load voice / rate / volume / pitch from a config file',
      roleLabel: 'Role {id}',
      voice: 'Voice',
      unselected: '(none selected)',
      groupLabel: '--- {label} ({n}) ---',
      rate: 'Rate {n}%',
      volume: 'Volume {n}%',
      pitch: 'Pitch {n} Hz'
    },

    extras: {
      title: 'Audio Extras',
      intro: 'Intro',
      outro: 'Outro',
      bgm: 'Background Music',
      choose: 'Choose File...',
      clear: 'Clear',
      noFile: 'Not selected',
      volume: 'Volume {n}%',
      bgmHint: 'Background music loops during narration'
    },

    output: {
      chooseFile: '💾 Output File...',
      noPath: 'No output file selected',
      format: 'Format:',
      generate: '🎵 Generate Audio',
      stop: '⏹️ Stop'
    },

    preview: {
      title: 'Audio Preview',
      loading: 'Loading audio...',
      ready: 'Ready to play',
      readyClickHint: 'Ready (click ▶️ to play)',
      playing: 'Playing...',
      paused: 'Paused',
      ended: 'Playback finished',
      stopped: 'Stopped',
      loadFailed: 'Failed to load audio',
      progress: 'Seek:',
      play: '▶️ Play',
      pause: '⏸️ Pause',
      stop: '⏹️ Stop',
      volume: 'Volume:',
      close: '❌ Close'
    },

    message: {
      ready: 'Ready',
      inputText: 'Please enter some text!',
      selectOutput: 'Please choose an output file path!',
      generating: 'Generating audio...',
      generatingPreview: 'Generating preview audio...',
      selectForPreview: 'Please select the text to preview first!',
      previewReady: 'Preview audio is ready!',
      audioGenerated: 'Audio generated! {path}',
      errorPrefix: 'Error: {msg}',
      configSaved: 'Config saved: {path}',
      configLoaded: 'Voice settings loaded!',
      textEmpty: 'Text is empty, nothing to save.',
      textSaved: 'Text saved: {path}',
      opened: 'Opened: {path}'
    },

    update: {
      checking: 'Checking for updates...',
      available: 'New version {version} is available, downloading...',
      notAvailable: 'You are already using the latest version.',
      downloadProgress: 'Downloading update... {percent}%',
      downloaded: 'Version {version} downloaded. Restart to install?',
      install: 'Restart & Install',
      later: 'Later',
      checkFailed: 'Failed to check for updates.'
    },

    tts: {
      parsing: 'Parsing text...',
      parsingPreview: 'Parsing preview text...',
      noValidText: 'No valid text found',
      roleNoVoice: 'Role {role} has no voice selected',
      cooldown: 'Cooling down after network recovery, continuing in {sec}s...',
      generatingRole: 'Generating voice for role {role} ({index}/{total})...',
      retrying: 'Network interrupted for role {role} ({reason}), retrying {attempt}/{max}...',
      cacheHit: 'Role {role} loaded from local cache ({index}/{total})',
      pauseAdded: 'Pause added: {ms}ms',
      beepAdded: 'Beep added',
      noAudio: 'No audio was generated',
      noSegments: 'No audio segments to concatenate',
      merging: 'Merging audio segments...',
      mixingExtras: 'Mixing intro / background music / outro...',
      extrasLoadFailed: 'Failed to load extra audio {file}: {msg}',
      encoding: 'Encoding as {format}...',
      done: 'Audio generation complete!',
      previewDone: 'Preview audio complete!',
      failFinal:
        'A voice segment failed {max} times in a row or was incomplete ({msg}). ' +
        'The completed segments are kept in the local cache. Check your network and ' +
        'click Generate again to resume from the breakpoint.',
      streamInterrupted: 'The audio stream ended before transfer completed',
      connClosedEarly: 'Connection closed early',
      emptyAudio: 'Empty audio data',
      edge50x: 'Edge TTS server error ({msg}), audio generation aborted. Please try again later.',
      segmentFailed: 'Failed to generate voice segment: {msg}',
      unknownError: 'Unknown error'
    },

    dialog: {
      ok: 'OK',
      textFilter: 'Text files',
      audioFilter: 'Audio files',
      configDefaultName: 'voice-config.json',
      configFilter: 'Voice config',
      invalidJson: 'The config file is not valid JSON',
      noVoiceInConfig: 'No selected voice was found in the config file',
      unsupportedAudioExt: 'Unsupported audio file type: .{ext}'
    },

    help: {
      title: 'Help',
      message: 'Edge-TTS Multi-Voice Audio Generator — Help',
      body:
        '1. Markers\n' +
        '[A] [B] [C] [D]  switch speaker (assign a voice to each role on the right first)\n' +
        '[number]  insert a pause in milliseconds, e.g. [1000] = 1 second\n' +
        '[R]  insert a beep\n' +
        'Example: [A]Hello. [B]Hi! [1000][A]Continuing after one second. [R]\n\n' +
        '2. Steps\n' +
        '1. Choose a voice for each role on the right and adjust rate, volume and pitch.\n' +
        '2. Enter text with markers in the editor.\n' +
        '3. Use "Preview Selection / Preview All Text" to check the result first.\n' +
        '4. Choose an output format (WAV / MP3 / OGG / FLAC) and a save path at the bottom, ' +
        'then click "Generate Audio".\n\n' +
        '3. Reusing configs\n' +
        '"File → Save Config" stores the four voices with rate/volume/pitch as JSON; ' +
        'use "File → Open Config" to load them for other scripts.\n\n' +
        'Shortcuts: Ctrl+O Open Text, Ctrl+S Save Text, Ctrl+F Find, Ctrl+H Replace, F1 Help.'
    },

    agreement: {
      title: 'User Agreement',
      message: 'User Agreement',
      body:
        'Welcome to the Edge-TTS Multi-Voice Audio Generator ("the Software"). ' +
        'Please read this agreement before use:\n\n' +
        '1. The Software is provided for study, research and lawful personal voice production only. ' +
        'Do not use it to create anything illegal, infringing or against public policy.\n' +
        '2. Speech synthesis is provided by the online Microsoft Edge speech service; ' +
        'an internet connection is required. Service availability is not guaranteed.\n' +
        '3. The Software is provided "as is", without warranties of any kind regarding ' +
        'accuracy or fitness of the generated results. You bear all consequences of its use.\n' +
        '4. This software is released under the GNU AGPL v3 open-source license; you may freely use, modify and distribute it in accordance with that license. You may not use the software to infringe the legitimate rights of Microsoft or other service providers, nor to violate any applicable laws or regulations.\n' +
        '5. You are fully responsible for the audio content you generate, store and distribute.\n\n' +
        'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. All rights reserved.'
    },

    about: {
      title: 'About',
      message: 'Edge-TTS Multi-Voice Audio Generator',
      version: 'Version: {version}',
      tech: 'Built with Electron + Vue 3. Voices provided by Microsoft Edge TTS.',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.',
      website: 'https://www.tzzhy.cn/',
      license: 'License: GNU AGPL v3',
      opensource: 'Open-source software used:'
    }
  }
}

export default enUS
