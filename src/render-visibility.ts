export type ViewRect={x:number;y:number;width:number;height:number};
/** Matches Phaser Camera.preRender's zoomed world view, without its one-frame lag. */
export function cameraWorldView(scrollX:number,scrollY:number,width:number,height:number,zoomX:number,zoomY:number):ViewRect{
 const w=Math.floor(width/zoomX+.5),h=Math.floor(height/zoomY+.5);
 return {x:Math.floor(scrollX+width/2-w/2+.5),y:Math.floor(scrollY+height/2-h/2+.5),width:w,height:h};
}
export function intersectsView(rect:ViewRect,view:ViewRect,padding=16){return rect.x+rect.width>=view.x-padding&&rect.x<=view.x+view.width+padding&&rect.y+rect.height>=view.y-padding&&rect.y<=view.y+view.height+padding;}
export function frameBounds(frame:{width:number;height:number;originX:number;originY:number},x:number,y:number,scale:number,offset=true):ViewRect{
 return {x:x-(offset?frame.originX:frame.width/2)*scale,y:y-(offset?frame.originY:frame.height/2)*scale,width:frame.width*scale,height:frame.height*scale};
}
