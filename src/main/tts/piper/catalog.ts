/**
 * Piper 官方语音模型目录（多语言）。
 *
 * 数据来源：rhasspy/piper-voices 仓库 voices.json（main 分支，2026-10 快照），
 * 每个语言族精选一个模型（优先 medium 质量；zh/en/de 为人工指定旗舰声）。
 * langName 为语言原生名（endonym）、voiceName 为模型原生名——二者均为
 * 官方目录中的专有数据，与界面语言无关，故不进 i18n 语言包（Edge 语音
 * 目录的本地化约束不适用于此：官方未提供 53 种语言的本地化名）。
 */
export interface PiperVoiceDef {
  /** 模型 ID，如 zh_CN-huayan-medium */
  id: string
  /** HF 仓库内相对路径（不带 .onnx / .onnx.json 后缀） */
  path: string
  /** 模型大约体积（MB，用于 UI 展示与下载下限校验） */
  sizeMB: number
  /** 质量档位（x_low / low / medium / high） */
  quality: string
  /** 模型原生名（voices.json 的 name 字段，如 huayan） */
  voiceName: string
  /** 语言原生名（voices.json 的 language.name_native，如 简体中文） */
  langName: string
  /** 匹配的 Edge 音色语言前缀（zh-CN / en-US 等） */
  edgePrefixes: string[]
}

export const PIPER_VOICES: PiperVoiceDef[] = [
  {
    id: 'ar_JO-kareem-medium',
    path: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'kareem',
    langName: 'العربية',
    edgePrefixes: ['ar-SA', 'ar-EG', 'ar']
  },
  {
    id: 'bg_BG-dimitar-medium',
    path: 'bg/bg_BG/dimitar/medium/bg_BG-dimitar-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'dimitar',
    langName: 'български',
    edgePrefixes: ['bg-BG', 'bg']
  },
  {
    id: 'bn_BD-google-medium',
    path: 'bn/bn_BD/google/medium/bn_BD-google-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'google',
    langName: 'বাংলা',
    edgePrefixes: ['bn-BD', 'bn']
  },
  {
    id: 'ca_ES-upc_ona-medium',
    path: 'ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'upc_ona',
    langName: 'Català',
    edgePrefixes: ['ca-ES', 'ca']
  },
  {
    id: 'cs_CZ-jirka-medium',
    path: 'cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'jirka',
    langName: 'Čeština',
    edgePrefixes: ['cs-CZ', 'cs']
  },
  {
    id: 'cy_GB-bu_tts-medium',
    path: 'cy/cy_GB/bu_tts/medium/cy_GB-bu_tts-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'bu_tts',
    langName: 'Cymraeg',
    edgePrefixes: ['cy-GB', 'cy']
  },
  {
    id: 'da_DK-talesyntese-medium',
    path: 'da/da_DK/talesyntese/medium/da_DK-talesyntese-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'talesyntese',
    langName: 'Dansk',
    edgePrefixes: ['da-DK', 'da']
  },
  {
    id: 'de_DE-thorsten-medium',
    path: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'thorsten',
    langName: 'Deutsch',
    edgePrefixes: ['de-DE', 'de-AT', 'de-CH', 'de']
  },
  {
    id: 'el_GR-joy-medium',
    path: 'el/el_GR/joy/medium/el_GR-joy-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'joy',
    langName: 'Ελληνικά',
    edgePrefixes: ['el-GR', 'el']
  },
  {
    id: 'en_US-lessac-medium',
    path: 'en/en_US/lessac/medium/en_US-lessac-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'lessac',
    langName: 'English',
    edgePrefixes: ['en-US', 'en-GB', 'en-AU', 'en']
  },
  {
    id: 'es_ES-davefx-medium',
    path: 'es/es_ES/davefx/medium/es_ES-davefx-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'davefx',
    langName: 'Español',
    edgePrefixes: ['es-ES', 'es-MX', 'es-AR', 'es']
  },
  {
    id: 'et_EE-news-medium',
    path: 'et/et_EE/news/medium/et_EE-news-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'news',
    langName: 'eesti',
    edgePrefixes: ['et-EE', 'et']
  },
  {
    id: 'eu_ES-antton-medium',
    path: 'eu/eu_ES/antton/medium/eu_ES-antton-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'antton',
    langName: 'Euskara',
    edgePrefixes: ['eu-ES', 'eu']
  },
  {
    id: 'fa_IR-amir-medium',
    path: 'fa/fa_IR/amir/medium/fa_IR-amir-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'amir',
    langName: 'فارسی',
    edgePrefixes: ['fa-IR', 'fa']
  },
  {
    id: 'fi_FI-harri-medium',
    path: 'fi/fi_FI/harri/medium/fi_FI-harri-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'harri',
    langName: 'Suomi',
    edgePrefixes: ['fi-FI', 'fi']
  },
  {
    id: 'fr_FR-mls-medium',
    path: 'fr/fr_FR/mls/medium/fr_FR-mls-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'mls',
    langName: 'Français',
    edgePrefixes: ['fr-FR', 'fr-CA', 'fr']
  },
  {
    id: 'he_IL-saspeech-medium',
    path: 'he/he_IL/saspeech/medium/he_IL-saspeech-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'saspeech',
    langName: 'עִבְרִית‎',
    edgePrefixes: ['he-IL', 'he']
  },
  {
    id: 'hi_IN-pratham-medium',
    path: 'hi/hi_IN/pratham/medium/hi_IN-pratham-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'pratham',
    langName: 'हिन्दी',
    edgePrefixes: ['hi-IN', 'hi']
  },
  {
    id: 'hu_HU-anna-medium',
    path: 'hu/hu_HU/anna/medium/hu_HU-anna-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'anna',
    langName: 'Magyar',
    edgePrefixes: ['hu-HU', 'hu']
  },
  {
    id: 'hy_AM-gor-medium',
    path: 'hy/hy_AM/gor/medium/hy_AM-gor-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'gor',
    langName: 'հայերեն',
    edgePrefixes: ['hy-AM', 'hy']
  },
  {
    id: 'id_ID-news_tts-medium',
    path: 'id/id_ID/news_tts/medium/id_ID-news_tts-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'news_tts',
    langName: 'Bahasa Indonesia',
    edgePrefixes: ['id-ID', 'id']
  },
  {
    id: 'is_IS-bui-medium',
    path: 'is/is_IS/bui/medium/is_IS-bui-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'bui',
    langName: 'íslenska',
    edgePrefixes: ['is-IS', 'is']
  },
  {
    id: 'it_IT-paola-medium',
    path: 'it/it_IT/paola/medium/it_IT-paola-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'paola',
    langName: 'Italiano',
    edgePrefixes: ['it-IT', 'it']
  },
  {
    id: 'ja_JP-hi_fi_captain-medium',
    path: 'ja/ja_JP/hi_fi_captain/medium/ja_JP-hi_fi_captain-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'hi_fi_captain',
    langName: '日本語',
    edgePrefixes: ['ja-JP', 'ja']
  },
  {
    id: 'ka_GE-natia-medium',
    path: 'ka/ka_GE/natia/medium/ka_GE-natia-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'natia',
    langName: 'ქართული ენა',
    edgePrefixes: ['ka-GE', 'ka']
  },
  {
    id: 'kk_KZ-issai-high',
    path: 'kk/kk_KZ/issai/high/kk_KZ-issai-high',
    sizeMB: 122,
    quality: 'high',
    voiceName: 'issai',
    langName: 'қазақша',
    edgePrefixes: ['kk-KZ', 'kk']
  },
  {
    id: 'ko_KR-kss-medium',
    path: 'ko/ko_KR/kss/medium/ko_KR-kss-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'kss',
    langName: '한국어',
    edgePrefixes: ['ko-KR', 'ko']
  },
  {
    id: 'ku_TR-berfin_renas-medium',
    path: 'ku/ku_TR/berfin_renas/medium/ku_TR-berfin_renas-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'berfin_renas',
    langName: 'Kurmancî',
    edgePrefixes: ['ku-TR', 'ku']
  },
  {
    id: 'lb_LU-marylux-medium',
    path: 'lb/lb_LU/marylux/medium/lb_LU-marylux-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'marylux',
    langName: 'Lëtzebuergesch',
    edgePrefixes: ['lb-LU', 'lb']
  },
  {
    id: 'lt_LT-reginute1-medium',
    path: 'lt/lt_LT/reginute1/medium/lt_LT-reginute1-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'reginute1',
    langName: 'Lietuvių',
    edgePrefixes: ['lt-LT', 'lt']
  },
  {
    id: 'lv_LV-aivars-medium',
    path: 'lv/lv_LV/aivars/medium/lv_LV-aivars-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'aivars',
    langName: 'Latviešu',
    edgePrefixes: ['lv-LV', 'lv']
  },
  {
    id: 'ml_IN-arjun-medium',
    path: 'ml/ml_IN/arjun/medium/ml_IN-arjun-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'arjun',
    langName: 'മലയാളം',
    edgePrefixes: ['ml-IN', 'ml']
  },
  {
    id: 'mr_IN-google-medium',
    path: 'mr/mr_IN/google/medium/mr_IN-google-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'google',
    langName: 'मराठी, 𑘦𑘨𑘰𑘙𑘲',
    edgePrefixes: ['mr-IN', 'mr']
  },
  {
    id: 'ne_NP-chitwan-medium',
    path: 'ne/ne_NP/chitwan/medium/ne_NP-chitwan-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'chitwan',
    langName: 'नेपाली',
    edgePrefixes: ['ne-NP', 'ne']
  },
  {
    id: 'nl_BE-nathalie-medium',
    path: 'nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'nathalie',
    langName: 'Nederlands',
    edgePrefixes: ['nl-BE', 'nl']
  },
  {
    id: 'no_NO-nvcc-medium',
    path: 'no/no_NO/nvcc/medium/no_NO-nvcc-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'nvcc',
    langName: 'Norsk',
    edgePrefixes: ['no-NO', 'no']
  },
  {
    id: 'pl_PL-darkman-medium',
    path: 'pl/pl_PL/darkman/medium/pl_PL-darkman-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'darkman',
    langName: 'Polski',
    edgePrefixes: ['pl-PL', 'pl']
  },
  {
    id: 'pt_BR-cadu-medium',
    path: 'pt/pt_BR/cadu/medium/pt_BR-cadu-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'cadu',
    langName: 'Português',
    edgePrefixes: ['pt-BR', 'pt-PT', 'pt']
  },
  {
    id: 'ro_RO-mihai-medium',
    path: 'ro/ro_RO/mihai/medium/ro_RO-mihai-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'mihai',
    langName: 'Română',
    edgePrefixes: ['ro-RO', 'ro']
  },
  {
    id: 'ru_RU-denis-medium',
    path: 'ru/ru_RU/denis/medium/ru_RU-denis-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'denis',
    langName: 'Русский',
    edgePrefixes: ['ru-RU', 'ru']
  },
  {
    id: 'sk_SK-lili-medium',
    path: 'sk/sk_SK/lili/medium/sk_SK-lili-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'lili',
    langName: 'Slovenčina',
    edgePrefixes: ['sk-SK', 'sk']
  },
  {
    id: 'sl_SI-artur-medium',
    path: 'sl/sl_SI/artur/medium/sl_SI-artur-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'artur',
    langName: 'Slovenščina',
    edgePrefixes: ['sl-SI', 'sl']
  },
  {
    id: 'sq_AL-edon-medium',
    path: 'sq/sq_AL/edon/medium/sq_AL-edon-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'edon',
    langName: 'shqip',
    edgePrefixes: ['sq-AL', 'sq']
  },
  {
    id: 'sr_RS-serbski_institut-medium',
    path: 'sr/sr_RS/serbski_institut/medium/sr_RS-serbski_institut-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'serbski_institut',
    langName: 'srpski',
    edgePrefixes: ['sr-RS', 'sr']
  },
  {
    id: 'sv_SE-alma-medium',
    path: 'sv/sv_SE/alma/medium/sv_SE-alma-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'alma',
    langName: 'Svenska',
    edgePrefixes: ['sv-SE', 'sv']
  },
  {
    id: 'sw_CD-lanfrica-medium',
    path: 'sw/sw_CD/lanfrica/medium/sw_CD-lanfrica-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'lanfrica',
    langName: 'Kiswahili',
    edgePrefixes: ['sw-CD', 'sw']
  },
  {
    id: 'te_IN-maya-medium',
    path: 'te/te_IN/maya/medium/te_IN-maya-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'maya',
    langName: 'తెలుగు',
    edgePrefixes: ['te-IN', 'te']
  },
  {
    id: 'th_TH-tsync2-medium',
    path: 'th/th_TH/tsync2/medium/th_TH-tsync2-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'tsync2',
    langName: 'ไทย',
    edgePrefixes: ['th-TH', 'th']
  },
  {
    id: 'tr_TR-dfki-medium',
    path: 'tr/tr_TR/dfki/medium/tr_TR-dfki-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'dfki',
    langName: 'Türkçe',
    edgePrefixes: ['tr-TR', 'tr']
  },
  {
    id: 'uk_UA-ukrainian_tts-medium',
    path: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'ukrainian_tts',
    langName: 'украї́нська мо́ва',
    edgePrefixes: ['uk-UA', 'uk']
  },
  {
    id: 'ur_PK-aegis_female-medium',
    path: 'ur/ur_PK/aegis_female/medium/ur_PK-aegis_female-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'aegis_female',
    langName: 'اردو',
    edgePrefixes: ['ur-PK', 'ur']
  },
  {
    id: 'vi_VN-vais1000-medium',
    path: 'vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'vais1000',
    langName: 'Tiếng Việt',
    edgePrefixes: ['vi-VN', 'vi']
  },
  {
    id: 'zh_CN-huayan-medium',
    path: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'huayan',
    langName: '简体中文',
    edgePrefixes: ['zh-CN', 'zh-HK', 'zh-TW', 'zh']
  }
]
