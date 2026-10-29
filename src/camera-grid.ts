/** Keep adjacent source-map strips on one screen-pixel grid at fractional zoom. */
export function alignCameraScroll(scroll:number,zoom:number,origin:number,viewportStart=0,bounds?:{min:number;max:number}) {
  // Phaser rounds the screen origin, then translates by the scaled world origin.
  const offset=Math.floor(viewportStart+origin+0.5)-origin*zoom;
  let pixel=Math.round(scroll*zoom-offset);
  if(bounds) {
    const first=Math.ceil(bounds.min*zoom-offset-1e-9);
    const last=Math.floor(bounds.max*zoom-offset+1e-9);
    if(first>last)return Math.max(bounds.min,Math.min(bounds.max,scroll));
    pixel=Math.max(first,Math.min(last,pixel));
  }
  return (pixel+offset)/zoom;
}

/** Keep camera bounds and centering inside the area above the measured console. */
export function battleViewport(width:number,height:number,bottomInset=0) {
  return {width:Math.max(1,width),height:Math.max(1,height-Math.max(0,Math.ceil(bottomInset)))};
}
