/**
 * 日本語言語パック（ja-JP）。
 *
 * メッセージは全て日本語に翻訳。voiceNames は意図的に空
 * （Edge TTS API が既に原語名 Aoi、Keita などを返すため）。
 * 言語/地域名は ICU（Intl.DisplayNames）で生成し、
 * プライベートコード zh-CN-liaoning / zh-CN-shaanxi のみ手動で上書き。
 *
 * ニーモニックは中国語パックと同じく日本語 Windows 風の「ファイル(F)(&F)」形式。
 */
import type { LocalePack } from '../types'
import { buildLocaleNames } from '../buildLocaleNames'

const jaJP: LocalePack = {
  voices: {
    voiceNames: {},
    localeNames: buildLocaleNames('ja', {
      'zh-CN-liaoning': '中国語（東北官話、中国大陸）',
      'zh-CN-shaanxi': '中国語（陝西官話、中国大陸）'
    }),
    gender: { female: '女性', male: '男性' },
    displayPattern: '{name} - {region} - {gender}'
  },

  messages: {
    app: {
      title: 'Edge-TTS 複数ボイス音声ジェネレーター',
      copyright: '© 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.'
    },

    menu: {
      file: 'ファイル(F)(&F)',
      edit: '編集(E)(&E)',
      help: 'ヘルプ(H)(&H)',
      openText: 'テキストを開く(&O)...',
      saveText: 'テキストを保存(&S)',
      openConfig: '設定を開く(&O)...',
      saveConfig: '設定を保存(&S)',
      quit: '終了(&X)',
      undo: '元に戻す(&Z)',
      redo: 'やり直し(&Y)',
      cut: '切り取り(&X)',
      copy: 'コピー(&C)',
      paste: '貼り付け(&V)',
      find: '検索(&F)...',
      replace: '置換(&H)...',
      helpItem: 'ヘルプ(&H)',
      agreement: '利用規約(&U)',
      website: '公式サイト(&W)',
      about: 'バージョン情報(&A)'
    },

    editor: {
      header: 'テキストエディタ（[A][B][C][D]でボイス切替、[数値]で一時停止、[R]でビープ音）',
      open: '📂 開く',
      findPlaceholder: '検索',
      matchCase: '大文字と小文字を区別',
      prevMatch: '前を検索',
      nextMatch: '次を検索',
      replacePlaceholder: '置換後の文字列',
      replace: '置換',
      replaceAll: 'すべて置換',
      closeFind: '閉じる(Esc)',
      placeholder:
        '音声に変換するテキストを入力してください..\n\nマーカー：\n' +
        '[A] [B] [C] [D] - 話し手のボイスを切り替え\n' +
        '[数値] - ミリ秒単位の一時停止（例：[1000] ＝ 1秒）\n' +
        '[R] - ビープ音を挿入\n\n' +
        '例：\n' +
        '[A]こんにちは、ボイスAです。[B]ボイスBです。[1000][C]1秒停止後、ボイスC。[R]',
      insertRole: '👤 {tag} を挿入',
      insertPause: '⏱️ 一時停止を挿入',
      pauseMs: '時間(ms):',
      insertBeep: '🔊 ビープ音[R]を挿入',
      quickPause: 'クイック一時停止:',
      secondsShort: '{n}秒',
      openText: '📂 テキストを開く',
      saveText: '💾 テキストを保存',
      textSaved: 'テキストを保存しました',
      preview: '試聴:',
      previewSelection: '🎧 選択範囲を試聴',
      previewAll: '🔊 全文を試聴',
      charCount: '{n} 文字'
    },

    roles: {
      title: 'ボイス設定',
      saveConfig: '設定を保存',
      loadConfig: '設定を読込',
      saveConfigTip: '現在のボイス / 速度 / 音量 / ピッチを設定ファイルに保存します',
      loadConfigTip: '設定ファイルからボイス / 速度 / 音量 / ピッチを読み込みます',
      roleLabel: 'ロール {id}',
      voice: 'ボイス',
      unselected: '（未選択）',
      groupLabel: '--- {label}（{n}） ---',
      rate: '速度 {n}%',
      volume: '音量 {n}%',
      pitch: 'ピッチ {n}Hz'
    },

    extras: {
      title: '追加オーディオ',
      intro: '前奏',
      outro: '尾声',
      bgm: 'BGM',
      choose: 'ファイルを選択…',
      clear: '解除',
      noFile: '未選択',
      volume: '音量 {n}%',
      bgmHint: 'BGM は音声再生中にループします'
    },

    output: {
      chooseFile: '💾 出力ファイル...',
      noPath: '出力ファイルが選択されていません',
      format: '形式:',
      generate: '🎵 音声を生成',
      stop: '⏹️ 停止'
    },

    preview: {
      title: '音声プレビュー',
      loading: '音声を読み込み中...',
      ready: '再生準備完了',
      readyClickHint: '準備完了（▶️ をクリックして再生）',
      playing: '再生中...',
      paused: '一時停止中',
      ended: '再生が終了しました',
      stopped: '停止しました',
      loadFailed: '音声の読み込みに失敗しました',
      progress: '再生位置:',
      play: '▶️ 再生',
      pause: '⏸️ 一時停止',
      stop: '⏹️ 停止',
      volume: '音量:',
      close: '❌ 閉じる'
    },

    message: {
      ready: '準備完了',
      inputText: 'テキストを入力してください！',
      selectOutput: '出力ファイルのパスを選択してください！',
      generating: '音声を生成中...',
      generatingPreview: 'プレビュー音声を生成中...',
      selectForPreview: '試聴するテキストを先に選択してください！',
      previewReady: 'プレビュー音声の準備ができました！',
      audioGenerated: '音声を生成しました！{path}',
      errorPrefix: 'エラー: {msg}',
      configSaved: '設定を保存しました: {path}',
      configLoaded: 'ボイス設定を読み込みました！',
      textEmpty: 'テキストが空です。保存するものがありません。',
      textSaved: 'テキストを保存しました: {path}',
      opened: '開きました: {path}'
    },

    tts: {
      parsing: 'テキストを解析中...',
      parsingPreview: 'プレビューテキストを解析中...',
      noValidText: '有効なテキストが見つかりません',
      roleNoVoice: 'ロール {role} にボイスが選択されていません',
      cooldown: 'ネットワーク復帰後のクールダウン中、{sec}秒後に再開します...',
      generatingRole: 'ロール {role} の音声を生成中 ({index}/{total})...',
      retrying:
        'ロール {role} のネットワークが中断されました（{reason}）、再試行 {attempt}/{max}...',
      cacheHit: 'ロール {role} はローカルキャッシュから読み込みました ({index}/{total})',
      pauseAdded: '一時停止を追加しました: {ms}ms',
      beepAdded: 'ビープ音を追加しました',
      noAudio: '音声が生成されませんでした',
      noSegments: '結合する音声セグメントがありません',
      merging: '音声セグメントを結合中...',
      mixingExtras: '前奏 / BGM / 尾声をミックス中...',
      extrasLoadFailed: '追加オーディオ {file} を読み込めません: {msg}',
      encoding: '{format} 形式にエンコード中...',
      done: '音声生成が完了しました！',
      previewDone: 'プレビュー音声の生成が完了しました！',
      failFinal:
        '音声セグメントが {max} 回連続で失敗、または不完全です（{msg}）。' +
        '完成したセグメントはローカルキャッシュに保持されています。ネットワークを確認し、' +
        '再度「生成」をクリックすると中断位置から再開します。',
      streamInterrupted: '音声ストリームが転送完了前に終了しました',
      connClosedEarly: '接続が早期に切断されました',
      emptyAudio: '空の音声データです',
      edge50x:
        'Edge TTS サーバーエラー（{msg}）。音声生成を中止しました。後でもう一度お試しください。',
      segmentFailed: '音声セグメントの生成に失敗しました: {msg}',
      unknownError: '不明なエラー'
    },

    dialog: {
      ok: 'OK',
      textFilter: 'テキストファイル',
      audioFilter: '音声ファイル',
      configDefaultName: 'voice-config.json',
      configFilter: 'ボイス設定',
      invalidJson: '設定ファイルは有効な JSON ではありません',
      noVoiceInConfig: '設定ファイルに選択済みのボイスが見つかりません',
      unsupportedAudioExt: 'サポートされていない音声ファイル形式です：.{ext}'
    },

    help: {
      title: 'ヘルプ',
      message: 'Edge-TTS 複数ボイス音声ジェネレーター — ヘルプ',
      body:
        '1. マーカー\n' +
        '[A] [B] [C] [D]  話し手を切り替え（右側で各ロールに先にボイスを割り当ててください）\n' +
        '[数値]  ミリ秒単位の一時停止を挿入。例：[1000] ＝ 1秒\n' +
        '[R]  ビープ音を挿入\n' +
        '例：[A]こんにちは。[B]やあ！[1000][A]1秒後に続きます。[R]\n\n' +
        '2. 手順\n' +
        '1. 右側で各ロールのボイスを選び、速度・音量・ピッチを調整します。\n' +
        '2. エディタにマーカー付きのテキストを入力します。\n' +
        '3. 「選択範囲を試聴 / 全文を試聴」で先に仕上がりを確認できます。\n' +
        '4. 下部で出力形式（WAV / MP3 / OGG / FLAC）と保存先を選び、' +
        '「音声を生成」をクリックします。\n\n' +
        '3. 設定の再利用\n' +
        '「ファイル → 設定を保存」で4つのボイスと速度/音量/ピッチを JSON として保存できます。' +
        '別の原稿では「ファイル → 設定を開く」で読み込んで再利用できます。\n\n' +
        'ショートカット：Ctrl+O テキストを開く、Ctrl+S テキストを保存、Ctrl+F 検索、Ctrl+H 置換、F1 ヘルプ。'
    },

    agreement: {
      title: '利用規約',
      message: '利用規約',
      body:
        'Edge-TTS 複数ボイス音声ジェネレーター（以下「本ソフトウェア」）へようこそ。' +
        'ご使用前に本規約をお読みください：\n\n' +
        '1. 本ソフトウェアは、学習・研究および個人による合法的な音声制作の目的でのみ提供されます。' +
        '違法、権利侵害、または公序良俗に反する内容の作成に使用しないでください。\n' +
        '2. 音声合成は Microsoft Edge オンライン音声サービスにより提供されます。' +
        'インターネット接続が必要です。サービスの可用性は保証されません。\n' +
        '3. 本ソフトウェアは「現状のまま」提供され、生成結果の正確性や適合性について' +
        'いかなる保証も行いません。使用によるすべての結果は利用者の責任となります。\n' +
        '4. 本ソフトウェアは GNU AGPL v3 オープンソースライセンスの下で公開されており、当該ライセンスに従って自由に使用・改変・頒布できます。マイクロソフトその他のサービス提供者の正当な権利を侵害するため、または適用される法令に違反するために本ソフトウェアを使用することはできません。\n' +
        '5. 生成・保存・配信する音声コンテンツについては利用者が全責任を負います。\n\n' +
        'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd. All rights reserved.'
    },

    about: {
      title: 'バージョン情報',
      message: 'Edge-TTS 複数ボイス音声ジェネレーター',
      version: 'バージョン: {version}',
      tech: 'Electron + Vue 3 で構築。ボイスは Microsoft Edge TTS を使用。',
      copyright: 'Copyright © 2026 Taizhou Jiangyan Zhongyu Information Technology Co., Ltd.',
      website: 'https://www.tzzhy.cn/',
      license: 'ライセンス: GNU AGPL v3',
      opensource: '使用しているオープンソースソフトウェア:'
    }
  }
}

export default jaJP
