/**
 * PaneSplitter
 * 右ペインの幅をドラッグで変更可能なスプリッター
 */

import { useEffect, useRef, useState } from "react";

interface PaneSplitterProps {
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
  onWidthChange: (newWidth: number) => void;
}

export default function PaneSplitter({
  minWidth = 240,
  maxWidth = 520,
  initialWidth = 320,
  onWidthChange,
}: PaneSplitterProps) {
  const splitterRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitterRef.current) return;

      // Splitterの位置から右エッジまでの距離を計算
      const splitter = splitterRef.current;
      const splitterRect = splitter.getBoundingClientRect();
      
      // マウス位置 + 画面右のパディング考慮
      const containerRight = window.innerWidth;
      const potentialWidth = containerRight - e.clientX;

      // Min/Max制約を適用
      const newWidth = Math.max(minWidth, Math.min(maxWidth, potentialWidth));
      setWidth(newWidth);
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth, onWidthChange]);

  return (
    <div
      ref={splitterRef}
      className="pane-splitter"
      onMouseDown={() => setIsDragging(true)}
      role="separator"
      aria-label="右ペインの幅を変更（ドラッグで調整）"
      aria-orientation="vertical"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          const newWidth = Math.min(maxWidth, width + 20);
          setWidth(newWidth);
          onWidthChange(newWidth);
        } else if (e.key === "ArrowLeft") {
          const newWidth = Math.max(minWidth, width - 20);
          setWidth(newWidth);
          onWidthChange(newWidth);
        }
      }}
    />
  );
}
