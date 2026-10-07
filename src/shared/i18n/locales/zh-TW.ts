/**
 * 繁體中文（台灣）語言包 —— Edge TTS 音色命名空間
 *
 * 用語習慣以台灣繁體中文為主（如「檔案」「設定」「音訊」「軟體」等），
 * 地區名稱部分統一使用繁體書寫。
 */
import type { LocalePack } from '../types'

const voiceNames: Record<string, string> = {
  // 普通話（中國大陸）
  'zh-CN-XiaoxiaoNeural': '曉曉',
  'zh-CN-XiaoyiNeural': '曉伊',
  'zh-CN-YunjianNeural': '雲健',
  'zh-CN-YunxiNeural': '雲希',
  'zh-CN-YunxiaNeural': '雲夏',
  'zh-CN-YunyangNeural': '雲揚',
  // 方言（中國大陸）
  'zh-CN-liaoning-XiaobeiNeural': '曉北（東北話）',
  'zh-CN-shaanxi-XiaoniNeural': '曉妮（陝西話）',
  // 粵語（中國香港）
  'zh-HK-HiuGaaiNeural': '曉佳',
  'zh-HK-HiuMaanNeural': '曉曼',
  'zh-HK-WanLungNeural': '雲龍',
  // 國語（中國台灣）
  'zh-TW-HsiaoChenNeural': '曉臻',
  'zh-TW-HsiaoYuNeural': '曉雨',
  'zh-TW-YunJheNeural': '雲哲'
}

const localeNames: Record<string, string> = {
  'af-ZA': '南非荷蘭語（南非）',
  'am-ET': '阿姆哈拉語（衣索比亞）',
  'ar-AE': '阿拉伯語（阿拉伯聯合大公國）',
  'ar-BH': '阿拉伯語（巴林）',
  'ar-DZ': '阿拉伯語（阿爾及利亞）',
  'ar-EG': '阿拉伯語（埃及）',
  'ar-IQ': '阿拉伯語（伊拉克）',
  'ar-JO': '阿拉伯語（約旦）',
  'ar-KW': '阿拉伯語（科威特）',
  'ar-LB': '阿拉伯語（黎巴嫩）',
  'ar-LY': '阿拉伯語（利比亞）',
  'ar-MA': '阿拉伯語（摩洛哥）',
  'ar-OM': '阿拉伯語（阿曼）',
  'ar-QA': '阿拉伯語（卡達）',
  'ar-SA': '阿拉伯語（沙烏地阿拉伯）',
  'ar-SY': '阿拉伯語（敘利亞）',
  'ar-TN': '阿拉伯語（突尼西亞）',
  'ar-YE': '阿拉伯語（葉門）',
  'az-AZ': '亞塞拜然語（亞塞拜然）',
  'bg-BG': '保加利亞語（保加利亞）',
  'bn-BD': '孟加拉語（孟加拉國）',
  'bn-IN': '孟加拉語（印度）',
  'bs-BA': '波士尼亞語（波士尼亞與赫塞哥維納）',
  'ca-ES': '加泰隆尼亞語（西班牙）',
  'cs-CZ': '捷克語（捷克）',
  'cy-GB': '威爾斯語（英國）',
  'da-DK': '丹麥語（丹麥）',
  'de-AT': '德語（奧地利）',
  'de-CH': '德語（瑞士）',
  'de-DE': '德語（德國）',
  'el-GR': '希臘語（希臘）',
  'en-AU': '英語（澳洲）',
  'en-CA': '英語（加拿大）',
  'en-GB': '英語（英國）',
  'en-HK': '英語（中國香港）',
  'en-IE': '英語（愛爾蘭）',
  'en-IN': '英語（印度）',
  'en-KE': '英語（肯亞）',
  'en-NG': '英語（奈及利亞）',
  'en-NZ': '英語（紐西蘭）',
  'en-PH': '英語（菲律賓）',
  'en-SG': '英語（新加坡）',
  'en-TZ': '英語（坦尚尼亞）',
  'en-US': '英語（美國）',
  'en-ZA': '英語（南非）',
  'es-AR': '西班牙語（阿根廷）',
  'es-BO': '西班牙語（玻利維亞）',
  'es-CL': '西班牙語（智利）',
  'es-CO': '西班牙語（哥倫比亞）',
  'es-CR': '西班牙語（哥斯大黎加）',
  'es-CU': '西班牙語（古巴）',
  'es-DO': '西班牙語（多明尼加）',
  'es-EC': '西班牙語（厄瓜多爾）',
  'es-ES': '西班牙語（西班牙）',
  'es-GQ': '西班牙語（赤道幾內亞）',
  'es-GT': '西班牙語（瓜地馬拉）',
  'es-HN': '西班牙語（宏都拉斯）',
  'es-MX': '西班牙語（墨西哥）',
  'es-NI': '西班牙語（尼加拉瓜）',
  'es-PA': '西班牙語（巴拿馬）',
  'es-PE': '西班牙語（秘魯）',
  'es-PR': '西班牙語（波多黎各）',
  'es-PY': '西班牙語（巴拉圭）',
  'es-SV': '西班牙語（薩爾瓦多）',
  'es-US': '西班牙語（美國）',
  'es-UY': '西班牙語（烏拉圭）',
  'es-VE': '西班牙語（委內瑞拉）',
  'et-EE': '愛沙尼亞語（愛沙尼亞）',
  'fa-IR': '波斯語（伊朗）',
  'fi-FI': '芬蘭語（芬蘭）',
  'fil-PH': '菲律賓語（菲律賓）',
  'fr-BE': '法語（比利時）',
  'fr-CA': '法語（加拿大）',
  'fr-CH': '法語（瑞士）',
  'fr-FR': '法語（法國）',
  'ga-IE': '愛爾蘭語（愛爾蘭）',
  'gl-ES': '加利西亞語（西班牙）',
  'gu-IN': '古吉拉特語（印度）',
  'he-IL': '希伯來語（以色列）',
  'hi-IN': '印地語（印度）',
  'hr-HR': '克羅埃西亞語（克羅埃西亞）',
  'hu-HU': '匈牙利語（匈牙利）',
  'id-ID': '印尼語（印尼）',
  'is-IS': '冰島語（冰島）',
  'it-IT': '義大利語（義大利）',
  'iu-Cans-CA': '因紐特語（加拿大，音節文字）',
  'iu-Latn-CA': '因紐特語（加拿大，拉丁文字）',
  'ja-JP': '日語（日本）',
  'jv-ID': '爪哇語（印尼）',
  'ka-GE': '喬治亞語（喬治亞）',
  'kk-KZ': '哈薩克語（哈薩克）',
  'km-KH': '高棉語（柬埔寨）',
  'kn-IN': '卡納達語（印度）',
  'ko-KR': '韓語（韓國）',
  'lo-LA': '寮語（寮國）',
  'lt-LT': '立陶宛語（立陶宛）',
  'lv-LV': '拉脫維亞語（拉脫維亞）',
  'mk-MK': '馬其頓語（北馬其頓）',
  'ml-IN': '馬拉雅拉姆語（印度）',
  'mn-MN': '蒙古語（蒙古）',
  'mr-IN': '馬拉地語（印度）',
  'ms-MY': '馬來語（馬來西亞）',
  'mt-MT': '馬爾他語（馬爾他）',
  'my-MM': '緬甸語（緬甸）',
  'nb-NO': '挪威博克馬爾語（挪威）',
  'ne-NP': '尼泊爾語（尼泊爾）',
  'nl-BE': '荷蘭語（比利時）',
  'nl-NL': '荷蘭語（荷蘭）',
  'pl-PL': '波蘭語（波蘭）',
  'ps-AF': '普什圖語（阿富汗）',
  'pt-BR': '葡萄牙語（巴西）',
  'pt-PT': '葡萄牙語（葡萄牙）',
  'ro-RO': '羅馬尼亞語（羅馬尼亞）',
  'ru-RU': '俄語（俄羅斯）',
  'si-LK': '僧伽羅語（斯里蘭卡）',
  'sk-SK': '斯洛伐克語（斯洛伐克）',
  'sl-SI': '斯洛維尼亞語（斯洛維尼亞）',
  'so-SO': '索馬利語（索馬利亞）',
  'sq-AL': '阿爾巴尼亞語（阿爾巴尼亞）',
  'sr-RS': '塞爾維亞語（塞爾維亞，西利爾文）',
  'su-ID': '巽他語（印尼）',
  'sv-SE': '瑞典語（瑞典）',
  'sw-KE': '斯瓦希里語（肯亞）',
  'sw-TZ': '斯瓦希里語（坦尚尼亞）',
  'ta-IN': '坦米爾語（印度）',
  'ta-LK': '坦米爾語（斯里蘭卡）',
  'ta-MY': '坦米爾語（馬來西亞）',
  'ta-SG': '坦米爾語（新加坡）',
  'te-IN': '泰盧固語（印度）',
  'th-TH': '泰語（泰國）',
  'tr-TR': '土耳其語（土耳其）',
  'uk-UA': '烏克蘭語（烏克蘭）',
  'ur-IN': '烏爾都語（印度）',
  'ur-PK': '烏爾都語（巴基斯坦）',
  'uz-UZ': '烏茲別克語（烏茲別克）',
  'vi-VN': '越南語（越南）',
  'zh-CN': '中文（普通話，中國大陸）',
  'zh-CN-liaoning': '中文（東北官話，中國大陸）',
  'zh-CN-shaanxi': '中文（中原官話陝西，中國大陸）',
  'zh-HK': '中文（粵語，中國香港）',
  'zh-TW': '中文（台灣國語，中國台灣）',
  'zu-ZA': '祖魯語（南非）'
}

const zhTW: LocalePack = {
  voices: {
    voiceNames,
    localeNames,
    gender: { female: '女', male: '男' },
    // {name} 人名，{region} 語言（國家/地區），{gender} 性別
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Edge-TTS 多角色音訊產生器',
      copyright: '© 2026 泰州姜堰鍾毓信息技術有限公司'
    },

    menu: {
      file: '檔案(F)(&F)',
      edit: '編輯(E)(&E)',
      language: '語言(L)(&L)',
      help: '說明(H)(&H)',
      openText: '開啟文字(&O)...',
      saveText: '儲存文字(&S)',
      openConfig: '開啟設定(&O)...',
      saveConfig: '儲存設定(&S)',
      quit: '結束(&X)',
      undo: '復原(&Z)',
      redo: '重做(&Y)',
      cut: '剪下(&X)',
      copy: '複製(&C)',
      paste: '貼上(&V)',
      find: '搜尋(&F)...',
      replace: '取代(&H)...',
      helpItem: '使用說明(&H)',
      agreement: '使用者協議(&U)',
      checkUpdate: '檢查更新(&U)',
      website: '官方網站(&W)',
      about: '關於(&A)'
    },

    editor: {
      header: '文字編輯區（使用[A][B][C][D]切換角色，[數字]停頓，[R]嗶聲）',
      open: '📂 開啟',
      findPlaceholder: '搜尋內容',
      matchCase: '區分大小寫',
      prevMatch: '上一個',
      nextMatch: '下一個',
      replacePlaceholder: '取代為',
      replace: '取代',
      replaceAll: '全部取代',
      closeFind: '關閉(Esc)',
      placeholder:
        '輸入要轉換為語音的文字..\n\n標記說明：\n' +
        '[A] [B] [C] [D] - 切換角色\n' +
        '[數字] - 停頓指定毫秒數（如[1000]表示1秒）\n' +
        '[R] - 加入嗶聲\n\n' +
        '範例：\n' +
        '[A]你好，我是角色A。[B]我是角色B。[1000][C]停頓1秒後，我是角色C。[R]',
      insertRole: '👤 插入{tag}',
      insertPause: '⏱️ 插入停頓',
      pauseMs: '時間(ms):',
      insertBeep: '🔊 插入嗶聲[R]',
      quickPause: '快速停頓:',
      secondsShort: '{n}秒',
      openText: '📂 開啟文字',
      saveText: '💾 儲存文字',
      textSaved: '文字已儲存',
      preview: '試聽功能:',
      previewSelection: '🎧 試聽選取文字',
      previewAll: '🔊 試聽全部文字',
      charCount: '共 {n} 個字元'
    },

    roles: {
      title: '角色語音設定',
      saveConfig: '儲存設定',
      loadConfig: '載入設定',
      saveConfigTip: '將目前發音人/語速/音量/音調儲存為設定檔',
      loadConfigTip: '從設定檔載入發音人/語速/音量/音調',
      roleLabel: '角色 {id}',
      voice: '語音',
      unselected: '（未選擇）',
      groupLabel: '--- {label}（{n}） ---',
      rate: '語速 {n}%',
      volume: '音量 {n}%',
      pitch: '音調 {n}Hz'
    },

    extras: {
      title: '附加音訊',
      intro: '前奏',
      outro: '尾聲',
      bgm: '背景音樂',
      choose: '選擇檔案…',
      clear: '清除',
      noFile: '未選擇',
      volume: '音量 {n}%',
      bgmHint: '背景音樂在語音播放期間循環'
    },

    output: {
      chooseFile: '💾 輸出檔案…',
      noPath: '未選擇輸出路徑',
      format: '輸出格式:',
      generate: '🎵 產生音訊',
      stop: '⏹️ 停止'
    },

    preview: {
      title: '音訊試聽',
      loading: '正在載入音訊...',
      ready: '準備播放',
      readyClickHint: '準備播放（點擊 ▶️ 播放）',
      playing: '正在播放...',
      paused: '已暫停',
      ended: '播放結束',
      stopped: '已停止',
      loadFailed: '載入音訊失敗',
      progress: '播放進度:',
      play: '▶️ 播放',
      pause: '⏸️ 暫停',
      stop: '⏹️ 停止',
      volume: '音量:',
      close: '❌ 關閉'
    },

    message: {
      ready: '就緒',
      inputText: '請輸入文字！',
      selectOutput: '請選擇輸出檔案路徑！',
      generating: '正在產生音訊...',
      generatingPreview: '正在產生試聽音訊...',
      selectForPreview: '請先選取要試聽的文字！',
      previewReady: '試聽音訊已產生！',
      audioGenerated: '音訊已產生！{path}',
      subtitleSaved: '字幕已儲存：{path}',
      stopped: '已停止產生。',
      errorPrefix: '錯誤: {msg}',
      configSaved: '設定已儲存：{path}',
      configLoaded: '角色語音設定載入成功！',
      textEmpty: '文字為空，無需儲存！',
      textSaved: '文字已儲存：{path}',
      opened: '已開啟：{path}'
    },

    update: {
      checking: '正在檢查更新...',
      available: '發現新版本 {version}，正在下載...',
      notAvailable: '目前已是最新版本。',
      downloadProgress: '正在下載更新... {percent}%',
      downloaded: '新版本 {version} 已下載，是否立即重啟安裝？',
      install: '重啟並安裝',
      later: '稍後',
      checkFailed: '檢查更新失敗。',
      dialogTitle: '更新提示',
      dialogBody: '發現新版本 {version}，是否立即下載安裝？',
      dialogInstall: '立即安裝',
      dialogLater: '稍後提示',
      dialogNever: '不再提示'
    },
    subtitle: {
      label: '字幕',
      none: '不產生',
      lrc: 'LRC',
      srt: 'SRT'
    },

    tts: {
      parsing: '正在解析文字...',
      parsingPreview: '正在解析試聽文字...',
      noValidText: '未找到有效文字',
      roleNoVoice: '角色 {role} 未選擇語音',
      cooldown: '網路恢復冷卻中，{sec} 秒後繼續...',
      generatingRole: '正在產生角色 {role} 的語音 ({index}/{total})...',
      retrying: '角色 {role} 的語音網路中斷（{reason}），正在重試 {attempt}/{max}...',
      cacheHit: '角色 {role} 的語音命中本機快取 ({index}/{total})',
      pauseAdded: '已加入停頓: {ms}ms',
      beepAdded: '已加入嗶聲',
      noAudio: '沒有產生任何音訊',
      noSegments: '沒有音訊片段可拼接',
      merging: '正在合併音訊片段...',
      mixingExtras: '正在合成前奏 / 背景音樂 / 尾聲...',
      extrasLoadFailed: '無法讀取附加音訊 {file}：{msg}',
      encoding: '正在編碼為 {format}...',
      done: '音訊產生完成！',
      previewDone: '試聽音訊產生完成！',
      failFinal:
        '語音片段連續 {max} 次合成失敗或內容不完整（{msg}）。' +
        '已成功的片段已保存在本機快取，請檢查網路後重新點擊產生，將自動從斷點繼續。',
      streamInterrupted: '音訊串流在傳輸完成前中斷',
      connClosedEarly: '連線提前中斷',
      audioTruncated: '音訊不完整（伺服器提前收尾）',
      emptyAudio: '音訊資料為空',
      edge50x: 'Edge TTS 伺服器錯誤（{msg}），音訊產生已中止。請稍後重試。',
      segmentFailed: '產生音訊片段失敗: {msg}',
      unknownError: '未知錯誤'
    },

    dialog: {
      ok: '確定',
      textFilter: '文字檔',
      audioFilter: '音訊檔',
      configDefaultName: '角色語音設定.json',
      configFilter: '角色語音設定',
      invalidJson: '設定檔不是有效的 JSON',
      noVoiceInConfig: '設定檔中沒有找到任何已選擇的發音人',
      unsupportedAudioExt: '不支援的音訊檔案類型：.{ext}'
    },

    help: {
      title: '使用說明',
      message: 'Edge-TTS 多角色音訊產生器 — 使用說明',
      body:
        '一、標記語法\n' +
        '[A] [B] [C] [D]  切換說話角色（需先在右側為角色選擇發音人）\n' +
        '[數字]  插入停頓，單位毫秒，如 [1000] 表示停頓 1 秒\n' +
        '[R]  插入嗶聲提示音\n' +
        '範例：[A]你好。[B]你好！[1000][A]停頓一秒後繼續。[R]\n\n' +
        '二、產生步驟\n' +
        '1. 在右側為角色選擇發音人，並調整語速、音量、音調；\n' +
        '2. 在編輯區輸入帶標記的文字；\n' +
        '3. 可先「試聽選取文字 / 試聽全部文字」確認效果；\n' +
        '4. 在底部選擇輸出格式（WAV / MP3 / OGG / FLAC）與儲存路徑，點擊「產生音訊」。\n\n' +
        '三、設定複用\n' +
        '「檔案 → 儲存設定」可將四個角色的發音人與語速/音量/音調儲存為 JSON，\n' +
        '製作其他文稿時用「檔案 → 開啟設定」直接載入複用。\n\n' +
        '快速鍵：Ctrl+O 開啟文字，Ctrl+S 儲存文字，Ctrl+F 搜尋，Ctrl+H 取代，F1 開啟說明。'
    },

    agreement: {
      title: '使用者協議',
      message: '使用者協議',
      body:
        '歡迎使用 Edge-TTS 多角色音訊產生器（以下簡稱「本軟體」），在使用前請閱讀本協議：\n\n' +
        '1. 本軟體僅供學習研究及個人合法的語音製作用途，請勿用於產生任何違法、' +
        '侵權或違背公序良俗的內容。\n' +
        '2. 語音合成能力由 Microsoft Edge 線上語音服務提供，使用本軟體需要連網；' +
        '本軟體不保證該服務的可用性與連續性。\n' +
        '3. 本軟體按「現狀」提供，不對產生結果的準確性、適用性作任何明示或默示擔保，' +
        '因使用本軟體產生的一切後果由使用者自行承擔。\n' +
        '4. 本軟體基於 GNU AGPL v3 開放原始碼授權條款發布，您可在遵守該條款的前提下自由使用、修改與散布；請勿利用本軟體侵害微軟或其他服務提供方的合法權益，或從事任何違反法令規章的行為。\n' +
        '5. 您對自己產生、儲存與傳播的音訊內容負全部責任。\n\n' +
        'Copyright © 2026 泰州姜堰鍾毓信息技術有限公司 保留所有權利。',
      accept: '我已閱讀並同意使用者協議',
      decline: '不同意並退出',
      doNotShowAgain: '下次不再彈出'
    },

    about: {
      title: '關於',
      message: 'Edge-TTS 多角色音訊產生器',
      version: '版本：{version}',
      tech: '技術：Electron + Vue 3，語音由 Microsoft Edge TTS 提供',
      copyright: 'Copyright © 2026 泰州姜堰鍾毓信息技術有限公司',
      website: 'https://www.tzzhy.cn/',
      license: '授權條款：GNU AGPL v3',
      opensource: '使用的開放原始碼軟體：'
    }
  }
}

export default zhTW
