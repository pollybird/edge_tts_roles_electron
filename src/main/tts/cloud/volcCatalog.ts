import type { CloudVoiceInfo } from '../../../shared/types'

/**
 * 火山引擎 TTS 精选音色目录。
 *
 * voice_type（音色代码）来自火山引擎语音技术文档音色列表：
 * https://www.volcengine.com/docs/6561/97465（音色列表页随版本更新）
 *
 * voiceName 以音色 id 原样展示（火山音色 id 已含性别/风格/版本语义，如 zh_female_*），
 * 避免硬编码未经核实的中文艺名；gender 由 id 前缀推导。
 * id 无效时合成会返回明确错误（经「语音服务→测试连接」即可发现）。
 */
export const VOLC_VOICES: CloudVoiceInfo[] = [
  {
    id: 'zh_female_cemo_mars',
    voiceName: 'zh_female_cemo_mars',
    langName: '简体中文',
    gender: 'female'
  },
  {
    id: 'zh_male_roucheng_mars',
    voiceName: 'zh_male_roucheng_mars',
    langName: '简体中文',
    gender: 'male'
  },
  {
    id: 'zh_female_shuangkuai_mars',
    voiceName: 'zh_female_shuangkuai_mars',
    langName: '简体中文',
    gender: 'female'
  },
  {
    id: 'zh_male_richang_kesu',
    voiceName: 'zh_male_richang_kesu',
    langName: '简体中文',
    gender: 'male'
  },
  {
    id: 'zh_female_wanqudashu_mars_bigtts',
    voiceName: 'zh_female_wanqudashu_mars_bigtts',
    langName: '简体中文',
    gender: 'female'
  },
  {
    id: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts',
    voiceName: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts',
    langName: '简体中文',
    gender: 'male'
  },
  {
    id: 'zh_female_linjialin',
    voiceName: 'zh_female_linjialin',
    langName: '简体中文',
    gender: 'female'
  },
  { id: 'BV001_streaming', voiceName: 'BV001_streaming', langName: '简体中文', gender: 'female' },
  { id: 'BV002_streaming', voiceName: 'BV002_streaming', langName: '简体中文', gender: 'male' },
  { id: 'BV406_streaming', voiceName: 'BV406_streaming', langName: '英语（美式）' }
]
