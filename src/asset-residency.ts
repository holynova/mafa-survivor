/** Pixel storage estimate, not measured GPU/process memory. */
export type AtlasPage={key:string;width:number;height:number;lazy?:boolean};
export function atlasResidency(pages:readonly AtlasPage[],loaded:ReadonlySet<string>){
 const resident=pages.filter(p=>loaded.has(p.key));
 return {pages:resident.length,rgbaBytes:resident.reduce((sum,p)=>sum+p.width*p.height*4,0)};
}
/** Core atlases mix shared effects and actors; only release unreferenced lazy pages. */
export function unusedAtlasPages(pages:readonly AtlasPage[],loaded:ReadonlySet<string>,retained:ReadonlySet<string>){
 return pages.filter(p=>p.lazy&&loaded.has(p.key)&&!retained.has(p.key)).map(p=>p.key);
}
