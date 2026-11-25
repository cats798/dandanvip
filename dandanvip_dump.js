/**
 * 蛋蛋不语 - 请求抓取诊断脚本
 * 作用：把所有 Supabase 相关请求的地址/请求体/响应体打到 Loon 日志
 * 不修改任何数据，纯粹记录
 */
var url = ($request && $request.url) || "(no url)";
var method = ($request && $request.method) || "GET";
var reqBody = ($request && $request.body) || "(none)";
var respBody = ($response && $response.body) || "(empty)";

console.log("========== DANBO DUMP ==========");
console.log("METHOD : " + method);
console.log("URL    : " + url);
if (reqBody !== "(none)") console.log("REQBODY: " + reqBody);
console.log("RESP   : " + respBody);
console.log("================================");

$done({});
