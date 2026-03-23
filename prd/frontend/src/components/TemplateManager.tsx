import { useMemo, useState } from "react";
import type { BlockType } from "../models/types";
import { getDefaultMetaByType } from "../utils/analysisRules";
import { TYPE_LABELS } from "../utils/typeLabels";

interface TemplateManagerProps {
  blockTypes: BlockType[];
  onCreateFromTemplate: (type: BlockType, meta: Record<string, unknown>) => void;
}

export function TemplateManager({ blockTypes, onCreateFromTemplate }: TemplateManagerProps) {
  const [type, setType] = useState<BlockType>("Input");
  const [name, setName] = useState("MyTemplate");
  const [metaText, setMetaText] = useState(JSON.stringify(getDefaultMetaByType("Input"), null, 2));

  const preview = useMemo(() => {
    try {
      return JSON.parse(metaText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [metaText]);

  return (
    <section className="panel template-panel">
      <h2>テンプレート管理</h2>
      <div className="form-grid compact">
        <label>種別</label>
        <select
          value={type}
          onChange={(e) => {
            const next = e.target.value as BlockType;
            setType(next);
            setMetaText(JSON.stringify(getDefaultMetaByType(next), null, 2));
          }}
        >
          {blockTypes.map((bt) => (
            <option key={bt} value={bt}>{TYPE_LABELS[bt] ?? bt}</option>
          ))}
        </select>

        <label>テンプレート名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>メタ (JSON)</label>
        <textarea rows={8} value={metaText} onChange={(e) => setMetaText(e.target.value)} />
      </div>
      <button
        disabled={!preview}
        onClick={() => {
          if (!preview) return;
          onCreateFromTemplate(type, { ...preview, templateName: name });
        }}
      >
        テンプレから追加
      </button>
      {!preview && <p className="muted">meta JSON が不正です</p>}
    </section>
  );
}
