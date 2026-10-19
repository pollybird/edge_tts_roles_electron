import type { CloudVoiceInfo } from '../../../shared/types'

/**
 * 科大讯飞在线语音合成（WebSocket API v2）精选音色目录。
 *
 * vcn（音色代码）来自讯飞开放平台在线语音合成音色参数表：
 * https://www.xfyun.cn/doc/tts/online_tts/API.html
 *
 * voiceName 为音色原生名（endonym），属目录专有数据，不进 i18n（与 Piper 目录约定一致）。
 * 注意：讯飞音色列表更新频繁，id 无效时合成会返回具体错误码（经「语音服务→测试连接」即可发现）；
 * 扩充音色时请以讯飞控制台「音色管理」页的音色代码为准。
 */
export const XFYUN_VOICES: CloudVoiceInfo[] = [
  { id: 'xiaoyan', voiceName: '小燕', langName: '简体中文', gender: 'female' },
  { id: 'aisjiuxu', voiceName: '许九旭', langName: '简体中文', gender: 'male' },
  { id: 'aisxping', voiceName: '邢小萍', langName: '简体中文', gender: 'female' },
  { id: 'aisjinger', voiceName: '冷靖哥', langName: '简体中文', gender: 'male' },
  { id: 'aisxiaopei', voiceName: '邢小佩', langName: '简体中文', gender: 'female' },
  { id: 'xiaoyu', voiceName: '小宇', langName: '简体中文', gender: 'male' },
  { id: 'xiaomei', voiceName: '小梅', langName: '简体中文', gender: 'female' },
  { id: 'xiaolin', voiceName: '小琳', langName: '简体中文', gender: 'female' }
]
