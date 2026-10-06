/**
 * Arabic (Saudi Arabia) language pack.
 *
 * Right-to-left (RTL) layout is handled by setting document.documentElement.dir
 * to 'rtl' when this locale is active.
 */
import type { LocalePack } from '../types'

const arSA: LocalePack = {
  voices: {
    voiceNames: {},
    localeNames: {
      'ar-SA': 'العربية (المملكة العربية السعودية)',
      'ar-AE': 'العربية (الإمارات العربية المتحدة)',
      'ar-EG': 'العربية (مصر)',
      'ar-KW': 'العربية (الكويت)',
      'ar-QA': 'العربية (قطر)',
      'ar-BH': 'العربية (البحرين)',
      'ar-OM': 'العربية (عمان)',
      'ar-JO': 'العربية (الأردن)',
      'ar-IQ': 'العربية (العراق)',
      'ar-LB': 'العربية (لبنان)',
      'ar-LY': 'العربية (ليبيا)',
      'ar-MA': 'العربية (المغرب)',
      'ar-TN': 'العربية (تونس)',
      'ar-DZ': 'العربية (الجزائر)',
      'ar-SD': 'العربية (السودان)',
      'ar-YE': 'العربية (اليمن)',
      'ar-SY': 'العربية (سوريا)',
      'ar-PS': 'العربية (فلسطين)',
      'ar-MR': 'العربية (موريتانيا)',
      'ar-SO': 'العربية (الصومال)',
      'ar-DJ': 'العربية (جيبوتي)',
      'ar-KM': 'العربية (جزر القمر)',
      'ar-TD': 'العربية (تشاد)'
    },
    gender: { female: 'أنثى', male: 'ذكر' },
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'مولد الصوت متعدد الأصوات Edge-TTS',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.'
    },

    menu: {
      file: '&ملف',
      edit: '&تحرير',
      language: 'اللغة(&L)',
      help: '&مساعدة',
      openText: '&فتح نص...',
      saveText: '&حفظ النص',
      openConfig: 'فتح &الإعدادات...',
      saveConfig: 'ح&فظ الإعدادات',
      quit: '&خروج',
      undo: '&تراجع',
      redo: '&إعادة',
      cut: 'ق&ص',
      copy: 'ن&سخ',
      paste: 'ل&صق',
      find: '&بحث...',
      replace: 'است&بدال...',
      helpItem: '&مساعدة',
      agreement: 'اتفاقية &المستخدم',
      checkUpdate: 'التحقق من التحديثات(&U)',
      website: '&الموقع الإلكتروني',
      about: '&حول'
    },

    editor: {
      header: 'محرر النص (استخدم [A][B][C][D] لتبديل الأصوات، [رقم] للإيقاف المؤقت، [R] لصفارة)',
      open: '📂 فتح',
      findPlaceholder: 'بحث',
      matchCase: 'مطابقة حالة الأحرف',
      prevMatch: 'السابق',
      nextMatch: 'التالي',
      replacePlaceholder: 'استبدال بـ',
      replace: 'استبدال',
      replaceAll: 'استبدال الكل',
      closeFind: 'إغلاق (Esc)',
      placeholder:
        'أدخل النص لتحويله إلى كلام..\n\nالعلامات:\n' +
        '[A] [B] [C] [D] - تبديل صوت المتحدث\n' +
        '[رقم] - إيقاف مؤقت بالمللي ثانية (مثال: [1000] = ثانية واحدة)\n' +
        '[R] - إدراج صفارة\n\n' +
        'مثال:\n' +
        '[A]مرحباً، أنا الصوت أ. [B]وأنا الصوت ب. [1000][C]بعد إيقاف مؤقت لثانية واحدة، الصوت ج. [R]',
      insertRole: '👤 إدراج {tag}',
      insertPause: '⏱️ إدراج إيقاف مؤقت',
      pauseMs: 'الزمن (مللي ثانية):',
      insertBeep: '🔊 إدراج صفارة [R]',
      quickPause: 'إيقاف مؤقت سريع:',
      secondsShort: '{n}ث',
      openText: '📂 فتح نص',
      saveText: '💾 حفظ النص',
      textSaved: 'تم حفظ النص',
      preview: 'معاينة:',
      previewSelection: '🎧 معاينة التحديد',
      previewAll: '🔊 معاينة كل النص',
      charCount: '{n} حرف'
    },

    roles: {
      title: 'إعدادات الصوت',
      saveConfig: 'حفظ الإعدادات',
      loadConfig: 'تحميل الإعدادات',
      saveConfigTip: 'حفظ الإعدادات الحالية (صوت/سرعة/مستوى صوت/نبرة) في ملف',
      loadConfigTip: 'تحميل الإعدادات (صوت/سرعة/مستوى صوت/نبرة) من ملف',
      roleLabel: 'الدور {id}',
      voice: 'الصوت',
      unselected: '(غير محدد)',
      groupLabel: '--- {label} ({n}) ---',
      rate: 'السرعة {n}%',
      volume: 'مستوى الصوت {n}%',
      pitch: 'النبرة {n} هرتز'
    },

    extras: {
      title: 'الصوت الإضافي',
      intro: 'المقدمة',
      outro: 'الخاتمة',
      bgm: 'الموسيقى الخلفية',
      choose: 'اختيار ملف...',
      clear: 'مسح',
      noFile: 'غير محدد',
      volume: 'مستوى الصوت {n}%',
      bgmHint: 'تتكرر الموسيقى الخلفية أثناء التسجيل'
    },

    output: {
      chooseFile: '💾 ملف الإخراج...',
      noPath: 'لم يتم اختيار ملف إخراج',
      format: 'التنسيق:',
      generate: '🎵 إنشاء الصوت',
      stop: '⏹️ إيقاف'
    },

    preview: {
      title: 'معاينة الصوت',
      loading: 'جارٍ تحميل الصوت...',
      ready: 'جاهز للتشغيل',
      readyClickHint: 'جاهز (انقر ▶️ للتشغيل)',
      playing: 'جارٍ التشغيل...',
      paused: 'متوقف مؤقتاً',
      ended: 'انتهى التشغيل',
      stopped: 'تم الإيقاف',
      loadFailed: 'فشل تحميل الصوت',
      progress: 'الموضع:',
      play: '▶️ تشغيل',
      pause: '⏸️ إيقاف مؤقت',
      stop: '⏹️ إيقاف',
      volume: 'مستوى الصوت:',
      close: '❌ إغلاق'
    },

    message: {
      ready: 'جاهز',
      inputText: 'الرجاء إدخال بعض النص!',
      selectOutput: 'الرجاء اختيار مسار ملف الإخراج!',
      generating: 'جارٍ إنشاء الصوت...',
      generatingPreview: 'جارٍ إنشاء صوت المعاينة...',
      selectForPreview: 'الرجاء تحديد النص أولاً للمعاينة!',
      previewReady: 'صوت المعاينة جاهز!',
      audioGenerated: 'تم إنشاء الصوت! {path}',
      errorPrefix: 'خطأ: {msg}',
      configSaved: 'تم حفظ الإعدادات: {path}',
      configLoaded: 'تم تحميل إعدادات الصوت!',
      textEmpty: 'النص فارغ، لا يوجد شيء لحفظه.',
      textSaved: 'تم حفظ النص: {path}',
      opened: 'تم الفتح: {path}'
    },

    update: {
      checking: 'جارٍ التحقق من التحديثات...',
      available: 'يتوفر إصدار جديد {version}، جارٍ التنزيل...',
      notAvailable: 'أنت تستخدم بالفعل أحدث إصدار.',
      downloadProgress: 'جارٍ تنزيل التحديث... {percent}%',
      downloaded: 'تم تنزيل الإصدار {version}. هل تريد إعادة التشغيل للتثبيت؟',
      install: 'إعادة التشغيل والتثبيت',
      later: 'لاحقاً',
      checkFailed: 'فشل التحقق من التحديثات.'
    },

    tts: {
      parsing: 'جارٍ تحليل النص...',
      parsingPreview: 'جارٍ تحليل نص المعاينة...',
      noValidText: 'لم يُعثر على نص صالح',
      roleNoVoice: 'الدور {role} ليس له صوت محدد',
      cooldown: 'جارٍ التبريد بعد استعادة الشبكة، المتابعة خلال {sec} ثانية...',
      generatingRole: 'جارٍ إنشاء صوت الدور {role} ({index}/{total})...',
      retrying: 'انقطعت الشبكة للدور {role} ({reason})، إعادة المحاولة {attempt}/{max}...',
      cacheHit: 'تم تحميل الدور {role} من الذاكرة المحلية ({index}/{total})',
      pauseAdded: 'تمت إضافة إيقاف مؤقت: {ms} مللي ثانية',
      beepAdded: 'تمت إضافة صفارة',
      noAudio: 'لم يتم إنشاء أي صوت',
      noSegments: 'لا توجد مقاطع صوتية للدمج',
      merging: 'جارٍ دمج مقاطع الصوت...',
      mixingExtras: 'جارٍ دمج المقدمة/الموسيقى الخلفية/الخاتمة...',
      extrasLoadFailed: 'فشل تحميل الصوت الإضافي {file}: {msg}',
      encoding: 'جارٍ الترميز كـ {format}...',
      done: 'اكتمل إنشاء الصوت!',
      previewDone: 'اكتمل صوت المعاينة!',
      failFinal:
        'فشل مقطع صوتي {max} مرات متتالية أو كان غير مكتمل ({msg}). ' +
        'المقاطع المكتملة محفوظة في الذاكرة المحلية. تحقق من اتصال الشبكة و' +
        'انقر "إنشاء الصوت" مرة أخرى للاستئناف.',
      streamInterrupted: 'انتهى دفق الصوت قبل اكتمال النقل',
      connClosedEarly: 'تم إغلاق الاتصال مبكراً',
      emptyAudio: 'بيانات صوتية فارغة',
      edge50x: 'خطأ في خادم Edge TTS ({msg})، تم إيقاف إنشاء الصوت. الرجاء المحاولة لاحقاً.',
      segmentFailed: 'فشل إنشاء مقطع الصوت: {msg}',
      unknownError: 'خطأ غير معروف'
    },

    dialog: {
      ok: 'موافق',
      textFilter: 'ملفات النص',
      audioFilter: 'ملفات الصوت',
      configDefaultName: 'voice-config.json',
      configFilter: 'إعدادات الصوت',
      invalidJson: 'ملف الإعدادات ليس بتنسيق JSON صالح',
      noVoiceInConfig: 'لم يُعثر على صوت محدد في ملف الإعدادات',
      unsupportedAudioExt: 'نوع ملف صوتي غير مدعوم: .{ext}'
    },

    help: {
      title: 'مساعدة',
      message: 'مولد الصوت متعدد الأصوات Edge-TTS — مساعدة',
      body:
        '1. العلامات\n' +
        '[A] [B] [C] [D]  تبديل المتحدث (حدد صوتاً لكل دور على اليمين أولاً)\n' +
        '[رقم]  إدراج إيقاف مؤقت بالمللي ثانية، مثال: [1000] = ثانية واحدة\n' +
        '[R]  إدراج صفارة\n' +
        'مثال: [A]مرحباً. [B]مرحباً! [1000][A]الاستمرار بعد ثانية واحدة. [R]\n\n' +
        '2. الخطوات\n' +
        '1. اختر صوتاً لكل دور على اليمين واضبط السرعة ومستوى الصوت والنبرة.\n' +
        '2. أدخل النص مع العلامات في المحرر.\n' +
        '3. استخدم "معاينة التحديد / معاينة كل النص" للتحقق من النتيجة أولاً.\n' +
        '4. اختر تنسيق الإخراج (WAV / MP3 / OGG / FLAC) ومسار الحفظ في الأسفل، ' +
        'ثم انقر "إنشاء الصوت".\n\n' +
        '3. إعادة استخدام الإعدادات\n' +
        '"ملف → حفظ الإعدادات" يخزن الأصوات الأربعة مع السرعة/مستوى الصوت/النبرة كـ JSON؛ ' +
        'استخدم "ملف → فتح الإعدادات" لتحميلها لنصوص أخرى.\n\n' +
        'اختصارات: Ctrl+O فتح نص، Ctrl+S حفظ نص، Ctrl+F بحث، Ctrl+H استبدال، F1 مساعدة.'
    },

    agreement: {
      title: 'اتفاقية المستخدم',
      message: 'اتفاقية المستخدم',
      body:
        'مرحباً بك في مولد الصوت متعدد الأصوات Edge-TTS ("البرنامج"). ' +
        'الرجاء قراءة هذه الاتفاقية قبل الاستخدام:\n\n' +
        '1. يُقدم البرنامج للدراسة والبحث وإنتاج الصوت الشخصي القانوني فقط. ' +
        'لا تستخدمه لإنشاء أي شيء غير قانوني أو مخالف أو ضد النظام العام.\n' +
        '2. التوليف الصوتي مقدم من خدمة Microsoft Edge الصوتية عبر الإنترنت؛ ' +
        'يتطلب الاتصال بالإنترنت. لا يُضمن توفر الخدمة.\n' +
        '3. يُقدم البرنامج "كما هو"، بدون أي ضمانات بخصوص ' +
        'دقة أو ملاءمة النتائج المُنشأة. أنت تتحمل كامل عواقب استخدامه.\n' +
        '4. يُصدر البرنامج بموجب رخصة المصادر المفتوحة GNU AGPL v3؛ يمكنك استخدامه وتعديله وتوزيعه بحرية وفقاً لتلك الرخصة. لا يجوز لك استخدام البرنامج لانتهاك الحقوق المشروعة لشركة مايكروسوفت أو مقدمي الخدمات الآخرين، أو لانتهاك أي قوانين أو لوائح معمول بها.\n' +
        '5. أنت مسؤول بالكامل عن محتوى الصوت الذي تنشئه وتخزنه وتنشره.\n\n' +
        'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. All rights reserved.',
      accept: 'لقد قرأت اتفاقية المستخدم وأوافق عليها',
      decline: 'رفض والخروج',
      doNotShowAgain: 'عدم الإظهار في المرة القادمة'
    },

    about: {
      title: 'حول',
      message: 'مولد الصوت متعدد الأصوات Edge-TTS',
      version: 'الإصدار: {version}',
      tech: 'مبني باستخدام Electron + Vue 3. الأصوات مقدمة من Microsoft Edge TTS.',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.',
      website: 'https://www.tzzhy.cn/',
      license: 'الترخيص: GNU AGPL v3',
      opensource: 'البرمجيات مفتوحة المصدر المستخدمة:'
    }
  }
}

export default arSA
