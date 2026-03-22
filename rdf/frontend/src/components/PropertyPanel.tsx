/**
 * PropertyPanel
 * 右側パネル：選択ノードの名前・meta 編集
 */

import { useEffect, useState } from "react";
import type { NodeData } from "../models/types";
import { getLabel } from "../utils/i18n";

interface PropertyPanelProps {
  node: NodeData | null;
  onUpdateNode: (patch: Partial<NodeData>) => void;
}

export default function PropertyPanel({ node, onUpdateNode }: PropertyPanelProps) {
  const [name, setName] = useState("");
  const [metaText, setMetaText] = useState("{}");
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setName("");
      setMetaText("{}");
      setMetaError(null);
      return;
    }
    setName(node.name);
    setMetaText(JSON.stringify(node.meta, null, 2));
    setMetaError(null);
  }, [node]);

  const handleSave = () => {
    if (!node) return;

    try {
      const parsed = JSON.parse(metaText) as Record<string, unknown>;
      setMetaError(null);
      onUpdateNode({ name, meta: parsed });
    } catch (err) {
      setMetaError(`JSON 構文エラー: ${err instanceof Error ? err.message : "不明"}`);
    }
  };

  const disabled = !node;

  return (
    <aside className="property-panel">
      <h2>{getLabel("properties")}</h2>

      {!node && <p className="muted">{getLabel("block_name")}を選択すると編集できます</p>}

      {node && (
        <div className="form-group">
          <label>{getLabel("block_name")}</label>
          <input
            type="text"
            value={name}
            disabled={disabled}
            onChange={(e) => setName(e.target.value)}
            placeholder="ブロック名"
          />

          <label>{getLabel("meta_json")}</label>
          <textarea
            value={metaText}
            disabled={disabled}
            onChange={(e) => setMetaText(e.target.value)}
            rows={12}
            placeholder="{}"
            className={metaError ? "error" : ""}
          />
          {metaError && <p className="error-text">{metaError}</p>}

          <button disabled={disabled || !!metaError} onClick={handleSave}>
            {getLabel("save")}
          </button>
        </div>
      )}
    </aside>
  );
}
