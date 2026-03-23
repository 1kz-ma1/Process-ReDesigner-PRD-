import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { TemplateDoc } from "../templates";

interface TemplateModalProps {
  open: boolean;
  templates: TemplateDoc[];
  onClose: () => void;
  onApplyReplace: (template: TemplateDoc) => void;
  onApplyMerge: (template: TemplateDoc) => void;
}

const CATEGORY_ORDER = ["共通", "バックオフィス", "在庫・物流", "人事・採用", "IT開発"];

function buildCategories(templates: TemplateDoc[]): string[] {
  const set = new Set<string>();
  set.add("すべて");
  for (const t of templates) {
    for (const tag of t.tags ?? []) {
      if (["在庫", "物流"].includes(tag)) {
        set.add("在庫・物流");
      } else if (["人事", "採用"].includes(tag)) {
        set.add("人事・採用");
      } else {
        set.add(tag);
      }
    }
  }
  const sorted = Array.from(set).filter((c) => c !== "すべて");
  sorted.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b, "ja");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return ["すべて", ...sorted];
}

function matchesCategory(template: TemplateDoc, category: string): boolean {
  if (category === "すべて") return true;
  const tags = template.tags ?? [];
  if (category === "在庫・物流") return tags.includes("在庫") || tags.includes("物流");
  if (category === "人事・採用") return tags.includes("人事") || tags.includes("採用");
  return tags.includes(category);
}

function miniPreviewNames(template: TemplateDoc): string[] {
  return template.nodes.slice(0, 3).map((n) => n.name);
}

type MiniPoint = { x: number; y: number };

type NodeRole = "start" | "end";

function buildMiniPointMap(template: TemplateDoc, width: number, height: number): Map<string, MiniPoint> {
  const map = new Map<string, MiniPoint>();
  const cols = Math.max(1, template.lanes.cols.length);
  const rows = Math.max(1, template.lanes.rows.length);
  const padX = 16;
  const padY = 14;
  const usableW = Math.max(1, width - padX * 2);
  const usableH = Math.max(1, height - padY * 2);

  for (const node of template.nodes) {
    const laneCol = node.lane?.col ?? 0;
    const laneRow = node.lane?.row ?? 0;
    const x = padX + (usableW * (laneCol + 0.5)) / cols;
    const y = padY + (usableH * (laneRow + 0.5)) / rows;
    map.set(node.id, { x, y });
  }

  return map;
}

function buildMiniNodeRoles(template: TemplateDoc): Map<string, Set<NodeRole>> {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const node of template.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
  }

  for (const edge of template.edges) {
    if (edge.kind === "loop") {
      continue;
    }
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
  }

  const roleMap = new Map<string, Set<NodeRole>>();
  for (const node of template.nodes) {
    const roleSet = new Set<NodeRole>();
    if ((incoming.get(node.id) ?? 0) === 0) {
      roleSet.add("start");
    }
    if ((outgoing.get(node.id) ?? 0) === 0) {
      roleSet.add("end");
    }
    roleMap.set(node.id, roleSet);
  }
  return roleMap;
}

function TemplateMiniMap({ template }: { template: TemplateDoc }) {
  const width = 280;
  const height = 92;
  const pointMap = useMemo(() => buildMiniPointMap(template, width, height), [template, width, height]);
  const roleMap = useMemo(() => buildMiniNodeRoles(template), [template]);
  const miniNodes = useMemo(
    () =>
      template.nodes
        .map((node) => {
          const p = pointMap.get(node.id);
          if (!p) return null;
          return { node, p };
        })
        .filter((item): item is { node: TemplateDoc["nodes"][number]; p: MiniPoint } => item !== null),
    [pointMap, template.nodes]
  );

  const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearHoverTimer();
  }, []);

  const handleMapMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const viewX = (localX / rect.width) * width;
    const viewY = (localY / rect.height) * height;

    let nearest: { name: string; dist2: number } | null = null;
    for (const item of miniNodes) {
      const dx = item.p.x - viewX;
      const dy = item.p.y - viewY;
      const dist2 = dx * dx + dy * dy;
      if (!nearest || dist2 < nearest.dist2) {
        nearest = { name: item.node.name, dist2 };
      }
    }

    // Small node circles are hard to hit, so allow nearby hover within this radius.
    const hitRadius = 14;
    if (!nearest || nearest.dist2 > hitRadius * hitRadius) {
      clearHoverTimer();
      setHoveredNodeName(null);
      setTooltipPos(null);
      return;
    }

    setTooltipPos({ x: localX, y: localY });

    if (hoveredNodeName === nearest.name) {
      return;
    }

    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredNodeName(nearest.name);
      hoverTimerRef.current = null;
    }, 60);
  };

  const handleMapMouseLeave = () => {
    clearHoverTimer();
    setHoveredNodeName(null);
    setTooltipPos(null);
  };

  return (
    <div className="template-mini-map" aria-hidden="true">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
      >
        <rect x="0" y="0" width={width} height={height} rx="8" ry="8" className="map-bg" />
        {template.edges.map((edge) => {
          const a = pointMap.get(edge.source);
          const b = pointMap.get(edge.target);
          if (!a || !b) return null;
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`map-edge ${edge.kind === "loop" ? "loop" : edge.kind === "condition" ? "condition" : "normal"}`}
            />
          );
        })}
        {miniNodes.map(({ node, p }) => {
          const roles = roleMap.get(node.id) ?? new Set<NodeRole>();
          const roleClass = `${roles.has("start") ? " start" : ""}${roles.has("end") ? " end" : ""}`;
          return (
            <circle key={node.id} cx={p.x} cy={p.y} r={4.2} className={`map-node ${node.type}${roleClass}`} />
          );
        })}
      </svg>
      {hoveredNodeName && tooltipPos && (
        <div className="template-mini-tooltip" style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 8 }}>
          {hoveredNodeName}
        </div>
      )}
    </div>
  );
}

export default function TemplateModal({
  open,
  templates,
  onClose,
  onApplyReplace,
  onApplyMerge,
}: TemplateModalProps) {
  const [category, setCategory] = useState("すべて");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(templates[0]?.key ?? null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const selected = templates.find((t) => t.key === selectedKey);
        if (selected) {
          onApplyReplace(selected);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onApplyReplace, onClose, open, selectedKey, templates]);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const focusables = rootRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    first?.focus();
  }, [open]);

  const categories = useMemo(() => buildCategories(templates), [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (!matchesCategory(t, category)) return false;
      if (!q) return true;
      const text = `${t.name} ${(t.tags ?? []).join(" ")} ${t.description ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [category, query, templates]);

  const selected = filtered.find((t) => t.key === selectedKey) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selected && filtered[0]) {
      setSelectedKey(filtered[0].key);
    }
  }, [filtered, selected]);

  if (!open) return null;

  return (
    <div className="template-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="template-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        ref={rootRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="template-modal-header">
          <h2 id="template-modal-title">テンプレートを選択</h2>
          <button className="ghost" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>

        <div className="template-modal-content">
          <aside className="template-categories">
            {categories.map((c) => (
              <button
                key={c}
                className={c === category ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </aside>

          <section className="template-cards">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="テンプレ名・タグで検索"
              aria-label="テンプレート検索"
            />
            <div className="template-card-list" role="listbox" aria-label="テンプレート一覧">
              {filtered.map((t) => (
                <button
                  key={t.key}
                  className={`template-card ${selected?.key === t.key ? "selected" : ""}`}
                  onClick={() => setSelectedKey(t.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedKey(t.key);
                    }
                  }}
                >
                  <div className="title">{t.name}</div>
                  <div className="mini-grid">{t.lanes.rows.length} x {t.lanes.cols.length}</div>
                  <TemplateMiniMap template={t} />
                  <div className="desc">{t.description}</div>
                  <div className="tags">{(t.tags ?? []).join(" / ")}</div>
                  <ul>
                    {miniPreviewNames(t).map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </section>

          <section className="template-preview">
            {selected ? (
              <>
                <h3>{selected.name}</h3>
                <p>{selected.description}</p>
                <div className="preview-grid" style={{ gridTemplateColumns: `repeat(${selected.lanes.cols.length}, minmax(0, 1fr))` }}>
                  {selected.lanes.cols.map((c) => (
                    <div key={`h-${c}`} className="header-cell">{c}</div>
                  ))}
                  {selected.lanes.rows.map((r, ri) =>
                    selected.lanes.cols.map((c, ci) => (
                      <div key={`${r}-${c}`} className="preview-cell">
                        <small>{r}</small>
                        {selected.nodes
                          .filter((n) => n.lane?.row === ri && n.lane?.col === ci)
                          .slice(0, 2)
                          .map((n) => (
                            <div key={n.id} className="chip">{n.name}</div>
                          ))}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p>該当テンプレートがありません</p>
            )}
          </section>
        </div>

        <footer className="template-modal-footer">
          <button onClick={onClose}>キャンセル</button>
          <button
            className="secondary"
            disabled={!selected}
            onClick={() => selected && onApplyMerge(selected)}
          >
            マージ（追加）
          </button>
          <button
            className="primary"
            disabled={!selected}
            onClick={() => selected && onApplyReplace(selected)}
          >
            適用（置き換え）
          </button>
        </footer>
      </div>
    </div>
  );
}
