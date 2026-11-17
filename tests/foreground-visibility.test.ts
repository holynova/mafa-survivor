import {expect,it} from 'vitest';
import {foregroundCoversActor} from '../src/map-render';
const hero={x:100,y:150},body={x:70,y:90,width:60,height:80};
it('detects a foreground actor covering the player torso',()=>{expect(foregroundCoversActor(body,170,hero)).toBe(true);});
it('does not promote a body behind the player even when its rectangle overlaps',()=>{expect(foregroundCoversActor(body,140,hero)).toBe(false);});
it('requires meaningful head/torso coverage rather than a single covered foot sample',()=>{expect(foregroundCoversActor({x:70,y:140,width:60,height:50},170,hero)).toBe(false);});
it('leaves side-by-side and just-outside silhouettes unhighlighted',()=>{expect(foregroundCoversActor({...body,x:101},170,hero)).toBe(false);expect(foregroundCoversActor({...body,x:40,width:60},170,hero)).toBe(false);});
