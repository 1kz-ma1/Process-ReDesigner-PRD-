import type { SmartCandidate } from "../utils/smartAdd";

interface SmartAddPopoverProps {
  row: number;
  col: number;
  candidates: SmartCandidate[];
  onPick: (candidate: SmartCandidate) => void;
  onClose: () => void;
}

export default function SmartAddPopover({ row, col, candidates, onPick, onClose }: SmartAddPopoverProps) {
  return (
    <div className="smart-add-popover" role="dialog" aria-label="スマート追加">
      <header>
        <strong>スマート追加</strong>
        <small>セル r{row + 1} / c{col + 1}</small>
      </header>
      <div className="smart-add-list">
        {candidates.map((item) => (
          <button key={`${item.type}-${item.name}`} onClick={() => onPick(item)}>
            <span>{item.name}</span>
            <small>{item.category}</small>
          </button>
        ))}
      </div>
      <footer>
        <button className="ghost" onClick={onClose}>閉じる</button>
      </footer>
    </div>
  );
}
