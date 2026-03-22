/**
 * ID生成ユーティリティ
 * UUID v4 を実装（シンプルで衝突がほぼないため）
 */

export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateNodeId(): string {
  return `node_${generateId()}`;
}

export function generateEdgeId(): string {
  return `edge_${generateId()}`;
}
