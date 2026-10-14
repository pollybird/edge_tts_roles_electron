/** 双声道 PCM（planar：左右声道各一个 Float32Array，对应 numpy 的 (N, 2) 结构） */
export interface StereoPcm {
  left: Float32Array
  right: Float32Array
  sampleRate: number
}
