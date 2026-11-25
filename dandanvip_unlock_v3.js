/**
 * 蛋蛋不语 VIP 解锁 — v3.0.0
 * 适配抓包确认的真实路径：https://supabase.opengl.top//rest/v1/profiles
 *
 * 变更：
 *  - 正则兼容双斜杠 //rest/v1/
 *  - 去掉未实际调用的 get_my_vip_access RPC 假设
 *  - 直接打 profiles 响应（抓包确认这是 VIP 数据来源）
 *  - 顺带把 config 的 vip_public_enabled 打开
 *
 * 平台：Quantumult X / Loon / Surge
 */

var VERSION = "3.0.0";
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

var Logger = {
  line: function (label, value) {
    var pad = "              ";
    console.log((label + pad).substring(0, 14) + ": " + value);
  },
  status: function (icon, text) { this.line("Status", icon + " " + text); },
  sep: function () { console.log("------------------------------------"); }
};

// 用户权益字段（profiles 表）
var VIP_FIELDS = {
  vip_status: true,
  vip_level: 3,
  vip_expire_at: FUTURE,
  expire_at: FUTURE,
  is_vip: true,
  allowed: true,
  granted: true,
  new_expire_at: FUTURE,
  old_expire_at: FUTURE,
  username: "TG@Curtinp118",
  avatar_url: "https://i.ibb.co/NgghpGgn/11zon-A9-CBAC35-2-CA3-4-E7-F-923-D-7304-EEB40635.webp"
};

// config 表：把 VIP 公开开关打开
var CONFIG_FIELDS = {
  vip_public_enabled: true
};

function applyFields(obj, fields) {
  if (!obj || typeof obj !== "object") return;
  for (var k in fields) obj[k] = fields[k];
}

function patchBody(data, isConfig) {
  if (data === null || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (var i = 0; i < data.length; i++) {
      applyFields(data[i], isConfig ? CONFIG_FIELDS : VIP_FIELDS);
    }
    return;
  }

  applyFields(data, isConfig ? CONFIG_FIELDS : VIP_FIELDS);

  // 兼容嵌套 wrapper
  var wrappers = ["data", "result", "records", "items"];
  for (var w = 0; w < wrappers.length; w++) {
    var child = data[wrappers[w]];
    if (child && typeof child === "object") patchBody(child, isConfig);
  }
}

function done(body) {
  $done({ body: typeof body === "string" ? body : JSON.stringify(body) });
}

function run() {
  console.log("dandanvip v" + VERSION + " | " + getPlatform());

  var url = ($request && $request.url) || "";
  var raw = ($response && $response.body) || "";
  Logger.line("URL", url);

  if (!raw) {
    Logger.status("skip", "empty body");
    return done("");
  }

  var isConfig = url.indexOf("/config") >= 0;
  var data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    try { data = JSON.parse(JSON.parse(raw)); } catch (e2) { data = null; }
  }

  if (data === null || typeof data !== "object") {
    Logger.status("skip", "not JSON object");
    return done(raw);
  }

  patchBody(data, isConfig);
  Logger.status("ok", isConfig ? "config patched" : "VIP patched");
  Logger.sep();
  done(data);
}

try {
  run();
} catch (e) {
  console.log("fatal:", e);
  done(($response && $response.body) || "");
}
