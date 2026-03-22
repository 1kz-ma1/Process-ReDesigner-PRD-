/**
 * ID生成ユーティリティ
 * UUID v4 を実装（シンプルで衝突がほぼないため）
 */
export function generateId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export function generateNodeId() {
    return `node_${generateId()}`;
}
export function generateEdgeId() {
    return `edge_${generateId()}`;
}
