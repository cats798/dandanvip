/**
 * 蛋蛋不语 VIP 解锁 — v2.0.0
 * 适配 1.0.2 新版（2026-11-25）
 *
 * 变更点：
 *  1. 主 Supabase 端点从 http://38.76.202.248:8000/ 换为 https://supabase.opengl.top/
 *  2. VIP 判定新增服务端 RPC get_my_vip_access（VipAccessDecision）
 *  3. 同时覆盖 profiles 表与 RPC 决策响应
 *
 * 平台：Quantumult X / Loon / Surge
 */

var VERSION = "2.0.0";
var FUTURE = "2099-12-31T23:59:59.999999+00:00";

// ========== 三端适配层 ==========
var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;

var $http = {
  fetch: function (opts) {
    if (isQX) return $task.fetch(opts);
    return new Promise(function (resolve, reject) {
      var method = (opts.method || "GET").toUpperCase();
      var handler = function (err, resp, data) {
        if (err) reject(err);
        else resolve({ statusCode: resp.statusCode, headers: resp.headers, body: data });
      };
      if (method === "POST") $httpClient.post(opts, handler);
      else $httpClient.get(opts, handler);
    });
  }
};

var $store = {
  read: function (key) { return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
  write: function (val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); }
};

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

// ========== Logger ==========
var Logger = {
  line: function (label, value) {
    var pad = "              ";
    console.log((label + pad).substring(0, 14) + ": " + value);
  },
  status: function (icon, text) { this.line("Status", icon + " " + text); },
  sep: function () { console.log("------------------------------------"); }
};

// ========== 补丁字段 ==========
// profiles 表字段（旧版插件 relied on these）
var PROFILE_PATCH = {
  vip_status: true,
  vip_level: 3,
  vip_expire_at: FUTURE,
  expire_at: FUTURE,
  username: "TG@Curtinp118",
  avatar_url: "https://i.ibb.co/NgghpGgn/11zon-A9-CBAC35-2-CA3-4-E7-F-923-D-7304-EEB40635.webp"
};

// 新版 get_my_vip_access 裁决字段（VipAccessDecision）
// 字段名来自 App.framework/App 静态符号：is_vip / allowed / reason /
// new_expire_at / old_expire_at / expire_at / VipAccessDecision / allowVipAccess
var DECISION_PATCH = {
  is_vip: true,
  allowed: true,
  granted: true,
  vip_status: true,
  vip_level: 3,
  expire_at: FUTURE,
  new_expire_at: FUTURE,
  old_expire_at: FUTURE,
  vip_expire_at: FUTURE,
  reason: "ok"
};

// 不触碰 vip_only / vip_public_enabled —— 那些是内容标记和管理员开关，不是用户权益
var ALL_PATCH = {};
var k;
for (k in PROFILE_PATCH) ALL_PATCH[k] = PROFILE_PATCH[k];
for (k in DECISION_PATCH) ALL_PATCH[k] = DECISION_PATCH[k];

var PROFILE_KEYS = /^(id|user_id|username|avatar_url|vip_status|vip_level|vip_expire_at)$/;
var DECISION_KEYS = /^(is_vip|allowed|granted|reason|expire_at|new_expire_at|old_expire_at|vip_access|VipAccessDecision)$/;
var WRAPPER_KEYS = ["data", "result", "profile", "user", "item", "records"];

// ========== 递归 patch ==========
function patchObject(obj, depth) {
  if (!obj || typeof obj !== "object" || depth > 4) return obj;

  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) obj[i] = patchObject(obj[i], depth + 1);
    return obj;
  }

  var keys = Object.keys(obj);
  var hitProfile = false;
  var hitDecision = false;
  for (var j = 0; j < keys.length; j++) {
    if (PROFILE_KEYS.test(keys[j])) hitProfile = true;
    if (DECISION_KEYS.test(keys[j])) hitDecision = true;
  }

  // 规则只匹配 profiles / get_my_vip_access 路径，顶层直接改；
  // 内层按字段特征识别，避免污染无关对象
  if (depth === 0 || hitProfile || hitDecision) {
    for (var p in ALL_PATCH) obj[p] = ALL_PATCH[p];
  }

  for (var w = 0; w < WRAPPER_KEYS.length; w++) {
    var wk = WRAPPER_KEYS[w];
    if (obj[wk] && typeof obj[wk] === "object") obj[wk] = patchObject(obj[wk], depth + 1);
  }
  return obj;
}

function done(body) {
  $done({ body: typeof body === "string" ? body : JSON.stringify(body) });
}

// ========== 主流程 ==========
function run() {
  console.log("🚀 dandanvip v" + VERSION + " | " + getPlatform());

  var reqUrl = ($request && $request.url) ? $request.url : "";
  var raw = ($response && $response.body) ? $response.body : "";
  Logger.line("Request", reqUrl || "(none)");

  if (!raw) {
    Logger.status("❌", "Empty response body");
    return done("");
  }

  var data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    // 有些接口把 JSON 再包成字符串，尝试二次解析
    try { data = JSON.parse(JSON.parse(raw)); } catch (e2) { data = null; }
  }

  if (data === null || typeof data !== "object") {
    Logger.status("❌", "Not a JSON object, passthrough");
    return done(raw);
  }

  var before = reqUrl.indexOf("get_my_vip_access") >= 0 ? "rpc-decision" : "profiles";
  patchObject(data, 0);

  Logger.status("✅", "VIP unlocked (" + before + ")");
  Logger.line("Fields", "vip_status / is_vip / allowed / expire_at");
  Logger.sep();
  done(data);
}

try {
  run();
} catch (e) {
  console.log("fatal:", e);
  done(($response && $response.body) || "");
}
