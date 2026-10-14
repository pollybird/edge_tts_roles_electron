/**
 * Piper 官方语音模型目录（多语言）。
 *
 * 数据来源：rhasspy/piper-voices 仓库 voices.json（main 分支），
 * 由 scripts/sync-piper-catalog.mjs 自动生成——请勿手工编辑本文件，
 * 修改选择规则或 edgePrefixes 请改同步脚本后重新运行 npm run sync:piper。
 * 上游同步时间：2026-10-14。
 * 每个语言族精选一个模型（优先 medium 质量；zh/en/de 为人工指定旗舰声
 * huayan/lessac/thorsten；kk 无 medium 自动取 high 档 issai）。
 * langName 为语言原生名（endonym）、voiceName 为模型原生名——二者均为
 * 官方目录中的专有数据，与界面语言无关，故不进 i18n 语言包（Edge 语音
 * 目录的本地化约束不适用于此：官方未提供 53 种语言的本地化名）。
 */

export interface PiperVoiceDef {
  /** 模型 ID，如 zh_CN-huayan-medium */
  id: string
  /** HF 仓库内相对路径（不带 .onnx / .onnx.json 后缀） */
  path: string
  /** 模型大约体积（MB，来自 voices.json 的 size_bytes，用于 UI 展示与下载下限校验） */
  sizeMB: number
  /** 质量档位（x_low / low / medium / high） */
  quality: string
  /** 模型原生名（voices.json 的 name 字段，如 huayan） */
  voiceName: string
  /** 语言原生名（voices.json 的 language.name_native，如 简体中文） */
  langName: string
  /** 匹配的 Edge 音色语言前缀（zh-CN / en-US 等） */
  edgePrefixes: string[]
  /** .onnx 文件 MD5 摘要（来自 voices.json，用于下载完整性校验；缺省时回退体积+魔数校验） */
  md5Digest?: string
  /** 说话人数量（来自 voices.json 的 num_speakers，>1 为多说话人模型，默认合成 speaker 0） */
  numSpeakers?: number
}

export const PIPER_VOICES: PiperVoiceDef[] = [
  {
    id: 'ar_JO-kareem-medium',
    path: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'kareem',
    langName: 'العربية',
    edgePrefixes: ['ar-SA', 'ar-EG', 'ar'],
    md5Digest: 'c0697df8a7fb180079cc5ac523f91a8e'
  },
  {
    id: 'bg_BG-dimitar-medium',
    path: 'bg/bg_BG/dimitar/medium/bg_BG-dimitar-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'dimitar',
    langName: 'български',
    edgePrefixes: ['bg-BG', 'bg'],
    md5Digest: 'fc1ce62a4f04f089e22b8c3a13bde28a'
  },
  {
    id: 'bn_BD-google-medium',
    path: 'bn/bn_BD/google/medium/bn_BD-google-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'google',
    langName: 'বাংলা',
    edgePrefixes: ['bn-BD', 'bn'],
    md5Digest: '2a365b2d91bb9cb7ed62c57d9ee0ec48',
    numSpeakers: 16
  },
  {
    id: 'ca_ES-upc_ona-medium',
    path: 'ca/ca_ES/upc_ona/medium/ca_ES-upc_ona-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'upc_ona',
    langName: 'Català',
    edgePrefixes: ['ca-ES', 'ca'],
    md5Digest: '58ff3b049b6b721a4c353a551ec5ef3a'
  },
  {
    id: 'cs_CZ-jirka-medium',
    path: 'cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'jirka',
    langName: 'Čeština',
    edgePrefixes: ['cs-CZ', 'cs'],
    md5Digest: 'da2deb0a3f93226a3f9b6e40d43c46ca'
  },
  {
    id: 'cy_GB-bu_tts-medium',
    path: 'cy/cy_GB/bu_tts/medium/cy_GB-bu_tts-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'bu_tts',
    langName: 'Cymraeg',
    edgePrefixes: ['cy-GB', 'cy'],
    md5Digest: '81827b7d290b9c478be3b22e07ee028e',
    numSpeakers: 7
  },
  {
    id: 'da_DK-talesyntese-medium',
    path: 'da/da_DK/talesyntese/medium/da_DK-talesyntese-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'talesyntese',
    langName: 'Dansk',
    edgePrefixes: ['da-DK', 'da'],
    md5Digest: '9c05494a3e0c1136337581e01222395d'
  },
  {
    id: 'de_DE-thorsten-medium',
    path: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'thorsten',
    langName: 'Deutsch',
    edgePrefixes: ['de-DE', 'de-AT', 'de-CH', 'de'],
    md5Digest: 'a129b00fb3078df43c96bab6c94535c0'
  },
  {
    id: 'el_GR-joy-medium',
    path: 'el/el_GR/joy/medium/el_GR-joy-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'joy',
    langName: 'Ελληνικά',
    edgePrefixes: ['el-GR', 'el'],
    md5Digest: '080895960699531c30e70415a75a604d'
  },
  {
    id: 'en_US-lessac-medium',
    path: 'en/en_US/lessac/medium/en_US-lessac-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'lessac',
    langName: 'English',
    edgePrefixes: ['en-US', 'en-GB', 'en-AU', 'en'],
    md5Digest: '2fc642b535197b6305c7c8f92dc8b24f'
  },
  {
    id: 'es_ES-davefx-medium',
    path: 'es/es_ES/davefx/medium/es_ES-davefx-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'davefx',
    langName: 'Español',
    edgePrefixes: ['es-ES', 'es-MX', 'es-AR', 'es'],
    md5Digest: 'dc515cd4ecc5f6f72fe14a941188fc9c'
  },
  {
    id: 'et_EE-news-medium',
    path: 'et/et_EE/news/medium/et_EE-news-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'news',
    langName: 'eesti',
    edgePrefixes: ['et-EE', 'et'],
    md5Digest: '6fba6ec8d985e84435ce680ee9d3b0bc',
    numSpeakers: 4
  },
  {
    id: 'eu_ES-antton-medium',
    path: 'eu/eu_ES/antton/medium/eu_ES-antton-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'antton',
    langName: 'Euskara',
    edgePrefixes: ['eu-ES', 'eu'],
    md5Digest: '4d924421c8f4f3967e79de798209e593'
  },
  {
    id: 'fa_IR-amir-medium',
    path: 'fa/fa_IR/amir/medium/fa_IR-amir-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'amir',
    langName: 'فارسی',
    edgePrefixes: ['fa-IR', 'fa'],
    md5Digest: '7c0598c9726427869e1e86447b333539'
  },
  {
    id: 'fi_FI-harri-medium',
    path: 'fi/fi_FI/harri/medium/fi_FI-harri-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'harri',
    langName: 'Suomi',
    edgePrefixes: ['fi-FI', 'fi'],
    md5Digest: '8e96b9e765f8db3e910943520aa0f475'
  },
  {
    id: 'fr_FR-mls-medium',
    path: 'fr/fr_FR/mls/medium/fr_FR-mls-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'mls',
    langName: 'Français',
    edgePrefixes: ['fr-FR', 'fr-CA', 'fr'],
    md5Digest: '87831389d3ae92347d91e38b0c57add9',
    numSpeakers: 125
  },
  {
    id: 'he_IL-saspeech-medium',
    path: 'he/he_IL/saspeech/medium/he_IL-saspeech-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'saspeech',
    langName: 'עִבְרִית‎',
    edgePrefixes: ['he-IL', 'he'],
    md5Digest: 'ffa7fbbbbeab5fa8fb7eb00bf9a0e2a5'
  },
  {
    id: 'hi_IN-pratham-medium',
    path: 'hi/hi_IN/pratham/medium/hi_IN-pratham-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'pratham',
    langName: 'हिन्दी',
    edgePrefixes: ['hi-IN', 'hi'],
    md5Digest: 'f1e5a629a9e533a7155910530109eb86'
  },
  {
    id: 'hu_HU-anna-medium',
    path: 'hu/hu_HU/anna/medium/hu_HU-anna-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'anna',
    langName: 'Magyar',
    edgePrefixes: ['hu-HU', 'hu'],
    md5Digest: '3796f9fa28bd8d390d17828e2e2e952d'
  },
  {
    id: 'hy_AM-gor-medium',
    path: 'hy/hy_AM/gor/medium/hy_AM-gor-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'gor',
    langName: 'հայերեն',
    edgePrefixes: ['hy-AM', 'hy'],
    md5Digest: 'fd726714c656f1cad828bcf102059aa1'
  },
  {
    id: 'id_ID-news_tts-medium',
    path: 'id/id_ID/news_tts/medium/id_ID-news_tts-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'news_tts',
    langName: 'Bahasa Indonesia',
    edgePrefixes: ['id-ID', 'id'],
    md5Digest: '17de01db7ac654655436b6e509893c72'
  },
  {
    id: 'is_IS-bui-medium',
    path: 'is/is_IS/bui/medium/is_IS-bui-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'bui',
    langName: 'íslenska',
    edgePrefixes: ['is-IS', 'is'],
    md5Digest: '08332bb41a67b52a3361bd1e8e36fb10'
  },
  {
    id: 'it_IT-paola-medium',
    path: 'it/it_IT/paola/medium/it_IT-paola-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'paola',
    langName: 'Italiano',
    edgePrefixes: ['it-IT', 'it'],
    md5Digest: '3a44e73b12ca5d0c21a72e388b5847c8'
  },
  {
    id: 'ja_JP-hi_fi_captain-medium',
    path: 'ja/ja_JP/hi_fi_captain/medium/ja_JP-hi_fi_captain-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'hi_fi_captain',
    langName: '日本語',
    edgePrefixes: ['ja-JP', 'ja'],
    md5Digest: 'f9daab8970d06d7e9fc895a879854542',
    numSpeakers: 2
  },
  {
    id: 'ka_GE-natia-medium',
    path: 'ka/ka_GE/natia/medium/ka_GE-natia-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'natia',
    langName: 'ქართული ენა',
    edgePrefixes: ['ka-GE', 'ka'],
    md5Digest: '83bd40f8d176a83d3d8d605fada2a5e7'
  },
  {
    id: 'kk_KZ-issai-high',
    path: 'kk/kk_KZ/issai/high/kk_KZ-issai-high',
    sizeMB: 122,
    quality: 'high',
    voiceName: 'issai',
    langName: 'қазақша',
    edgePrefixes: ['kk-KZ', 'kk'],
    md5Digest: 'd5a97c25feb0949c187ae5f8e72753e3',
    numSpeakers: 6
  },
  {
    id: 'ko_KR-kss-medium',
    path: 'ko/ko_KR/kss/medium/ko_KR-kss-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'kss',
    langName: '한국어',
    edgePrefixes: ['ko-KR', 'ko'],
    md5Digest: 'bebbd298dffe5ee7b88f2ce41bb4e3a9'
  },
  {
    id: 'ku_TR-berfin_renas-medium',
    path: 'ku/ku_TR/berfin_renas/medium/ku_TR-berfin_renas-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'berfin_renas',
    langName: 'Kurmancî',
    edgePrefixes: ['ku-TR', 'ku'],
    md5Digest: '49f32b10c6f577b3dc3f179cac4947b5',
    numSpeakers: 2
  },
  {
    id: 'lb_LU-marylux-medium',
    path: 'lb/lb_LU/marylux/medium/lb_LU-marylux-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'marylux',
    langName: 'Lëtzebuergesch',
    edgePrefixes: ['lb-LU', 'lb'],
    md5Digest: '966856e665a46cee45cb0cd2c475f8d5'
  },
  {
    id: 'lt_LT-reginute1-medium',
    path: 'lt/lt_LT/reginute1/medium/lt_LT-reginute1-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'reginute1',
    langName: 'Lietuvių',
    edgePrefixes: ['lt-LT', 'lt'],
    md5Digest: '315dabbe13d83276cb5f921119d87dac'
  },
  {
    id: 'lv_LV-aivars-medium',
    path: 'lv/lv_LV/aivars/medium/lv_LV-aivars-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'aivars',
    langName: 'Latviešu',
    edgePrefixes: ['lv-LV', 'lv'],
    md5Digest: '5b48c6f958aea5b7e9ff34f6a10882dd'
  },
  {
    id: 'ml_IN-arjun-medium',
    path: 'ml/ml_IN/arjun/medium/ml_IN-arjun-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'arjun',
    langName: 'മലയാളം',
    edgePrefixes: ['ml-IN', 'ml'],
    md5Digest: '4f20109c108aa80f46df85ab9cda5daa'
  },
  {
    id: 'mr_IN-google-medium',
    path: 'mr/mr_IN/google/medium/mr_IN-google-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'google',
    langName: 'मराठी, 𑘦𑘨𑘰𑘙𑘲',
    edgePrefixes: ['mr-IN', 'mr'],
    md5Digest: '331957abd31bff58aaa10934cd3ac58f',
    numSpeakers: 9
  },
  {
    id: 'ne_NP-chitwan-medium',
    path: 'ne/ne_NP/chitwan/medium/ne_NP-chitwan-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'chitwan',
    langName: 'नेपाली',
    edgePrefixes: ['ne-NP', 'ne'],
    md5Digest: '74cdb5b32816c366af74b55ed7494e25'
  },
  {
    id: 'nl_BE-nathalie-medium',
    path: 'nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'nathalie',
    langName: 'Nederlands',
    edgePrefixes: ['nl-BE', 'nl'],
    md5Digest: 'ab0c38b5f66764b59ad9e3e98b1c2172'
  },
  {
    id: 'no_NO-nvcc-medium',
    path: 'no/no_NO/nvcc/medium/no_NO-nvcc-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'nvcc',
    langName: 'Norsk',
    edgePrefixes: ['no-NO', 'no'],
    md5Digest: '67e04e52b2f195e6db3ae103b58d1710',
    numSpeakers: 10
  },
  {
    id: 'pl_PL-darkman-medium',
    path: 'pl/pl_PL/darkman/medium/pl_PL-darkman-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'darkman',
    langName: 'Polski',
    edgePrefixes: ['pl-PL', 'pl'],
    md5Digest: '27bf2d71e934b112657544fd0b100a7a'
  },
  {
    id: 'pt_BR-cadu-medium',
    path: 'pt/pt_BR/cadu/medium/pt_BR-cadu-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'cadu',
    langName: 'Português',
    edgePrefixes: ['pt-BR', 'pt-PT', 'pt'],
    md5Digest: '6f3a6e23694c9088e3696a15191af2cc'
  },
  {
    id: 'ro_RO-mihai-medium',
    path: 'ro/ro_RO/mihai/medium/ro_RO-mihai-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'mihai',
    langName: 'Română',
    edgePrefixes: ['ro-RO', 'ro'],
    md5Digest: '45f4253916c93d3d05ad3fe1b07ea4f3'
  },
  {
    id: 'ru_RU-denis-medium',
    path: 'ru/ru_RU/denis/medium/ru_RU-denis-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'denis',
    langName: 'Русский',
    edgePrefixes: ['ru-RU', 'ru'],
    md5Digest: '76c2f14e521fef3ed574f97ad492728e'
  },
  {
    id: 'sk_SK-lili-medium',
    path: 'sk/sk_SK/lili/medium/sk_SK-lili-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'lili',
    langName: 'Slovenčina',
    edgePrefixes: ['sk-SK', 'sk'],
    md5Digest: '836e078518042448bda8416a8ea52984'
  },
  {
    id: 'sl_SI-artur-medium',
    path: 'sl/sl_SI/artur/medium/sl_SI-artur-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'artur',
    langName: 'Slovenščina',
    edgePrefixes: ['sl-SI', 'sl'],
    md5Digest: 'ca0aac61139e446bebf98561e8cf9407'
  },
  {
    id: 'sq_AL-edon-medium',
    path: 'sq/sq_AL/edon/medium/sq_AL-edon-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'edon',
    langName: 'shqip',
    edgePrefixes: ['sq-AL', 'sq'],
    md5Digest: '01888cba8f112271d2cdb6c9de17aae7'
  },
  {
    id: 'sr_RS-serbski_institut-medium',
    path: 'sr/sr_RS/serbski_institut/medium/sr_RS-serbski_institut-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'serbski_institut',
    langName: 'srpski',
    edgePrefixes: ['sr-RS', 'sr'],
    md5Digest: '02c6e27ac7b4dfa84272df89edca9feb',
    numSpeakers: 2
  },
  {
    id: 'sv_SE-alma-medium',
    path: 'sv/sv_SE/alma/medium/sv_SE-alma-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'alma',
    langName: 'Svenska',
    edgePrefixes: ['sv-SE', 'sv'],
    md5Digest: '93c03e7c0e2f21e78d123a3ee82d54c1'
  },
  {
    id: 'sw_CD-lanfrica-medium',
    path: 'sw/sw_CD/lanfrica/medium/sw_CD-lanfrica-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'lanfrica',
    langName: 'Kiswahili',
    edgePrefixes: ['sw-CD', 'sw'],
    md5Digest: '7b28078f0e76cb201dc8b512ea4bf4d6'
  },
  {
    id: 'te_IN-maya-medium',
    path: 'te/te_IN/maya/medium/te_IN-maya-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'maya',
    langName: 'తెలుగు',
    edgePrefixes: ['te-IN', 'te'],
    md5Digest: '604fa4083118495c0fff55826ffccefe'
  },
  {
    id: 'th_TH-tsync2-medium',
    path: 'th/th_TH/tsync2/medium/th_TH-tsync2-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'tsync2',
    langName: 'ไทย',
    edgePrefixes: ['th-TH', 'th'],
    md5Digest: 'f3f58fc2cfc4f6c591629cb25b47923d'
  },
  {
    id: 'tr_TR-dfki-medium',
    path: 'tr/tr_TR/dfki/medium/tr_TR-dfki-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'dfki',
    langName: 'Türkçe',
    edgePrefixes: ['tr-TR', 'tr'],
    md5Digest: 'f51287b350a042dd8d67b2b215145e5a'
  },
  {
    id: 'uk_UA-ukrainian_tts-medium',
    path: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium',
    sizeMB: 73,
    quality: 'medium',
    voiceName: 'ukrainian_tts',
    langName: 'украї́нська мо́ва',
    edgePrefixes: ['uk-UA', 'uk'],
    md5Digest: '3366c3d4f31cb77966fb14d042956b4f',
    numSpeakers: 3
  },
  {
    id: 'ur_PK-aegis_female-medium',
    path: 'ur/ur_PK/aegis_female/medium/ur_PK-aegis_female-medium',
    sizeMB: 61,
    quality: 'medium',
    voiceName: 'aegis_female',
    langName: 'اردو',
    edgePrefixes: ['ur-PK', 'ur'],
    md5Digest: '81f9f9772025785f548e1aa0de3361b7'
  },
  {
    id: 'vi_VN-vais1000-medium',
    path: 'vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'vais1000',
    langName: 'Tiếng Việt',
    edgePrefixes: ['vi-VN', 'vi'],
    md5Digest: '5e42428c4f6131f75557cf156c9c1526'
  },
  {
    id: 'zh_CN-huayan-medium',
    path: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium',
    sizeMB: 60,
    quality: 'medium',
    voiceName: 'huayan',
    langName: '简体中文',
    edgePrefixes: ['zh-CN', 'zh-HK', 'zh-TW', 'zh'],
    md5Digest: '40cdb7930ff91b81574d5f0489e076ea'
  }
]
