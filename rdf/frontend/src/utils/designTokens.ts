/**
 * デザイントークン（CSS変数）
 * kintone に近い落ち着いた UI を目指す
 */

export const designTokens = {
  // 色
  bg: "#f7f9fb",
  panel: "#ffffff",
  text: "#1f2328",
  muted: "#6b7280",
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  danger: "#ef4444",
  dangerHover: "#dc2626",
  warning: "#fb923c",
  success: "#10b981",
  border: "#e5e7eb",
  shadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
  shadowMd: "0 4px 12px rgba(0, 0, 0, 0.08)",
  
  // サイズ
  radius: "10px",
  radiusSm: "6px",
  radiusLg: "12px",
  gap: "12px",
  gapSm: "8px",
  gapLg: "16px",
  
  // タイポ
  fontSizeSm: "12px",
  fontSize: "14px",
  fontSizeMd: "16px",
  fontSizeLg: "18px",
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  
  // SVG/キャンバス
  blockWidth: 120,
  blockHeight: 60,
  blockRadius: 6,
  blockStrokeWidth: 2,
  blockStrokeColor: "#2563eb",
  blockFillColor: "#ffffff",
  blockTextColor: "#1f2328",
  
  edgeStrokeWidth: 2,
  edgeStrokeColor: "#6b7280",
  edgeLoopStrokeColor: "#fb923c",
  edgeSelectedStrokeColor: "#2563eb",
  
  // ズーム範囲
  zoomMin: 0.5,
  zoomMax: 3,
  zoomStep: 0.1,
  
  // グリッド（ロードマップ）
  cellMinWidth: 200,
  cellMinHeight: 100,
} as const;

/**
 * CSS 変数として inject する
 */
export function injectDesignTokens(): void {
  const root = document.documentElement;
  Object.entries(designTokens).forEach(([key, value]) => {
    const cssVarName = `--rdf-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    if (typeof value === "string") {
      root.style.setProperty(cssVarName, value);
    } else {
      root.style.setProperty(cssVarName, String(value));
    }
  });
}
