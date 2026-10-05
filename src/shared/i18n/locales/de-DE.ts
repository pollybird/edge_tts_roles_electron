/**
 * Deutschsprachiges Paket (de-DE).
 *
 * Messages vollständig übersetzt; voiceNames bewusst leer
 * (die Edge-TTS-API liefert bereits native Namen: Amala, Conrad…).
 * Die Sprach-/Regionsnamen werden per ICU (Intl.DisplayNames) erzeugt,
 * nur die privaten Codes zh-CN-liaoning / zh-CN-shaanxi werden manuell überschrieben.
 *
 * Mnemonik im Electron/GTK-Stil: „&Datei“ (GTK blendet (&X) automatisch aus).
 */
import type { LocalePack } from '../types'
import { buildLocaleNames } from '../buildLocaleNames'

const deDE: LocalePack = {
  voices: {
    voiceNames: {},
    localeNames: buildLocaleNames('de', {
      'zh-CN-liaoning': 'Chinesisch (Nordost-Mandarin, China)',
      'zh-CN-shaanxi': 'Chinesisch (Shaanxi-Mandarin, China)'
    }),
    gender: { female: 'Weiblich', male: 'Männlich' },
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Edge-TTS Audio-Generator mit mehreren Stimmen',
      copyright: '© 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.'
    },

    menu: {
      file: '&Datei',
      edit: '&Bearbeiten',
      help: '&Hilfe',
      openText: '&Text öffnen...',
      saveText: 'Text &speichern',
      openConfig: 'Konfiguration &öffnen...',
      saveConfig: 'Konfiguration speicher&n',
      quit: '&Beenden',
      undo: '&Rückgängig',
      redo: '&Wiederherstellen',
      cut: '&Ausschneiden',
      copy: '&Kopieren',
      paste: '&Einfügen',
      find: '&Suchen...',
      replace: 'Erset&zen...',
      helpItem: '&Hilfe',
      agreement: '&Nutzungsvereinbarung',
      checkUpdate: 'Nach Aktualisierungen &suchen',
      website: '&Webseite',
      about: '&Über'
    },

    editor: {
      header:
        'Text-Editor (mit [A][B][C][D] Stimmen wechseln, [Zahl] für Pausen, [R] für einen Signalton)',
      open: '📂 Öffnen',
      findPlaceholder: 'Suchen',
      matchCase: 'Groß-/Kleinschreibung beachten',
      prevMatch: 'Vorheriger',
      nextMatch: 'Nächster',
      replacePlaceholder: 'Ersetzen durch',
      replace: 'Ersetzen',
      replaceAll: 'Alle ersetzen',
      closeFind: 'Schließen (Esc)',
      placeholder:
        'Text eingeben, der in Sprache umgewandelt werden soll..\n\nMarkierungen:\n' +
        '[A] [B] [C] [D] - Sprecherstimme wechseln\n' +
        '[Zahl] - Pause in Millisekunden (z. B. [1000] = 1 Sekunde)\n' +
        '[R] - Signalton einfügen\n\n' +
        'Beispiel:\n' +
        '[A]Hallo, ich bin Stimme A. [B]Und ich Stimme B. [1000][C]Nach 1 Sekunde Pause, Stimme C. [R]',
      insertRole: '👤 {tag} einfügen',
      insertPause: '⏱️ Pause einfügen',
      pauseMs: 'Zeit (ms):',
      insertBeep: '🔊 Signalton [R] einfügen',
      quickPause: 'Schnellpausen:',
      secondsShort: '{n} s',
      openText: '📂 Text öffnen',
      saveText: '💾 Text speichern',
      textSaved: 'Text gespeichert',
      preview: 'Vorschau:',
      previewSelection: '🎧 Auswahl vorhören',
      previewAll: '🔊 Gesamten Text vorhören',
      charCount: '{n} Zeichen'
    },

    roles: {
      title: 'Stimmeneinstellungen',
      saveConfig: 'Konfig. speichern',
      loadConfig: 'Konfig. laden',
      saveConfigTip:
        'Aktuelle Stimme / Tempo / Lautstärke / Tonhöhe als Konfigurationsdatei speichern',
      loadConfigTip: 'Stimme / Tempo / Lautstärke / Tonhöhe aus einer Konfigurationsdatei laden',
      roleLabel: 'Rolle {id}',
      voice: 'Stimme',
      unselected: '(nicht ausgewählt)',
      groupLabel: '--- {label} ({n}) ---',
      rate: 'Tempo {n} %',
      volume: 'Lautstärke {n} %',
      pitch: 'Tonhöhe {n} Hz'
    },

    extras: {
      title: 'Zusätzliche Audiospuren',
      intro: 'Intro',
      outro: 'Outro',
      bgm: 'Hintergrundmusik',
      choose: 'Datei wählen…',
      clear: 'Entfernen',
      noFile: 'Keine Datei',
      volume: 'Lautstärke {n} %',
      bgmHint: 'Die Hintergrundmusik wird während der Sprache wiederholt'
    },

    output: {
      chooseFile: '💾 Ausgabedatei...',
      noPath: 'Keine Ausgabedatei ausgewählt',
      format: 'Format:',
      generate: '🎵 Audio erzeugen',
      stop: '⏹️ Stopp'
    },

    preview: {
      title: 'Audio-Vorschau',
      loading: 'Audio wird geladen...',
      ready: 'Wiedergabebereit',
      readyClickHint: 'Bereit (auf ▶️ klicken zum Abspielen)',
      playing: 'Wiedergabe läuft...',
      paused: 'Pausiert',
      ended: 'Wiedergabe beendet',
      stopped: 'Gestoppt',
      loadFailed: 'Audio konnte nicht geladen werden',
      progress: 'Position:',
      play: '▶️ Abspielen',
      pause: '⏸️ Pause',
      stop: '⏹️ Stopp',
      volume: 'Lautstärke:',
      close: '❌ Schließen'
    },

    message: {
      ready: 'Bereit',
      inputText: 'Bitte Text eingeben!',
      selectOutput: 'Bitte einen Ausgabedateipfad wählen!',
      generating: 'Audio wird erzeugt...',
      generatingPreview: 'Vorschau-Audio wird erzeugt...',
      selectForPreview: 'Bitte zuerst den vorzuhörenden Text auswählen!',
      previewReady: 'Vorschau-Audio ist bereit!',
      audioGenerated: 'Audio erzeugt! {path}',
      errorPrefix: 'Fehler: {msg}',
      configSaved: 'Konfiguration gespeichert: {path}',
      configLoaded: 'Stimmeneinstellungen geladen!',
      textEmpty: 'Text ist leer, nichts zu speichern.',
      textSaved: 'Text gespeichert: {path}',
      opened: 'Geöffnet: {path}'
    },

    update: {
      checking: 'Suche nach Aktualisierungen...',
      available: 'Neue Version {version} verfügbar, wird heruntergeladen...',
      notAvailable: 'Sie verwenden bereits die neueste Version.',
      downloadProgress: 'Aktualisierung wird heruntergeladen... {percent}%',
      downloaded: 'Version {version} heruntergeladen. Jetzt neu starten zum Installieren?',
      install: 'Neu starten & installieren',
      later: 'Später',
      checkFailed: 'Suche nach Aktualisierungen fehlgeschlagen.'
    },

    tts: {
      parsing: 'Text wird analysiert...',
      parsingPreview: 'Vorschautext wird analysiert...',
      noValidText: 'Kein gültiger Text gefunden',
      roleNoVoice: 'Für Rolle {role} ist keine Stimme ausgewählt',
      cooldown: 'Abklingzeit nach Netzwerkwiederherstellung, Weiter in {sec} s...',
      generatingRole: 'Stimme für Rolle {role} wird erzeugt ({index}/{total})...',
      retrying:
        'Netzwerk für Rolle {role} unterbrochen ({reason}), erneuter Versuch {attempt}/{max}...',
      cacheHit: 'Rolle {role} aus lokalem Cache geladen ({index}/{total})',
      pauseAdded: 'Pause eingefügt: {ms} ms',
      beepAdded: 'Signalton eingefügt',
      noAudio: 'Es wurde kein Audio erzeugt',
      noSegments: 'Keine Audiosegmente zum Zusammenfügen',
      merging: 'Audiosegmente werden zusammengefügt...',
      mixingExtras: 'Intro / Hintergrundmusik / Outro wird gemischt...',
      extrasLoadFailed: 'Zusätzliche Audiodatei {file} konnte nicht geladen werden: {msg}',
      encoding: 'Wird als {format} kodiert...',
      done: 'Audioerzeugung abgeschlossen!',
      previewDone: 'Vorschau-Audioerzeugung abgeschlossen!',
      failFinal:
        'Ein Stimmensegment ist {max} Mal hintereinander fehlgeschlagen oder unvollständig ({msg}). ' +
        'Die fertigen Segmente bleiben im lokalen Cache erhalten. Prüfen Sie das Netzwerk und ' +
        'klicken Sie erneut auf Erzeugen, um ab dem Unterbrechungspunkt fortzufahren.',
      streamInterrupted: 'Der Audiostream endete vor Abschluss der Übertragung',
      connClosedEarly: 'Verbindung vorzeitig geschlossen',
      emptyAudio: 'Leere Audiodaten',
      edge50x:
        'Edge-TTS-Serverfehler ({msg}), Audioerzeugung abgebrochen. Bitte später erneut versuchen.',
      segmentFailed: 'Stimmensegment konnte nicht erzeugt werden: {msg}',
      unknownError: 'Unbekannter Fehler'
    },

    dialog: {
      ok: 'OK',
      textFilter: 'Textdateien',
      audioFilter: 'Audiodateien',
      configDefaultName: 'voice-config.json',
      configFilter: 'Stimmenkonfiguration',
      invalidJson: 'Die Konfigurationsdatei ist kein gültiges JSON',
      noVoiceInConfig: 'In der Konfigurationsdatei wurde keine ausgewählte Stimme gefunden',
      unsupportedAudioExt: 'Nicht unterstützter Audiodateityp: .{ext}'
    },

    help: {
      title: 'Hilfe',
      message: 'Edge-TTS Audio-Generator mit mehreren Stimmen — Hilfe',
      body:
        '1. Markierungen\n' +
        '[A] [B] [C] [D]  Sprecher wechseln (rechts zuerst jeder Rolle eine Stimme zuordnen)\n' +
        '[Zahl]  Pause in Millisekunden einfügen, z. B. [1000] = 1 Sekunde\n' +
        '[R]  Signalton einfügen\n' +
        'Beispiel: [A]Hallo. [B]Hi! [1000][A]Nach einer Sekunde weiter. [R]\n\n' +
        '2. Schritte\n' +
        '1. Rechts für jede Rolle eine Stimme wählen und Tempo, Lautstärke und Tonhöhe anpassen.\n' +
        '2. Text mit Markierungen in den Editor eingeben.\n' +
        '3. Mit „Auswahl vorhören / Gesamten Text vorhören“ zuerst das Ergebnis prüfen.\n' +
        '4. Unten ein Ausgabeformat (WAV / MP3 / OGG / FLAC) und einen Speicherpfad wählen, ' +
        'dann auf „Audio erzeugen“ klicken.\n\n' +
        '3. Konfigurationen wiederverwenden\n' +
        '„Datei → Konfig. speichern“ speichert die vier Stimmen mit Tempo/Lautstärke/Tonhöhe als JSON; ' +
        '„Datei → Konfiguration öffnen“ lädt sie für andere Skripte.\n\n' +
        'Tastenkürzel: Strg+O Text öffnen, Strg+S Text speichern, Strg+F Suchen, Strg+H Ersetzen, F1 Hilfe.'
    },

    agreement: {
      title: 'Nutzungsvereinbarung',
      message: 'Nutzungsvereinbarung',
      body:
        'Willkommen beim Edge-TTS Audio-Generator mit mehreren Stimmen („die Software“). ' +
        'Bitte lesen Sie diese Vereinbarung vor der Verwendung:\n\n' +
        '1. Die Software dient ausschließlich Studien-, Forschungs- und rechtmäßigen persönlichen Sprachproduktionen. ' +
        'Erstellen Sie damit keine illegalen, rechtsverletzenden oder gegen die öffentliche Ordnung verstoßenden Inhalte.\n' +
        '2. Die Sprachsynthese wird vom Online-Sprachdienst Microsoft Edge bereitgestellt; ' +
        'eine Internetverbindung ist erforderlich. Die Verfügbarkeit des Dienstes wird nicht garantiert.\n' +
        '3. Die Software wird „wie besehen“ ohne jegliche Gewährleistung hinsichtlich ' +
        'Genauigkeit oder Eignung der erzeugten Ergebnisse bereitgestellt. Sie tragen alle Folgen der Verwendung.\n' +
        '4. Diese Software wird unter der Open-Source-Lizenz GNU AGPL v3 veröffentlicht; Sie dürfen sie gemäß dieser Lizenz frei nutzen, modifizieren und weitergeben. Sie dürfen die Software nicht dazu verwenden, die berechtigten Rechte von Microsoft oder anderen Dienstanbietern zu verletzen oder geltendes Recht zu missachten.\n' +
        '5. Sie tragen die volle Verantwortung für die Audioinhalte, die Sie erzeugen, speichern und verbreiten.\n\n' +
        'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. Alle Rechte vorbehalten.'
    },

    about: {
      title: 'Über',
      message: 'Edge-TTS Audio-Generator mit mehreren Stimmen',
      version: 'Version: {version}',
      tech: 'Erstellt mit Electron + Vue 3. Stimmen von Microsoft Edge TTS.',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.',
      website: 'https://www.tzzhy.cn/',
      license: 'Lizenz: GNU AGPL v3',
      opensource: 'Verwendete Open-Source-Software:'
    }
  }
}

export default deDE
