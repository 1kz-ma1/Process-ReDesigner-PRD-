import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { TemplateDoc } from "../templates";

interface TemplateModalProps {
  open: boolean;
  templates: TemplateDoc[];
  onClose: () => void;
  onApplyReplace: (template: TemplateDoc) => void;
  onApplyMerge: (template: TemplateDoc) => void;
}

const CATEGORY_ORDER = ["共通", "バックオフィス", "在庫・物流", "人事・採用", "IT開発"];

type TagDimensionId = "userRole" | "systemPurpose" | "targetObject";

interface DimensionOption {
  id: string;
  label: string;
  tags?: string[];
  keywords?: string[];
}

interface TagDimension {
  id: TagDimensionId;
  label: string;
  helper: string;
  options: DimensionOption[];
}

const TAG_DIMENSIONS: TagDimension[] = [
  {
    id: "userRole",
    label: "誰が使う？",
    helper: "主に操作するユーザーを選択",
    options: [
      { id: "role-manager", label: "管理者・承認者", tags: ["バックオフィス", "承認"], keywords: ["承認", "管理", "部長"] },
      { id: "role-operator", label: "現場・担当者", tags: ["在庫", "物流", "購買"], keywords: ["入庫", "検品", "出荷", "発注"] },
      { id: "role-hr", label: "人事・採用担当", tags: ["人事", "採用"], keywords: ["採用", "面接", "配属"] },
      { id: "role-applicant", label: "申請者・一般利用者", tags: ["共通"], keywords: ["申請", "応募"] },
    ],
  },
  {
    id: "systemPurpose",
    label: "何をするシステム？",
    helper: "業務の中心機能を選択",
    options: [
      { id: "purpose-approval", label: "申請・承認", tags: ["承認", "バックオフィス"], keywords: ["申請", "承認", "通知"] },
      { id: "purpose-inventory", label: "在庫・物流管理", tags: ["在庫", "物流"], keywords: ["入庫", "検品", "棚入れ", "出荷"] },
      { id: "purpose-purchase", label: "購買・発注管理", tags: ["購買", "バックオフィス"], keywords: ["発注", "購買", "納品"] },
      { id: "purpose-hr", label: "採用・人材管理", tags: ["人事", "採用"], keywords: ["応募", "面接", "内定", "配属"] },
    ],
  },
  {
    id: "targetObject",
    label: "対象は何？",
    helper: "扱う対象データを選択",
    options: [
      { id: "target-product", label: "商品・在庫", tags: ["在庫", "物流", "購買"], keywords: ["在庫", "入庫", "出荷", "納品"] },
      { id: "target-human", label: "人材・従業員", tags: ["人事"], keywords: ["人材", "人事", "配属"] },
      { id: "target-recruit", label: "採用候補者", tags: ["採用"], keywords: ["応募", "面接", "内定"] },
      { id: "target-request", label: "申請データ", tags: ["共通", "承認"], keywords: ["申請", "検証", "承認"] },
    ],
  },
];

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

function matchesDimensionOption(template: TemplateDoc, option: DimensionOption): boolean {
  const tags = template.tags ?? [];
  const text = `${template.name} ${template.description ?? ""} ${(template.tags ?? []).join(" ")}`.toLowerCase();

  const hasTag = (option.tags ?? []).some((tag) => tags.includes(tag));
  const hasKeyword = (option.keywords ?? []).some((keyword) => text.includes(keyword.toLowerCase()));
  return hasTag || hasKeyword;
}

function findOptionById(id: string): DimensionOption | null {
  for (const dim of TAG_DIMENSIONS) {
    const found = dim.options.find((opt) => opt.id === id);
    if (found) {
      return found;
    }
  }
  return null;
}

function scoreTemplateBySelections(template: TemplateDoc, selectedOptionIds: string[], category: string): number {
  if (selectedOptionIds.length === 0) {
    return 0;
  }

  let score = 0;
  for (const optionId of selectedOptionIds) {
    const option = findOptionById(optionId);
    if (option && matchesDimensionOption(template, option)) {
      score += 4;
    }
  }

  if (category !== "すべて" && matchesCategory(template, category)) {
    score += 1;
  }

  const allMatched = selectedOptionIds.every((optionId) => {
    const option = findOptionById(optionId);
    return option ? matchesDimensionOption(template, option) : false;
  });
  if (allMatched) {
    score += 3;
  }

  return score;
}

function miniPreviewNames(template: TemplateDoc): string[] {
  return template.nodes.slice(0, 3).map((n) => n.name);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) {
    return text;
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "ig");
  const parts = text.split(pattern);
  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.toLowerCase() === trimmed.toLowerCase()) {
      return (
        <mark key={`${part}-${index}`} className="template-match">
          {part}
        </mark>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
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
  const [selectedByDimension, setSelectedByDimension] = useState<Record<TagDimensionId, string | null>>({
    userRole: null,
    systemPurpose: null,
    targetObject: null,
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(templates[0]?.key ?? null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
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
  const selectedOptionIds = useMemo(
    () => Object.values(selectedByDimension).filter((id): id is string => Boolean(id)),
    [selectedByDimension]
  );

  const selectedOptionsKey = useMemo(() => selectedOptionIds.slice().sort().join("|"), [selectedOptionIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (!matchesCategory(t, category)) return false;
      if (
        selectedOptionIds.length > 0 &&
        !selectedOptionIds.every((optionId) => {
          const option = findOptionById(optionId);
          return option ? matchesDimensionOption(t, option) : true;
        })
      ) {
        return false;
      }
      if (!q) return true;
      const text = `${t.name} ${(t.tags ?? []).join(" ")} ${t.description ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [category, query, selectedOptionIds, templates]);

  const recommendations = useMemo(() => {
    if (selectedOptionIds.length === 0) {
      return [] as Array<{ template: TemplateDoc; score: number }>;
    }

    const q = query.trim().toLowerCase();
    return templates
      .filter((template) => {
        if (q.length === 0) return true;
        const text = `${template.name} ${(template.tags ?? []).join(" ")} ${template.description ?? ""}`.toLowerCase();
        return text.includes(q);
      })
      .map((template) => ({
        template,
        score: scoreTemplateBySelections(template, selectedOptionIds, category),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.template.name.localeCompare(b.template.name, "ja");
      })
      .slice(0, 3);
  }, [category, query, selectedOptionIds, templates]);

  useEffect(() => {
    if (!selectedOptionsKey || recommendations.length === 0) {
      return;
    }
    setSelectedKey(recommendations[0].template.key);
  }, [recommendations, selectedOptionsKey]);

  const selected = filtered.find((t) => t.key === selectedKey) ?? filtered[0] ?? null;
  const selectedIndex = selected ? filtered.findIndex((t) => t.key === selected.key) : -1;

  useEffect(() => {
    if (!selected && filtered[0]) {
      setSelectedKey(filtered[0].key);
    }
  }, [filtered, selected]);

  const moveSelection = (delta: number) => {
    if (filtered.length === 0) {
      return;
    }
    const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (safeIndex + delta + filtered.length) % filtered.length;
    setSelectedKey(filtered[nextIndex].key);
  };

  if (!open) return null;

  const selectDimensionOption = (dimension: TagDimensionId, optionId: string) => {
    setSelectedByDimension((prev) => ({
      ...prev,
      [dimension]: prev[dimension] === optionId ? null : optionId,
    }));
  };

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
            <div className="template-tag-assist" aria-label="業務タグアシスト">
              <div className="template-tag-assist-head">
                <strong>条件を3つ選ぶだけで候補が絞れます</strong>
                <button
                  className="ghost"
                  type="button"
                  onClick={() =>
                    setSelectedByDimension({
                      userRole: null,
                      systemPurpose: null,
                      targetObject: null,
                    })
                  }
                  disabled={selectedOptionIds.length === 0}
                >
                  クリア
                </button>
              </div>
              <div className="template-tag-groups">
                {TAG_DIMENSIONS.map((dimension) => (
                  <section key={dimension.id} className="template-tag-group" aria-label={dimension.label}>
                    <h4>{dimension.label}</h4>
                    <p>{dimension.helper}</p>
                    <div className="template-tag-chips">
                      {dimension.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`template-tag-chip ${selectedByDimension[dimension.id] === option.id ? "active" : ""}`}
                          onClick={() => selectDimensionOption(dimension.id, option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              {recommendations.length > 0 && (
                <div className="template-recommend-list" aria-label="タグ一致おすすめ">
                  {recommendations.map((item, index) => (
                    <button
                      key={item.template.key}
                      type="button"
                      className={`template-recommend-item ${selectedKey === item.template.key ? "active" : ""}`}
                      onClick={() => setSelectedKey(item.template.key)}
                    >
                      <span>おすすめ {index + 1}: {item.template.name}</span>
                      <small>一致スコア {item.score}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveSelection(1);
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveSelection(-1);
                }
                if (e.key === "Enter" && selected) {
                  e.preventDefault();
                  setSelectedKey(selected.key);
                }
              }}
              placeholder="テンプレ名・タグで検索"
              aria-label="テンプレート検索"
            />
            <p className="template-search-summary" role="status" aria-live="polite">
              {filtered.length} 件ヒット
              {query.trim() ? ` - 「${query.trim()}」` : ""}
              （↑↓で選択 / Ctrl+Enterで適用）
            </p>
            <div className="template-card-list" role="listbox" aria-label="テンプレート一覧">
              {filtered.length === 0 && (
                <div className="template-empty-search" role="status">
                  条件に一致するテンプレートがありません。
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setQuery("");
                      setSelectedByDimension({ userRole: null, systemPurpose: null, targetObject: null });
                    }}
                  >
                    条件をリセット
                  </button>
                </div>
              )}
              {filtered.map((t) => (
                <button
                  key={t.key}
                  id={`template-card-${t.key}`}
                  className={`template-card ${selected?.key === t.key ? "selected" : ""}`}
                  onClick={() => setSelectedKey(t.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedKey(t.key);
                    }
                  }}
                >
                  <div className="title">{renderHighlightedText(t.name, query)}</div>
                  <div className="mini-grid">{t.lanes.rows.length} x {t.lanes.cols.length}</div>
                  <TemplateMiniMap template={t} />
                  <div className="desc">{renderHighlightedText(t.description ?? "", query)}</div>
                  <div className="tags">{renderHighlightedText((t.tags ?? []).join(" / "), query)}</div>
                  <ul>
                    {miniPreviewNames(t).map((name) => (
                      <li key={name}>{renderHighlightedText(name, query)}</li>
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
