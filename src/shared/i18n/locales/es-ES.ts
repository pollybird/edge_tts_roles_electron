/**
 * Paquete de idioma español (es-ES).
 *
 * Mensajes traducidos en su totalidad; voiceNames se deja vacío a propósito
 * (la API de Edge TTS ya devuelve nombres nativos: Helena, Álvaro…).
 * Los nombres de idioma/región se generan mediante ICU (Intl.DisplayNames);
 * solo se sobreescriben los dos códigos privados zh-CN-liaoning / zh-CN-shaanxi.
 *
 * Mnemónicos con el estilo Electron/GTK: «&Archivo» (GTK oculta (&X) automáticamente).
 */
import type { LocalePack } from '../types'
import { buildLocaleNames } from '../buildLocaleNames'

const esES: LocalePack = {
  voices: {
    voiceNames: {},
    localeNames: buildLocaleNames('es', {
      'zh-CN-liaoning': 'chino (mandarín del noreste, China)',
      'zh-CN-shaanxi': 'chino (mandarín de Shaanxi, China)'
    }),
    gender: { female: 'Mujer', male: 'Hombre' },
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Generador de audio multi-voz Edge-TTS',
      copyright: '© 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.'
    },

    menu: {
      file: '&Archivo',
      edit: '&Editar',
      language: '&Idioma',
      help: '&Ayuda',
      openText: '&Abrir texto...',
      saveText: 'Guardar &texto',
      openConfig: 'Abrir &configuración...',
      saveConfig: '&Guardar configuración',
      quit: '&Salir',
      undo: '&Deshacer',
      redo: '&Rehacer',
      cut: '&Cortar',
      copy: 'C&opiar',
      paste: '&Pegar',
      find: '&Buscar...',
      replace: 'R&eemplazar...',
      helpItem: 'A&yuda',
      agreement: 'Acuerdo de &usuario',
      checkUpdate: 'Buscar &actualizaciones',
      website: '&Sitio web',
      about: 'Acerca &de'
    },

    editor: {
      header:
        'Editor de texto (use [A][B][C][D] para cambiar de voz, [número] para pausas, [R] para un pitido)',
      open: '📂 Abrir',
      findPlaceholder: 'Buscar',
      matchCase: 'Distinguir mayúsculas y minúsculas',
      prevMatch: 'Anterior',
      nextMatch: 'Siguiente',
      replacePlaceholder: 'Reemplazar con',
      replace: 'Reemplazar',
      replaceAll: 'Reemplazar todo',
      closeFind: 'Cerrar (Esc)',
      placeholder:
        'Introduzca el texto que desea convertir en voz..\n\nMarcadores:\n' +
        '[A] [B] [C] [D] - cambiar la voz del locutor\n' +
        '[número] - pausa en milisegundos (p. ej. [1000] = 1 segundo)\n' +
        '[R] - insertar un pitido\n\n' +
        'Ejemplo:\n' +
        '[A]Hola, soy la voz A. [B]Y yo la voz B. [1000][C]Tras una pausa de 1 segundo, la voz C. [R]',
      insertRole: '👤 Insertar {tag}',
      insertPause: '⏱️ Insertar pausa',
      pauseMs: 'Tiempo (ms):',
      insertBeep: '🔊 Insertar pitido [R]',
      quickPause: 'Pausas rápidas:',
      secondsShort: '{n} s',
      openText: '📂 Abrir texto',
      saveText: '💾 Guardar texto',
      textSaved: 'Texto guardado',
      preview: 'Escuchar:',
      previewSelection: '🎧 Escuchar selección',
      previewAll: '🔊 Escuchar todo el texto',
      charCount: '{n} caracteres'
    },

    roles: {
      title: 'Ajustes de voces',
      saveConfig: 'Guardar config.',
      loadConfig: 'Cargar config.',
      saveConfigTip:
        'Guardar la voz / velocidad / volumen / tono actuales en un archivo de configuración',
      loadConfigTip: 'Cargar voz / velocidad / volumen / tono desde un archivo de configuración',
      roleLabel: 'Rol {id}',
      voice: 'Voz',
      unselected: '(ninguna seleccionada)',
      groupLabel: '--- {label} ({n}) ---',
      rate: 'Velocidad {n} %',
      volume: 'Volumen {n} %',
      pitch: 'Tono {n} Hz'
    },

    extras: {
      title: 'Pistas de audio adicionales',
      intro: 'Introducción',
      outro: 'Cierre',
      bgm: 'Música de fondo',
      choose: 'Elegir archivo…',
      clear: 'Quitar',
      noFile: 'Sin archivo',
      volume: 'Volumen {n} %',
      bgmHint: 'La música de fondo se repite durante la narración'
    },

    output: {
      chooseFile: '💾 Archivo de salida...',
      noPath: 'No se ha seleccionado ningún archivo de salida',
      format: 'Formato:',
      generate: '🎵 Generar audio',
      stop: '⏹️ Detener'
    },

    preview: {
      title: 'Vista previa de audio',
      loading: 'Cargando audio...',
      ready: 'Listo para reproducir',
      readyClickHint: 'Listo (haga clic en ▶️ para reproducir)',
      playing: 'Reproduciendo...',
      paused: 'En pausa',
      ended: 'Reproducción finalizada',
      stopped: 'Detenido',
      loadFailed: 'Error al cargar el audio',
      progress: 'Posición:',
      play: '▶️ Reproducir',
      pause: '⏸️ Pausa',
      stop: '⏹️ Detener',
      volume: 'Volumen:',
      close: '❌ Cerrar'
    },

    message: {
      ready: 'Listo',
      inputText: '¡Introduzca algún texto!',
      selectOutput: '¡Elija una ruta de archivo de salida!',
      generating: 'Generando audio...',
      generatingPreview: 'Generando audio de vista previa...',
      selectForPreview: '¡Seleccione primero el texto que desea escuchar!',
      previewReady: '¡El audio de vista previa está listo!',
      audioGenerated: '¡Audio generado! {path}',
      errorPrefix: 'Error: {msg}',
      configSaved: 'Configuración guardada: {path}',
      configLoaded: '¡Ajustes de voces cargados!',
      textEmpty: 'El texto está vacío, no hay nada que guardar.',
      textSaved: 'Texto guardado: {path}',
      opened: 'Abierto: {path}'
    },

    update: {
      checking: 'Buscando actualizaciones...',
      available: 'Nueva versión {version} disponible, descargando...',
      notAvailable: 'Ya utiliza la última versión.',
      downloadProgress: 'Descargando actualización... {percent}%',
      downloaded: 'Versión {version} descargada. ¿Reiniciar para instalar?',
      install: 'Reiniciar e instalar',
      later: 'Más tarde',
      checkFailed: 'Error al buscar actualizaciones.'
    },

    tts: {
      parsing: 'Analizando texto...',
      parsingPreview: 'Analizando texto de vista previa...',
      noValidText: 'No se encontró ningún texto válido',
      roleNoVoice: 'El rol {role} no tiene una voz seleccionada',
      cooldown: 'Espera tras la recuperación de red, continuación en {sec} s...',
      generatingRole: 'Generando la voz del rol {role} ({index}/{total})...',
      retrying: 'Red interrumpida para el rol {role} ({reason}), reintentando {attempt}/{max}...',
      cacheHit: 'Rol {role} cargado desde la caché local ({index}/{total})',
      pauseAdded: 'Pausa añadida: {ms} ms',
      beepAdded: 'Pitido añadido',
      noAudio: 'No se generó ningún audio',
      noSegments: 'No hay segmentos de audio para concatenar',
      merging: 'Combinando segmentos de audio...',
      mixingExtras: 'Mezclando introducción / música de fondo / cierre...',
      extrasLoadFailed: 'No se pudo cargar el audio adicional {file}: {msg}',
      encoding: 'Codificando como {format}...',
      done: '¡Generación de audio completada!',
      previewDone: '¡Generación del audio de vista previa completada!',
      failFinal:
        'Un segmento de voz falló {max} veces seguidas o está incompleto ({msg}). ' +
        'Los segmentos completados se conservan en la caché local. Compruebe su red y ' +
        'vuelva a hacer clic en Generar para reanudar desde el punto de interrupción.',
      streamInterrupted: 'El flujo de audio terminó antes de completarse la transferencia',
      connClosedEarly: 'Conexión cerrada antes de tiempo',
      emptyAudio: 'Datos de audio vacíos',
      edge50x:
        'Error del servidor de Edge TTS ({msg}), generación de audio cancelada. Inténtelo más tarde.',
      segmentFailed: 'Error al generar el segmento de voz: {msg}',
      unknownError: 'Error desconocido'
    },

    dialog: {
      ok: 'Aceptar',
      textFilter: 'Archivos de texto',
      audioFilter: 'Archivos de audio',
      configDefaultName: 'voice-config.json',
      configFilter: 'Configuración de voces',
      invalidJson: 'El archivo de configuración no es un JSON válido',
      noVoiceInConfig: 'No se encontró ninguna voz seleccionada en el archivo de configuración',
      unsupportedAudioExt: 'Tipo de archivo de audio no compatible: .{ext}'
    },

    help: {
      title: 'Ayuda',
      message: 'Generador de audio multi-voz Edge-TTS — Ayuda',
      body:
        '1. Marcadores\n' +
        '[A] [B] [C] [D]  cambiar de locutor (asigne primero una voz a cada rol a la derecha)\n' +
        '[número]  insertar una pausa en milisegundos, p. ej. [1000] = 1 segundo\n' +
        '[R]  insertar un pitido\n' +
        'Ejemplo: [A]Hola. [B]¡Hola! [1000][A]Continúa tras un segundo. [R]\n\n' +
        '2. Pasos\n' +
        '1. Elija una voz para cada rol a la derecha y ajuste velocidad, volumen y tono.\n' +
        '2. Introduzca el texto con marcadores en el editor.\n' +
        '3. Use «Escuchar selección / Escuchar todo el texto» para comprobar primero el resultado.\n' +
        '4. Elija abajo un formato de salida (WAV / MP3 / OGG / FLAC) y una ruta de guardado, ' +
        'y haga clic en «Generar audio».\n\n' +
        '3. Reutilización de configuraciones\n' +
        '«Archivo → Guardar config.» guarda las cuatro voces con velocidad/volumen/tono como JSON; ' +
        'use «Archivo → Abrir configuración» para cargarlas en otros guiones.\n\n' +
        'Atajos: Ctrl+O Abrir texto, Ctrl+S Guardar texto, Ctrl+F Buscar, Ctrl+H Reemplazar, F1 Ayuda.'
    },

    agreement: {
      title: 'Acuerdo de usuario',
      message: 'Acuerdo de usuario',
      body:
        'Bienvenido al Generador de audio multi-voz Edge-TTS («el Software»). ' +
        'Lea este acuerdo antes de usarlo:\n\n' +
        '1. El Software se proporciona únicamente para estudio, investigación y producción de voz personal lícita. ' +
        'No lo utilice para crear nada ilegal, infractor o contrario al orden público.\n' +
        '2. La síntesis de voz la proporciona el servicio de voz en línea de Microsoft Edge; ' +
        'se requiere conexión a Internet. No se garantiza la disponibilidad del servicio.\n' +
        '3. El Software se proporciona «tal cual», sin garantías de ningún tipo sobre ' +
        'la exactitud o idoneidad de los resultados generados. Usted asume todas las consecuencias de su uso.\n' +
        '4. Este Software se publica bajo la licencia de código abierto GNU AGPL v3; puede usarlo, modificarlo y distribuirlo libremente de conformidad con dicha licencia. No puede utilizar el Software para infringir los derechos legítimos de Microsoft u otros proveedores de servicios, ni para violar ninguna ley o normativa aplicable.\n' +
        '5. Usted es plenamente responsable del contenido de audio que genere, guarde y distribuya.\n\n' +
        'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. All rights reserved.',
      accept: 'He leído y acepto el Acuerdo de usuario',
      decline: 'No aceptar y salir',
      doNotShowAgain: 'No volver a mostrarlo la próxima vez'
    },

    about: {
      title: 'Acerca de',
      message: 'Generador de audio multi-voz Edge-TTS',
      version: 'Versión: {version}',
      tech: 'Desarrollado con Electron + Vue 3. Voces proporcionadas por Microsoft Edge TTS.',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.',
      website: 'https://www.tzzhy.cn/',
      license: 'Licencia: GNU AGPL v3',
      opensource: 'Software de código abierto utilizado:'
    }
  }
}

export default esES
