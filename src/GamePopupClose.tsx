import {assetUrl,isGraybox} from './release';

export function GamePopupClose({label,onClose}: {label:string;onClose:()=>void}) {
  return <button type="button" className="game-popup-close" aria-label={label} title={label} onClick={onClose}>
    {isGraybox ? <span aria-hidden="true">×</span> : <img src={assetUrl('ui/close.png')} alt="" draggable={false}/>}
  </button>;
}
