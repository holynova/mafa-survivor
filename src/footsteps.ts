import type {MapId} from './content';

/** Chapter surface families; the source map format has no per-cell acoustic material. */
export const CHAPTER_SURFACES: Record<MapId, 'grass' | 'ground' | 'stone' | 'cave'> = {
 biche: 'grass', bairimen: 'grass', mengzhong: 'ground',
 woma: 'stone', zuma: 'stone', stone: 'stone', shimu: 'stone',
 mine: 'cave', centipede: 'cave', redmoon: 'cave',
};
export function footstepKey(map: MapId, right: boolean) {
 return `step:${CHAPTER_SURFACES[map]}:${right ? 'right' : 'left'}`;
}
