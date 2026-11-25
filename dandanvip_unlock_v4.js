/**
 * 蛋蛋不语 VIP 解锁 — v4.0.0 最终版
 *
 * 抓包确认的真实响应：
 *   {"id":"...","vip_status":false,"vip_expire_at":null,"vip_level":0,...}
 *   → 有效字段仅 vip_status / vip_level / vip_expire_at
 *
 * 真实路径：https://supabase.opengl.top//rest/v1/profiles  （注意 // 双斜杠）
 * 平台：Quantumult X / Loon / Surge
 */

var VERSION = "4.0.0";
var FUTURE = "2099-12-31T23:59:59.999999+00:00";

var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;

function getPlatform() {
  if (isQX) return "Quantumult X";
  if (isLoon) return "Loon";
  if (isSurge) return "Surge";
  return "Unknown";
}

console.log("dandanvip v" + VERSION + " | " + getPlatform());

// profiles 表：抓包确认的三个真实字段（主）
var VIP_FIELDS = {
  vip_status: true,
  vip_level: 3,
  vip_expire_at: FUTURE
};
// 冗余兼容字段（其他版本可能用这些名，app 会忽略多余的）
VIP_FIELDS.expire_at = FUTURE;
VIP_FIELDS.is_vip = true;
VIP_FIELDS.new_expire_at = FUTURE;
VIP_FIELDS.old_expire_at = FUTURE;

// config 表全局开关
var CONFIG_FIELDS = { vip_public_enabled: true };

function applyFields(obj, fields) {
  if (!obj || typeof obj !== "object") return;
  for (var k in fields) obj[k] = fields[k];
}

function patchBody(data, fields) {
  if (data === null || typeof data !== "object") return;
  if (Array.isArray(data)) {
    for (var i = 0; i < data.length; i++) applyFields(data[i], fields);
    return;
  }
  applyFields(data, fields);
  var wrappers = ["data", "result", "records", "items"];
  for (var w = 0; w < wrappers.length; w++) {
    var child = data[wrappers[w]];
    if (child && typeof child === "object") patchBody(child, fields);
  }
}

var url = ($request && $request.url) || "";
var raw = ($response && $response.body) || "";
var isConfig = url.indexOf("/config") >= 0;

if (!raw) {
  $done({});
} else {
  var data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    try { data = JSON.parse(JSON.parse(raw)); } catch (e2) { data = null; }
  }
  if (data === null || typeof data !== "object") {
    $done({});
  } else {
    patchBody(data, isConfig ? CONFIG_FIELDS : VIP_FIELDS);
    console.log("URL    : " + url);
    console.log("Status : ok " + (isConfig ? "config" : "VIP") + " patched");
    $done({ body: JSON.stringify(data) });
  }
}
