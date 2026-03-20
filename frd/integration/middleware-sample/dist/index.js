"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const upload = (0, multer_1.default)({ dest: "./uploads" });
const app = (0, express_1.default)();
app.use(express_1.default.json());
const KINTONE_BASE = process.env.KINTONE_BASE_URL || "https://{your-domain}.cybozu.com";
const KINTONE_API_TOKEN = process.env.KINTONE_API_TOKEN || "";
const DATA_DIR = path_1.default.resolve(process.cwd(), "data");
const MAPPING_FILE = path_1.default.join(DATA_DIR, "mapping.json");
if (!fs_1.default.existsSync(DATA_DIR))
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
if (!fs_1.default.existsSync(MAPPING_FILE))
    fs_1.default.writeFileSync(MAPPING_FILE, JSON.stringify({}), "utf-8");
function readJsonFile(filePath) {
    const raw = fs_1.default.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
}
function loadMapping() {
    try {
        const raw = fs_1.default.readFileSync(MAPPING_FILE, "utf-8");
        return JSON.parse(raw);
    }
    catch (e) {
        return {};
    }
}
function saveMapping(map) {
    fs_1.default.writeFileSync(MAPPING_FILE, JSON.stringify(map, null, 2), "utf-8");
}
async function postWithRetry(url, body, headers, maxAttempts = 3) {
    let attempt = 0;
    let lastErr = null;
    while (attempt < maxAttempts) {
        try {
            const res = await axios_1.default.post(url, body, { headers });
            return res.data;
        }
        catch (err) {
            lastErr = err;
            attempt++;
            const delay = Math.pow(2, attempt) * 200;
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}
function extractBearerToken(req) {
    const auth = req.headers?.authorization || req.headers?.Authorization || "";
    if (!auth)
        return undefined;
    const m = String(auth).match(/Bearer\s+(.+)/i);
    return m ? m[1] : undefined;
}
async function createRecord(appId, record, dryRun = false, bearerToken) {
    if (dryRun)
        return { dryRun: true };
    const url = `${KINTONE_BASE}/k/v1/record.json`;
    const headers = { "Content-Type": "application/json" };
    if (bearerToken) {
        headers["Authorization"] = `Bearer ${bearerToken}`;
    }
    else if (KINTONE_API_TOKEN) {
        headers["X-Cybozu-API-Token"] = KINTONE_API_TOKEN;
    }
    else {
        throw new Error("No authentication available for kintone API (set API token or provide Bearer token)");
    }
    return await postWithRetry(url, { app: appId, record }, headers);
}
// Basic mapping function using the CSV mapping template expectations.
function mapFlowToRecord(flow) {
    return {
        flow_id: { value: flow.id },
        title: { value: flow.meta?.title || flow.id },
        description: { value: flow.meta?.description || "" },
        version: { value: flow.meta?.version || "" },
        targetSLAmin: { value: flow.meta?.targetSLAmin || null },
    };
}
function mapBlockToRecord(block, flowId) {
    return {
        block_id: { value: block.id },
        type: { value: block.type },
        name: { value: block.meta?.name || block.id },
        x: { value: block.position?.x ?? 0 },
        y: { value: block.position?.y ?? 0 },
        meta: { value: JSON.stringify(block.meta || {}) },
        flow_id: { value: flowId },
    };
}
function mapEdgeToRecord(edge, flowId) {
    return {
        edge_id: { value: edge.id },
        from: { value: edge.from },
        to: { value: edge.to },
        label: { value: edge.label || "" },
        flow_id: { value: flowId },
    };
}
app.post("/import", upload.single("file"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "file is required" });
        const p = path_1.default.resolve(req.file.path);
        const body = readJsonFile(p);
        const flow = body.flow;
        const blocks = body.blocks || [];
        const edges = body.edges || [];
        const iterations = body.iterations || [];
        // Application IDs - replace or pass via query
        const flowsAppId = Number(req.query.flowsAppId || process.env.KINTONE_APP_FLOWS || 100);
        const blocksAppId = Number(req.query.blocksAppId || process.env.KINTONE_APP_BLOCKS || 101);
        const edgesAppId = Number(req.query.edgesAppId || process.env.KINTONE_APP_EDGES || 102);
        const iterationsAppId = Number(req.query.iterationsAppId || process.env.KINTONE_APP_ITERATIONS || 103);
        const dryRun = String(req.query.dryRun) === "true";
        const mapping = loadMapping();
        let bearerToken = extractBearerToken(req);
        // If no bearer provided, allow specifying userId to use stored OAuth tokens (auto-refresh if expired)
        if (!bearerToken) {
            const userId = String(req.query.userId || "");
            if (userId) {
                try {
                    const tokenInfo = (mapping.oauthTokens || {})[userId];
                    if (!tokenInfo)
                        throw new Error("no token info for user");
                    if (!tokenInfo.accessToken || (tokenInfo.expiresAt && Date.now() > tokenInfo.expiresAt - 5000)) {
                        // refresh if expired or missing
                        bearerToken = await refreshTokenForUser(userId);
                    }
                    else {
                        bearerToken = tokenInfo.accessToken;
                    }
                }
                catch (e) {
                    console.warn(`token load/refresh failed for user ${userId}:`, e?.message || String(e));
                }
            }
        }
        // Create Flow record
        const flowRecord = mapFlowToRecord(flow);
        const flowResp = await createRecord(flowsAppId, flowRecord, dryRun, bearerToken);
        const createdFlowId = flowResp?.id || null;
        if (!dryRun)
            mapping[`flow:${flow.id}`] = { kintoneId: createdFlowId };
        // Create Blocks
        for (const b of blocks) {
            const rec = mapBlockToRecord(b, flow.id);
            const r = await createRecord(blocksAppId, rec, dryRun, bearerToken);
            if (!dryRun)
                mapping[`block:${b.id}`] = { kintoneId: r?.id };
        }
        // Create Edges
        for (const e of edges) {
            const rec = mapEdgeToRecord(e, flow.id);
            const r = await createRecord(edgesAppId, rec, dryRun, bearerToken);
            if (!dryRun)
                mapping[`edge:${e.id}`] = { kintoneId: r?.id };
        }
        // Create Iterations
        for (const it of iterations) {
            const rec = {
                iteration_id: { value: it.id },
                createdAt: { value: it.createdAt },
                note: { value: it.note || "" },
                snapshot: { value: JSON.stringify(it.snapshot || {}) },
                flow_id: { value: flow.id },
            };
            const r = await createRecord(iterationsAppId, rec, dryRun, bearerToken);
            if (!dryRun)
                mapping[`iteration:${it.id}`] = { kintoneId: r?.id };
        }
        // Persist mapping
        if (!dryRun)
            saveMapping(mapping);
        // Cleanup uploaded file
        try {
            fs_1.default.unlinkSync(p);
        }
        catch { }
        res.json({ success: true, flowId: flow.id, dryRun });
    }
    catch (err) {
        console.error(err?.response?.data || err.message || err);
        res.status(500).json({ error: err?.response?.data || err.message || String(err) });
    }
});
// --- OAuth / token management endpoints ---
app.post("/auth/token", (req, res) => {
    try {
        const { userId, accessToken, refreshToken, expiresAt } = req.body || {};
        if (!userId || !accessToken)
            return res.status(400).json({ error: "userId and accessToken required" });
        const map = loadMapping();
        map.oauthTokens = map.oauthTokens || {};
        map.oauthTokens[userId] = { accessToken, refreshToken, expiresAt };
        saveMapping(map);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
app.get("/auth/token", (req, res) => {
    const userId = String(req.query.userId || "");
    if (!userId)
        return res.status(400).json({ error: "userId query required" });
    const map = loadMapping();
    res.json((map.oauthTokens || {})[userId] || null);
});
app.post("/auth/exchange", async (req, res) => {
    try {
        const { userId, code, tokenUrl, clientId, clientSecret, redirectUri } = req.body || {};
        if (!userId || !code)
            return res.status(400).json({ error: "userId and code required" });
        const tokenEndpoint = tokenUrl || process.env.KINTONE_OAUTH_TOKEN_URL;
        const cid = clientId || process.env.KINTONE_OAUTH_CLIENT_ID;
        const csec = clientSecret || process.env.KINTONE_OAUTH_CLIENT_SECRET;
        const ruri = redirectUri || process.env.KINTONE_OAUTH_REDIRECT_URI;
        if (!tokenEndpoint || !cid || !csec || !ruri)
            return res.status(400).json({ error: "OAuth config missing (tokenUrl/clientId/clientSecret/redirectUri)" });
        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", ruri);
        params.append("client_id", cid);
        params.append("client_secret", csec);
        const resp = await axios_1.default.post(tokenEndpoint, params.toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        const tokenBody = resp.data;
        const map = loadMapping();
        map.oauthTokens = map.oauthTokens || {};
        map.oauthTokens[userId] = {
            accessToken: tokenBody.access_token,
            refreshToken: tokenBody.refresh_token,
            expiresAt: tokenBody.expires_in ? Date.now() + tokenBody.expires_in * 1000 : null,
        };
        saveMapping(map);
        res.json({ success: true, token: map.oauthTokens[userId] });
    }
    catch (e) {
        res.status(500).json({ error: e?.response?.data || e.message || String(e) });
    }
});
async function refreshTokenForUser(userId) {
    const map = loadMapping();
    const tokens = (map.oauthTokens || {})[userId];
    if (!tokens || !tokens.refreshToken)
        throw new Error("no refresh token stored for user");
    const tokenEndpoint = process.env.KINTONE_OAUTH_TOKEN_URL || tokens.tokenUrl || undefined;
    const clientId = process.env.KINTONE_OAUTH_CLIENT_ID || tokens.clientId || undefined;
    const clientSecret = process.env.KINTONE_OAUTH_CLIENT_SECRET || tokens.clientSecret || undefined;
    const rToken = tokens.refreshToken;
    if (!tokenEndpoint || !clientId || !clientSecret)
        throw new Error("OAuth config missing for refresh");
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", rToken);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    const resp = await axios_1.default.post(tokenEndpoint, params.toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    const body = resp.data;
    map.oauthTokens = map.oauthTokens || {};
    map.oauthTokens[userId] = map.oauthTokens[userId] || {};
    map.oauthTokens[userId].accessToken = body.access_token;
    if (body.refresh_token)
        map.oauthTokens[userId].refreshToken = body.refresh_token;
    map.oauthTokens[userId].expiresAt = body.expires_in ? Date.now() + body.expires_in * 1000 : null;
    saveMapping(map);
    return body.access_token;
}
app.post("/auth/refresh", async (req, res) => {
    try {
        const userId = String(req.body?.userId || req.query?.userId || "");
        if (!userId)
            return res.status(400).json({ error: "userId required" });
        const token = await refreshTokenForUser(userId);
        res.json({ success: true, accessToken: token });
    }
    catch (e) {
        res.status(500).json({ error: e?.response?.data || e.message || String(e) });
    }
});
app.get("/mapping", (req, res) => {
    const map = loadMapping();
    res.json(map);
});
app.post("/clear-mapping", (req, res) => {
    saveMapping({});
    res.json({ success: true });
});
const port = Number(process.env.PORT || 3210);
app.listen(port, () => {
    console.log(`Middleware sample listening on http://localhost:${port}`);
});
