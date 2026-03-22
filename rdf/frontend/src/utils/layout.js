/**
 * 自動整列・レイアウト計算
 * DAG を仮定し、トポロジカルソート後に各レイヤーに配置
 */
import { designTokens } from "./designTokens";
/**
 * ロードマップ用：トポロジカルソート + セルへの自動配置
 * 列は DAG フロー順、行は衝突回避
 */
export function autoLayoutRoadmap(doc) {
    if (!doc.laneConfig)
        return doc;
    const cols = doc.laneConfig.cols;
    const rows = doc.laneConfig.rows;
    // グラフ構築（ループ除外）
    const adjList = new Map();
    for (const node of doc.nodes) {
        adjList.set(node.id, []);
    }
    for (const edge of doc.edges) {
        if (edge.kind === "loop")
            continue;
        const targets = adjList.get(edge.source) ?? [];
        targets.push(edge.target);
        adjList.set(edge.source, targets);
    }
    // トポロジカルソート（Kahn のアルゴリズム）
    const inDegree = new Map();
    for (const node of doc.nodes) {
        inDegree.set(node.id, 0);
    }
    for (const [, targets] of adjList) {
        for (const target of targets) {
            inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
        }
    }
    const queue = [];
    for (const node of doc.nodes) {
        if ((inDegree.get(node.id) ?? 0) === 0) {
            queue.push(node.id);
        }
    }
    const sorted = [];
    while (queue.length > 0) {
        const nodeId = queue.shift();
        sorted.push(nodeId);
        const targets = adjList.get(nodeId) ?? [];
        for (const target of targets) {
            inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
            if ((inDegree.get(target) ?? 0) === 0) {
                queue.push(target);
            }
        }
    }
    // 層別レイアウト（各ノードを列に割り当て）
    const layers = new Map();
    for (const nodeId of sorted) {
        let maxLevel = 0;
        const sourceIds = doc.edges
            .filter((e) => e.target === nodeId && e.kind !== "loop")
            .map((e) => e.source);
        for (const sourceId of sourceIds) {
            maxLevel = Math.max(maxLevel, layers.get(sourceId) ?? 0);
        }
        layers.set(nodeId, maxLevel + 1);
    }
    // 列・行に配置
    const maxLayer = Math.max(...Array.from(layers.values()), 0);
    const colIndex = Math.min(maxLayer, cols.length - 1);
    const rowAssignments = new Map(); // col -> row list
    for (let col = 0; col <= colIndex; col++) {
        rowAssignments.set(col, []);
    }
    for (const nodeId of sorted) {
        const layer = layers.get(nodeId) ?? 0;
        const col = Math.min(layer, cols.length - 1);
        const rowList = rowAssignments.get(col) ?? [];
        const row = Math.min(rowList.length, rows.length - 1);
        rowList.push(row);
        rowAssignments.set(col, rowList);
    }
    // ノードを更新
    const newDoc = structuredClone(doc);
    for (const nodeId of sorted) {
        const layer = layers.get(nodeId) ?? 0;
        const col = Math.min(layer, cols.length - 1);
        const rowList = rowAssignments.get(col) ?? [];
        const row = rowList.indexOf(rowList.length - 1); // 簡略化
        const node = newDoc.nodes.find((n) => n.id === nodeId);
        if (node) {
            node.lane = { row, col };
            // position も更新（表示用）
            node.position = {
                x: col * designTokens.cellMinWidth,
                y: row * designTokens.cellMinHeight,
            };
        }
    }
    return newDoc;
}
/**
 * 自由配置用：簡単な層別レイアウト（DAG 向け）
 * ループは同層扱いで背面にルーティング
 */
export function autoLayoutFree(doc) {
    // グラフ構築
    const adjList = new Map();
    for (const node of doc.nodes) {
        adjList.set(node.id, []);
    }
    for (const edge of doc.edges) {
        if (edge.kind === "loop")
            continue;
        const targets = adjList.get(edge.source) ?? [];
        targets.push(edge.target);
        adjList.set(edge.source, targets);
    }
    // トポロジカルソート
    const inDegree = new Map();
    for (const node of doc.nodes) {
        inDegree.set(node.id, 0);
    }
    for (const [, targets] of adjList) {
        for (const target of targets) {
            inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
        }
    }
    const queue = [];
    for (const node of doc.nodes) {
        if ((inDegree.get(node.id) ?? 0) === 0) {
            queue.push(node.id);
        }
    }
    const sorted = [];
    while (queue.length > 0) {
        const nodeId = queue.shift();
        sorted.push(nodeId);
        const targets = adjList.get(nodeId) ?? [];
        for (const target of targets) {
            inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
            if ((inDegree.get(target) ?? 0) === 0) {
                queue.push(target);
            }
        }
    }
    // 層別レイアウト（x 座標）
    const layers = new Map();
    for (const nodeId of sorted) {
        let maxLevel = 0;
        const sourceIds = doc.edges
            .filter((e) => e.target === nodeId && e.kind !== "loop")
            .map((e) => e.source);
        for (const sourceId of sourceIds) {
            maxLevel = Math.max(maxLevel, layers.get(sourceId) ?? 0);
        }
        layers.set(nodeId, maxLevel + 1);
    }
    // y 座標は同層内で適当に分散
    const layerNodes = new Map();
    for (const nodeId of sorted) {
        const layer = layers.get(nodeId) ?? 0;
        const nodes = layerNodes.get(layer) ?? [];
        nodes.push(nodeId);
        layerNodes.set(layer, nodes);
    }
    const newDoc = structuredClone(doc);
    for (const [layer, nodeIds] of layerNodes) {
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeId = nodeIds[i];
            const node = newDoc.nodes.find((n) => n.id === nodeId);
            if (node) {
                node.position = {
                    x: layer * 300,
                    y: i * 150,
                };
            }
        }
    }
    return newDoc;
}
/**
 * 指定モードに応じた自動整列
 */
export function autoLayout(doc) {
    if (doc.mode === "roadmap") {
        return autoLayoutRoadmap(doc);
    }
    else {
        return autoLayoutFree(doc);
    }
}
