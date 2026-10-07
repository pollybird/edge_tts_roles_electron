/**
 * Paquet de langue française (fr-FR).
 *
 * Messages entièrement traduits ; les noms de voix sont volontairement vides
 * (l'API Edge TTS renvoie déjà des noms natifs : Denise, Henri…).
 * Les noms de langues/régions sont générés par ICU (Intl.DisplayNames),
 * seuls les deux codes privés zh-CN-liaoning / zh-CN-shaanxi sont surchargés.
 *
 * Mnémos : style Electron/GTK « &Fichier » (GTK masque les (&X) automatiquement).
 */
import type { LocalePack } from '../types'
import { buildLocaleNames } from '../buildLocaleNames'

const frFR: LocalePack = {
  voices: {
    voiceNames: {},
    localeNames: buildLocaleNames('fr', {
      'zh-CN-liaoning': 'chinois (mandarin du Nord-Est, Chine)',
      'zh-CN-shaanxi': 'chinois (mandarin du Shaanxi, Chine)'
    }),
    gender: { female: 'Femme', male: 'Homme' },
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Générateur audio multi-voix Edge-TTS',
      copyright: '© 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.'
    },

    menu: {
      file: '&Fichier',
      edit: '&Édition',
      language: '&Langue',
      help: '&Aide',
      openText: '&Ouvrir un texte...',
      saveText: '&Enregistrer le texte',
      openConfig: 'Ouvrir une &configuration...',
      saveConfig: 'Enregistrer la configuratio&n',
      quit: '&Quitter',
      undo: '&Annuler',
      redo: 'Réta&blir',
      cut: 'Co&uper',
      copy: '&Copier',
      paste: 'Co&ller',
      find: '&Rechercher...',
      replace: 'Rem&placer...',
      helpItem: '&Aide',
      agreement: "Conditions d'uti&lisation",
      checkUpdate: 'Rechercher des mises &à jour',
      website: '&Site web',
      about: 'À &propos'
    },

    editor: {
      header:
        'Éditeur de texte (utilisez [A][B][C][D] pour changer de voix, [nombre] pour une pause, [R] pour un bip)',
      open: '📂 Ouvrir',
      findPlaceholder: 'Rechercher',
      matchCase: 'Respecter la casse',
      prevMatch: 'Précédent',
      nextMatch: 'Suivant',
      replacePlaceholder: 'Remplacer par',
      replace: 'Remplacer',
      replaceAll: 'Tout remplacer',
      closeFind: 'Fermer (Échap)',
      placeholder:
        'Saisissez le texte à convertir en parole..\n\nMarqueurs :\n' +
        '[A] [B] [C] [D] - changer de voix\n' +
        '[nombre] - pause en millisecondes (ex. [1000] = 1 seconde)\n' +
        '[R] - insérer un bip\n\n' +
        'Exemple :\n' +
        '[A]Bonjour, je suis la voix A. [B]Et moi la voix B. [1000][C]Après une pause de 1 seconde, la voix C. [R]',
      insertRole: '👤 Insérer {tag}',
      insertPause: '⏱️ Insérer une pause',
      pauseMs: 'Durée (ms) :',
      insertBeep: '🔊 Insérer un bip [R]',
      quickPause: 'Pauses rapides :',
      secondsShort: '{n} s',
      openText: '📂 Ouvrir le texte',
      saveText: '💾 Enregistrer le texte',
      textSaved: 'Texte enregistré',
      preview: 'Aperçu :',
      previewSelection: '🎧 Aperçu de la sélection',
      previewAll: '🔊 Aperçu de tout le texte',
      charCount: '{n} caractères'
    },

    roles: {
      title: 'Réglages des voix',
      saveConfig: 'Enregistrer la config',
      loadConfig: 'Charger la config',
      saveConfigTip:
        'Enregistrer la voix / le débit / le volume / la hauteur actuels dans un fichier de configuration',
      loadConfigTip:
        'Charger la voix / le débit / le volume / la hauteur depuis un fichier de configuration',
      roleLabel: 'Rôle {id}',
      voice: 'Voix',
      unselected: '(aucune sélection)',
      groupLabel: '--- {label} ({n}) ---',
      rate: 'Débit {n} %',
      volume: 'Volume {n} %',
      pitch: 'Hauteur {n} Hz'
    },

    extras: {
      title: 'Pistes audio supplémentaires',
      intro: 'Intro',
      outro: 'Outro',
      bgm: 'Musique de fond',
      choose: 'Choisir un fichier…',
      clear: 'Retirer',
      noFile: 'Aucun fichier',
      volume: 'Volume {n} %',
      bgmHint: 'La musique de fond boucle pendant la narration'
    },

    output: {
      chooseFile: '💾 Fichier de sortie...',
      noPath: 'Aucun fichier de sortie sélectionné',
      format: 'Format :',
      generate: '🎵 Générer l’audio',
      stop: '⏹️ Arrêter'
    },

    preview: {
      title: 'Aperçu audio',
      loading: 'Chargement de l’audio...',
      ready: 'Prêt à lire',
      readyClickHint: 'Prêt (cliquez sur ▶️ pour lire)',
      playing: 'Lecture en cours...',
      paused: 'En pause',
      ended: 'Lecture terminée',
      stopped: 'Arrêté',
      loadFailed: 'Échec du chargement de l’audio',
      progress: 'Position :',
      play: '▶️ Lire',
      pause: '⏸️ Pause',
      stop: '⏹️ Arrêter',
      volume: 'Volume :',
      close: '❌ Fermer'
    },

    message: {
      ready: 'Prêt',
      inputText: 'Veuillez saisir du texte !',
      selectOutput: 'Veuillez choisir un chemin de fichier de sortie !',
      generating: 'Génération de l’audio...',
      generatingPreview: 'Génération de l’audio d’aperçu...',
      selectForPreview: 'Veuillez d’abord sélectionner le texte à écouter !',
      previewReady: 'L’audio d’aperçu est prêt !',
      audioGenerated: 'Audio généré ! {path}',
      subtitleSaved: 'Sous-titres enregistrés : {path}',
      stopped: 'Génération arrêtée.',
      errorPrefix: 'Erreur : {msg}',
      configSaved: 'Configuration enregistrée : {path}',
      configLoaded: 'Réglages des voix chargés !',
      textEmpty: 'Le texte est vide, rien à enregistrer.',
      textSaved: 'Texte enregistré : {path}',
      opened: 'Ouvert : {path}'
    },

    update: {
      checking: 'Recherche de mises à jour...',
      available: 'La nouvelle version {version} est disponible, téléchargement...',
      notAvailable: 'Vous utilisez déjà la dernière version.',
      downloadProgress: 'Téléchargement de la mise à jour... {percent}%',
      downloaded: 'La version {version} est téléchargée. Redémarrer pour installer ?',
      install: 'Redémarrer et installer',
      later: 'Plus tard',
      checkFailed: 'Échec de la recherche de mise à jour.',
      dialogTitle: 'Mise à jour disponible',
      dialogBody: 'La version {version} est disponible. La télécharger et l’installer maintenant ?',
      dialogInstall: 'Installer maintenant',
      dialogLater: 'Me le rappeler plus tard',
      dialogNever: 'Ne plus me le rappeler pour cette version'
    },
    subtitle: {
      label: 'Sous-titres',
      none: 'Aucun',
      lrc: 'LRC',
      srt: 'SRT'
    },

    tts: {
      parsing: 'Analyse du texte...',
      parsingPreview: 'Analyse du texte d’aperçu...',
      noValidText: 'Aucun texte valide trouvé',
      roleNoVoice: 'Aucune voix sélectionnée pour le rôle {role}',
      cooldown: 'Temporisation après rétablissement réseau, reprise dans {sec} s...',
      generatingRole: 'Génération de la voix du rôle {role} ({index}/{total})...',
      retrying:
        'Réseau interrompu pour le rôle {role} ({reason}), nouvelle tentative {attempt}/{max}...',
      cacheHit: 'Rôle {role} chargé depuis le cache local ({index}/{total})',
      pauseAdded: 'Pause ajoutée : {ms} ms',
      beepAdded: 'Bip ajouté',
      noAudio: 'Aucun audio n’a été généré',
      noSegments: 'Aucun segment audio à concaténer',
      merging: 'Fusion des segments audio...',
      mixingExtras: 'Mixage de l’intro / musique de fond / outro...',
      extrasLoadFailed: 'Impossible de charger la piste audio {file} : {msg}',
      encoding: 'Encodage en {format}...',
      done: 'Génération audio terminée !',
      previewDone: 'Génération de l’audio d’aperçu terminée !',
      failFinal:
        'Un segment vocal a échoué {max} fois de suite ou est incomplet ({msg}). ' +
        'Les segments terminés sont conservés dans le cache local. Vérifiez votre réseau et ' +
        'cliquez à nouveau sur Générer pour reprendre à partir du point d’arrêt.',
      streamInterrupted: 'Le flux audio s’est terminé avant la fin du transfert',
      connClosedEarly: 'Connexion fermée prématurément',
      audioTruncated: 'Audio incomplet (fin anticipée du serveur)',
      emptyAudio: 'Données audio vides',
      edge50x:
        'Erreur du serveur Edge TTS ({msg}), génération audio annulée. Veuillez réessayer plus tard.',
      segmentFailed: 'Échec de la génération du segment vocal : {msg}',
      unknownError: 'Erreur inconnue'
    },

    dialog: {
      ok: 'OK',
      textFilter: 'Fichiers texte',
      audioFilter: 'Fichiers audio',
      configDefaultName: 'voice-config.json',
      configFilter: 'Configuration des voix',
      invalidJson: 'Le fichier de configuration n’est pas un JSON valide',
      noVoiceInConfig: 'Aucune voix sélectionnée trouvée dans le fichier de configuration',
      unsupportedAudioExt: 'Type de fichier audio non pris en charge : .{ext}'
    },

    help: {
      title: 'Aide',
      message: 'Générateur audio multi-voix Edge-TTS — Aide',
      body:
        '1. Marqueurs\n' +
        '[A] [B] [C] [D]  changer d’interlocuteur (affectez d’abord une voix à chaque rôle à droite)\n' +
        '[nombre]  insérer une pause en millisecondes, ex. [1000] = 1 seconde\n' +
        '[R]  insérer un bip\n' +
        'Exemple : [A]Bonjour. [B]Salut ! [1000][A]Reprise après une seconde. [R]\n\n' +
        '2. Étapes\n' +
        '1. Choisissez une voix pour chaque rôle à droite et réglez le débit, le volume et la hauteur.\n' +
        '2. Saisissez le texte avec les marqueurs dans l’éditeur.\n' +
        '3. Utilisez « Aperçu de la sélection / Aperçu de tout le texte » pour vérifier d’abord le résultat.\n' +
        '4. Choisissez un format de sortie (WAV / MP3 / OGG / FLAC) et un chemin d’enregistrement en bas, ' +
        'puis cliquez sur « Générer l’audio ».\n\n' +
        '3. Réutilisation des configurations\n' +
        '« Fichier → Enregistrer la config » enregistre les quatre voix avec débit/volume/hauteur en JSON ; ' +
        'utilisez « Fichier → Ouvrir une configuration » pour les charger pour d’autres scripts.\n\n' +
        'Raccourcis : Ctrl+O Ouvrir le texte, Ctrl+S Enregistrer le texte, Ctrl+F Rechercher, Ctrl+H Remplacer, F1 Aide.'
    },

    agreement: {
      title: 'Conditions d’utilisation',
      message: 'Conditions d’utilisation',
      body:
        'Bienvenue dans le Générateur audio multi-voix Edge-TTS (« le Logiciel »). ' +
        'Veuillez lire cet accord avant toute utilisation :\n\n' +
        '1. Le Logiciel est fourni uniquement pour l’étude, la recherche et la production vocale personnelle licite. ' +
        'Ne l’utilisez pas pour créer un contenu illégal, contrefaisant ou contraire à l’ordre public.\n' +
        '2. La synthèse vocale est fournie par le service vocal en ligne Microsoft Edge ; ' +
        'une connexion Internet est requise. La disponibilité du service n’est pas garantie.\n' +
        '3. Le Logiciel est fourni « tel quel », sans garantie d’aucune sorte quant à ' +
        'l’exactitude ou l’adéquation des résultats générés. Vous assumez toutes les conséquences de son utilisation.\n' +
        '4. Ce Logiciel est distribué sous la licence open-source GNU AGPL v3 ; vous pouvez librement l’utiliser, le modifier et le distribuer conformément à cette licence. Vous ne pouvez pas utiliser le Logiciel pour porter atteinte aux droits légitimes de Microsoft ou d’autres fournisseurs de service, ni pour enfreindre toute loi ou réglementation applicable.\n' +
        '5. Vous êtes entièrement responsable du contenu audio que vous générez, enregistrez et diffusez.\n\n' +
        'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. All rights reserved.',
      accept: "J'ai lu et j'accepte les conditions d'utilisation",
      decline: 'Refuser et quitter',
      doNotShowAgain: 'Ne plus afficher au prochain lancement'
    },

    about: {
      title: 'À propos',
      message: 'Générateur audio multi-voix Edge-TTS',
      version: 'Version : {version}',
      tech: 'Basé sur Electron + Vue 3. Voix fournies par Microsoft Edge TTS.',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.',
      website: 'https://www.tzzhy.cn/',
      license: 'Licence : GNU AGPL v3',
      opensource: 'Logiciels open source utilisés :'
    }
  }
}

export default frFR
