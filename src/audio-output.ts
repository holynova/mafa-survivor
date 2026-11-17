/** Output-only soft ceiling. Original source files and bus balances stay intact.
 * Map a wide input domain through WaveShaper's nominal [-1, 1] range, retaining
 * a linear region up to 0.8 and a smooth asymptote at 0.98 sample amplitude.
 * This is not a true-peak limiter or a loudness/physical listening certification.
 */
export const OUTPUT_HEADROOM=16;
export function outputCurve(){
 const curve=new Float32Array(65537);
 for(let i=0;i<curve.length;i++){
  const x=(i/(curve.length-1)*2-1)*OUTPUT_HEADROOM,a=Math.abs(x);
  curve[i]=Math.sign(x)*(a<=.8?a:.8+.18*(1-Math.exp(-(a-.8)/.18)));
 }
 return curve;
}
export function connectAudioOutput(context:BaseAudioContext,master:AudioNode){
 const headroom=context.createGain(),ceiling=context.createWaveShaper();
 headroom.gain.value=1/OUTPUT_HEADROOM;ceiling.curve=outputCurve();
 // No resampling filter after the ceiling that could reintroduce sample peaks.
 ceiling.oversample='none';master.connect(headroom);headroom.connect(ceiling);ceiling.connect(context.destination);
 return {headroom,ceiling};
}
