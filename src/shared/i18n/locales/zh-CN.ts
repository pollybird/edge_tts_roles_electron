/**
 * 简体中文语言包 —— Edge TTS 音色命名空间
 *
 * Edge TTS 接口本身只返回拼音/英文人名与英文地区名，本文件提供中文译名。
 * 新增语言时：复制本文件为 locales/<locale>.ts 并翻译，
 * 然后在 i18n/index.ts 的 LOCALE_PACKS 中注册即可，无需改动任何业务代码。
 */
import type { LocalePack } from '../types'

const voiceNames: Record<string, string> = {
  // 普通话（中国大陆）
  'zh-CN-XiaoxiaoNeural': '晓晓',
  'zh-CN-XiaoyiNeural': '晓伊',
  'zh-CN-YunjianNeural': '云健',
  'zh-CN-YunxiNeural': '云希',
  'zh-CN-YunxiaNeural': '云夏',
  'zh-CN-YunyangNeural': '云扬',
  // 方言（中国大陆）
  'zh-CN-liaoning-XiaobeiNeural': '晓北（东北话）',
  'zh-CN-shaanxi-XiaoniNeural': '晓妮（陕西话）',
  // 粤语（中国香港）
  'zh-HK-HiuGaaiNeural': '曉佳',
  'zh-HK-HiuMaanNeural': '曉曼',
  'zh-HK-WanLungNeural': '雲龍',
  // 国语（中国台湾）
  'zh-TW-HsiaoChenNeural': '曉臻',
  'zh-TW-HsiaoYuNeural': '曉雨',
  'zh-TW-YunJheNeural': '雲哲'
}

const localeNames: Record<string, string> = {
  'af-ZA': '南非荷兰语（南非）',
  'am-ET': '阿姆哈拉语（埃塞俄比亚）',
  'ar-AE': '阿拉伯语（阿联酋）',
  'ar-BH': '阿拉伯语（巴林）',
  'ar-DZ': '阿拉伯语（阿尔及利亚）',
  'ar-EG': '阿拉伯语（埃及）',
  'ar-IQ': '阿拉伯语（伊拉克）',
  'ar-JO': '阿拉伯语（约旦）',
  'ar-KW': '阿拉伯语（科威特）',
  'ar-LB': '阿拉伯语（黎巴嫩）',
  'ar-LY': '阿拉伯语（利比亚）',
  'ar-MA': '阿拉伯语（摩洛哥）',
  'ar-OM': '阿拉伯语（阿曼）',
  'ar-QA': '阿拉伯语（卡塔尔）',
  'ar-SA': '阿拉伯语（沙特阿拉伯）',
  'ar-SY': '阿拉伯语（叙利亚）',
  'ar-TN': '阿拉伯语（突尼斯）',
  'ar-YE': '阿拉伯语（也门）',
  'az-AZ': '阿塞拜疆语（阿塞拜疆）',
  'bg-BG': '保加利亚语（保加利亚）',
  'bn-BD': '孟加拉语（孟加拉国）',
  'bn-IN': '孟加拉语（印度）',
  'bs-BA': '波斯尼亚语（波黑）',
  'ca-ES': '加泰罗尼亚语（西班牙）',
  'cs-CZ': '捷克语（捷克）',
  'cy-GB': '威尔士语（英国）',
  'da-DK': '丹麦语（丹麦）',
  'de-AT': '德语（奥地利）',
  'de-CH': '德语（瑞士）',
  'de-DE': '德语（德国）',
  'el-GR': '希腊语（希腊）',
  'en-AU': '英语（澳大利亚）',
  'en-CA': '英语（加拿大）',
  'en-GB': '英语（英国）',
  'en-HK': '英语（中国香港）',
  'en-IE': '英语（爱尔兰）',
  'en-IN': '英语（印度）',
  'en-KE': '英语（肯尼亚）',
  'en-NG': '英语（尼日利亚）',
  'en-NZ': '英语（新西兰）',
  'en-PH': '英语（菲律宾）',
  'en-SG': '英语（新加坡）',
  'en-TZ': '英语（坦桑尼亚）',
  'en-US': '英语（美国）',
  'en-ZA': '英语（南非）',
  'es-AR': '西班牙语（阿根廷）',
  'es-BO': '西班牙语（玻利维亚）',
  'es-CL': '西班牙语（智利）',
  'es-CO': '西班牙语（哥伦比亚）',
  'es-CR': '西班牙语（哥斯达黎加）',
  'es-CU': '西班牙语（古巴）',
  'es-DO': '西班牙语（多米尼加）',
  'es-EC': '西班牙语（厄瓜多尔）',
  'es-ES': '西班牙语（西班牙）',
  'es-GQ': '西班牙语（赤道几内亚）',
  'es-GT': '西班牙语（危地马拉）',
  'es-HN': '西班牙语（洪都拉斯）',
  'es-MX': '西班牙语（墨西哥）',
  'es-NI': '西班牙语（尼加拉瓜）',
  'es-PA': '西班牙语（巴拿马）',
  'es-PE': '西班牙语（秘鲁）',
  'es-PR': '西班牙语（波多黎各）',
  'es-PY': '西班牙语（巴拉圭）',
  'es-SV': '西班牙语（萨尔瓦多）',
  'es-US': '西班牙语（美国）',
  'es-UY': '西班牙语（乌拉圭）',
  'es-VE': '西班牙语（委内瑞拉）',
  'et-EE': '爱沙尼亚语（爱沙尼亚）',
  'fa-IR': '波斯语（伊朗）',
  'fi-FI': '芬兰语（芬兰）',
  'fil-PH': '菲律宾语（菲律宾）',
  'fr-BE': '法语（比利时）',
  'fr-CA': '法语（加拿大）',
  'fr-CH': '法语（瑞士）',
  'fr-FR': '法语（法国）',
  'ga-IE': '爱尔兰语（爱尔兰）',
  'gl-ES': '加利西亚语（西班牙）',
  'gu-IN': '古吉拉特语（印度）',
  'he-IL': '希伯来语（以色列）',
  'hi-IN': '印地语（印度）',
  'hr-HR': '克罗地亚语（克罗地亚）',
  'hu-HU': '匈牙利语（匈牙利）',
  'id-ID': '印度尼西亚语（印度尼西亚）',
  'is-IS': '冰岛语（冰岛）',
  'it-IT': '意大利语（意大利）',
  'iu-Cans-CA': '因纽特语（加拿大，音节文字）',
  'iu-Latn-CA': '因纽特语（加拿大，拉丁文字）',
  'ja-JP': '日语（日本）',
  'jv-ID': '爪哇语（印度尼西亚）',
  'ka-GE': '格鲁吉亚语（格鲁吉亚）',
  'kk-KZ': '哈萨克语（哈萨克斯坦）',
  'km-KH': '高棉语（柬埔寨）',
  'kn-IN': '卡纳达语（印度）',
  'ko-KR': '韩语（韩国）',
  'lo-LA': '老挝语（老挝）',
  'lt-LT': '立陶宛语（立陶宛）',
  'lv-LV': '拉脱维亚语（拉脱维亚）',
  'mk-MK': '马其顿语（北马其顿）',
  'ml-IN': '马拉雅拉姆语（印度）',
  'mn-MN': '蒙古语（蒙古）',
  'mr-IN': '马拉地语（印度）',
  'ms-MY': '马来语（马来西亚）',
  'mt-MT': '马耳他语（马耳他）',
  'my-MM': '缅甸语（缅甸）',
  'nb-NO': '挪威博克马尔语（挪威）',
  'ne-NP': '尼泊尔语（尼泊尔）',
  'nl-BE': '荷兰语（比利时）',
  'nl-NL': '荷兰语（荷兰）',
  'pl-PL': '波兰语（波兰）',
  'ps-AF': '普什图语（阿富汗）',
  'pt-BR': '葡萄牙语（巴西）',
  'pt-PT': '葡萄牙语（葡萄牙）',
  'ro-RO': '罗马尼亚语（罗马尼亚）',
  'ru-RU': '俄语（俄罗斯）',
  'si-LK': '僧伽罗语（斯里兰卡）',
  'sk-SK': '斯洛伐克语（斯洛伐克）',
  'sl-SI': '斯洛文尼亚语（斯洛文尼亚）',
  'so-SO': '索马里语（索马里）',
  'sq-AL': '阿尔巴尼亚语（阿尔巴尼亚）',
  'sr-RS': '塞尔维亚语（塞尔维亚，西里尔文）',
  'su-ID': '巽他语（印度尼西亚）',
  'sv-SE': '瑞典语（瑞典）',
  'sw-KE': '斯瓦希里语（肯尼亚）',
  'sw-TZ': '斯瓦希里语（坦桑尼亚）',
  'ta-IN': '泰米尔语（印度）',
  'ta-LK': '泰米尔语（斯里兰卡）',
  'ta-MY': '泰米尔语（马来西亚）',
  'ta-SG': '泰米尔语（新加坡）',
  'te-IN': '泰卢固语（印度）',
  'th-TH': '泰语（泰国）',
  'tr-TR': '土耳其语（土耳其）',
  'uk-UA': '乌克兰语（乌克兰）',
  'ur-IN': '乌尔都语（印度）',
  'ur-PK': '乌尔都语（巴基斯坦）',
  'uz-UZ': '乌兹别克语（乌兹别克斯坦）',
  'vi-VN': '越南语（越南）',
  'zh-CN': '中文（普通话，中国大陆）',
  'zh-CN-liaoning': '中文（东北官话，中国大陆）',
  'zh-CN-shaanxi': '中文（中原官话陕西，中国大陆）',
  'zh-HK': '中文（粤语，中国香港）',
  'zh-TW': '中文（台湾普通话，中国台湾）',
  'zu-ZA': '祖鲁语（南非）'
}

const zhCN: LocalePack = {
  voices: {
    voiceNames,
    localeNames,
    gender: { female: '女', male: '男' },
    // {name} 人名，{region} 语言（国家/地区），{gender} 性别
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Edge-TTS 多角色音频生成器',
      copyright: '© 2026 泰州姜堰钟毓信息技术有限公司'
    },

    menu: {
      file: '文件(F)(&F)',
      edit: '编辑(E)(&E)',
      help: '帮助(H)(&H)',
      openText: '打开文本(&O)...',
      saveText: '保存文本(&S)',
      openConfig: '打开配置(&O)...',
      saveConfig: '保存配置(&S)',
      quit: '退出程序(&X)',
      undo: '撤销(&Z)',
      redo: '恢复(&Y)',
      cut: '剪切(&X)',
      copy: '复制(&C)',
      paste: '粘贴(&V)',
      find: '查找(&F)...',
      replace: '替换(&H)...',
      helpItem: '使用帮助(&H)',
      agreement: '用户协议(&U)',
      website: '官方网站(&W)',
      about: '关于(&A)'
    },

    editor: {
      header: '文本编辑区（使用[A][B][C][D]切换角色，[数字]停顿，[R]蜂鸣声）',
      open: '📂 打开',
      findPlaceholder: '查找内容',
      matchCase: '区分大小写',
      prevMatch: '上一个',
      nextMatch: '下一个',
      replacePlaceholder: '替换为',
      replace: '替换',
      replaceAll: '全部替换',
      closeFind: '关闭(Esc)',
      placeholder:
        '输入要转换为语音的文本..\n\n标记说明：\n' +
        '[A] [B] [C] [D] - 切换角色\n' +
        '[数字] - 停顿指定毫秒数（如[1000]表示1秒）\n' +
        '[R] - 添加蜂鸣声\n\n' +
        '示例：\n' +
        '[A]你好，我是角色A。[B]我是角色B。[1000][C]停顿1秒后，我是角色C。[R]',
      insertRole: '👤 插入{tag}',
      insertPause: '⏱️ 插入停顿',
      pauseMs: '时间(ms):',
      insertBeep: '🔊 插入蜂鸣[R]',
      quickPause: '快速停顿:',
      secondsShort: '{n}秒',
      openText: '📂 打开文本',
      saveText: '💾 保存文本',
      textSaved: '文本已保存',
      preview: '试听功能:',
      previewSelection: '🎧 试听选中文本',
      previewAll: '🔊 试听全部文本',
      charCount: '共 {n} 字符'
    },

    roles: {
      title: '角色语音设置',
      saveConfig: '保存配置',
      loadConfig: '加载配置',
      saveConfigTip: '将当前发音人/语速/音量/音调保存为配置文件',
      loadConfigTip: '从配置文件加载发音人/语速/音量/音调',
      roleLabel: '角色 {id}',
      voice: '语音',
      unselected: '（未选择）',
      groupLabel: '--- {label}（{n}） ---',
      rate: '语速 {n}%',
      volume: '音量 {n}%',
      pitch: '音调 {n}Hz'
    },

    extras: {
      title: '附加音频',
      intro: '前奏',
      outro: '尾声',
      bgm: '背景音乐',
      choose: '选择文件…',
      clear: '清除',
      noFile: '未选择',
      volume: '音量 {n}%',
      bgmHint: '背景音乐在语音播放期间循环'
    },

    output: {
      chooseFile: '💾 输出文件…',
      noPath: '未选择输出路径',
      format: '输出格式:',
      generate: '🎵 生成音频',
      stop: '⏹️ 停止'
    },

    preview: {
      title: '音频试听',
      loading: '正在加载音频...',
      ready: '准备播放',
      readyClickHint: '准备播放（点击 ▶️ 播放）',
      playing: '正在播放...',
      paused: '已暂停',
      ended: '播放结束',
      stopped: '已停止',
      loadFailed: '加载音频失败',
      progress: '播放进度:',
      play: '▶️ 播放',
      pause: '⏸️ 暂停',
      stop: '⏹️ 停止',
      volume: '音量:',
      close: '❌ 关闭'
    },

    message: {
      ready: '就绪',
      inputText: '请输入文本！',
      selectOutput: '请选择输出文件路径！',
      generating: '正在生成音频...',
      generatingPreview: '正在生成试听音频...',
      selectForPreview: '请先选中要试听的文本！',
      previewReady: '试听音频已生成！',
      audioGenerated: '音频已生成！{path}',
      errorPrefix: '错误: {msg}',
      configSaved: '配置已保存：{path}',
      configLoaded: '角色语音配置加载成功！',
      textEmpty: '文本为空，无需保存！',
      textSaved: '文本已保存：{path}',
      opened: '已打开：{path}'
    },

    tts: {
      parsing: '正在解析文本...',
      parsingPreview: '正在解析试听文本...',
      noValidText: '未找到有效文本',
      roleNoVoice: '角色 {role} 未选择语音',
      cooldown: '网络恢复冷却中，{sec} 秒后继续...',
      generatingRole: '正在生成角色 {role} 的语音 ({index}/{total})...',
      retrying: '角色 {role} 的语音网络中断（{reason}），正在重试 {attempt}/{max}...',
      cacheHit: '角色 {role} 的语音命中本地缓存 ({index}/{total})',
      pauseAdded: '已添加停顿: {ms}ms',
      beepAdded: '已添加蜂鸣声',
      noAudio: '没有生成任何音频',
      noSegments: '没有音频片段可拼接',
      merging: '正在合并音频片段...',
      mixingExtras: '正在合成前奏 / 背景音乐 / 尾声...',
      extrasLoadFailed: '无法读取附加音频 {file}：{msg}',
      encoding: '正在编码为 {format}...',
      done: '音频生成完成！',
      previewDone: '试听音频生成完成！',
      failFinal:
        '语音片段连续 {max} 次合成失败或内容不完整（{msg}）。' +
        '已成功的片段已保存在本地缓存，请检查网络后重新点击生成，将自动从断点继续。',
      streamInterrupted: '音频流在传输完成前中断',
      connClosedEarly: '连接提前断开',
      emptyAudio: '音频数据为空',
      edge50x: 'Edge TTS 服务器错误（{msg}），音频生成已中止。请稍后重试。',
      segmentFailed: '生成音频片段失败: {msg}',
      unknownError: '未知错误'
    },

    dialog: {
      ok: '确定',
      textFilter: '文本文件',
      audioFilter: '音频文件',
      configDefaultName: '角色语音配置.json',
      configFilter: '角色语音配置',
      invalidJson: '配置文件不是有效的 JSON',
      noVoiceInConfig: '配置文件中没有找到任何已选择的发音人',
      unsupportedAudioExt: '不支持的音频文件类型：.{ext}'
    },

    help: {
      title: '使用帮助',
      message: 'Edge-TTS 多角色音频生成器 — 使用帮助',
      body:
        '一、标记语法\n' +
        '[A] [B] [C] [D]  切换说话角色（需先在右侧为角色选择发音人）\n' +
        '[数字]  插入停顿，单位毫秒，如 [1000] 表示停顿 1 秒\n' +
        '[R]  插入蜂鸣提示音\n' +
        '示例：[A]你好。[B]你好！[1000][A]停顿一秒后继续。[R]\n\n' +
        '二、生成步骤\n' +
        '1. 在右侧为角色选择发音人，并调整语速、音量、音调；\n' +
        '2. 在编辑区输入带标记的文本；\n' +
        '3. 可先“试听选中文本 / 试听全部文本”确认效果；\n' +
        '4. 在底部选择输出格式（WAV / MP3 / OGG / FLAC）与保存路径，点击“生成音频”。\n\n' +
        '三、配置复用\n' +
        '“文件 → 保存配置”可将四个角色的发音人与语速/音量/音调保存为 JSON，\n' +
        '制作其他文稿时用“文件 → 打开配置”直接加载复用。\n\n' +
        '快捷键：Ctrl+O 打开文本，Ctrl+S 保存文本，Ctrl+F 查找，Ctrl+H 替换，F1 打开帮助。'
    },

    agreement: {
      title: '用户协议',
      message: '用户协议',
      body:
        '欢迎使用 Edge-TTS 多角色音频生成器（以下简称“本软件”），在使用前请阅读本协议：\n\n' +
        '1. 本软件仅供学习研究及个人合法的语音制作用途，请勿用于生成任何违法、' +
        '侵权或违背公序良俗的内容。\n' +
        '2. 语音合成能力由 Microsoft Edge 在线语音服务提供，使用本软件需要联网；' +
        '本软件不保证该服务的可用性与连续性。\n' +
        '3. 本软件按“现状”提供，不对生成结果的准确性、适用性作任何明示或暗示担保，' +
        '因使用本软件产生的一切后果由使用者自行承担。\n' +
        '4. 请勿对本软件进行反向工程、破解，或以任何方式损害服务提供方的合法权益。\n' +
        '5. 您对自己生成、保存与传播的音频内容负全部责任。\n\n' +
        'Copyright © 2026 泰州姜堰钟毓信息技术有限公司 保留所有权利。'
    },

    about: {
      title: '关于',
      message: 'Edge-TTS 多角色音频生成器',
      version: '版本：{version}',
      tech: '技术：Electron + Vue 3，语音由 Microsoft Edge TTS 提供',
      copyright: 'Copyright © 2026 泰州姜堰钟毓信息技术有限公司',
      website: 'https://www.tzzhy.cn/',
      license: '许可证：GNU AGPL v3',
      opensource: '使用的开源软件：'
    }
  }
}

export default zhCN
