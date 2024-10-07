/**
 * cron: 1 1 1 1 1
 * 默认助力ck变量:ownCookie
 * 助力id变量:ownShareId, 只可助力, 无进度、现金等
 * 如果都填写，默认助力ownCookie
 */

const $ = new Env('饿了么天天抽奖');

const {
    checkCk,
    getCookies,
    getUserInfo,
} = require("./common.js");
const request = require("request");
const md5 = require("md5");
const https = require('https');
const cheerio = require('cheerio');
async function getCoordinates() {
    return new Promise((resolve, reject) => {
        https.get('https://zh-hans.ipshu.com/my_info', (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                const $ = cheerio.load(data);
                const ipInfo = $('.widget_box.p-xs.small');
                const latitude = ipInfo.find('li').eq(4).text().trim().split(':')[1];
                const longitude = ipInfo.find('li').eq(5).text().trim().split(':')[1];
                resolve({
                    latitude,
                    longitude
                });
            });
        });
    });
}
function getToken(cookieString) {
    if (!cookieString) {
        return '-1';
    }
    for (var cookiePairs = cookieString.split(';'), i = 0; i < cookiePairs.length; i++) {
        var keyValue = cookiePairs[i].split('=');
        if (["_m_h5_tk"].includes(keyValue[0].trim())) {
            return keyValue[1];
        }
    }
    return '-1';
}
const wait = t => {
  return new Promise(e => {
    setTimeout(() => {
      e();
    }, t * 1000);
  });
};
async function tryCatchPromise(executeFunction) {
  return new Promise((resolve) => {
    try {
      executeFunction(resolve);
    } catch (error) {
      console.log("网络异常，跳过");
      resolve();
    }
  });
}
async function commonRequest(cookie, asac, params) {
    const headers = {
        "authority": "shopping.ele.me",
        "accept": "application/json",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        "cookie": cookie,
        "x-miniapp-id-taobao": "2021002148648263",
        "x-miniapp-version": "3.20230627.141210",
        "appid": "2021002148648263"
    };
    const timestamp = new Date().getTime();
    const appKey = 12574478;
    const body = "data=" + encodeURIComponent(JSON.stringify(params));
    const token = getToken(cookie);
    const miniappId = token.split('_')[0];
    const sign = md5(miniappId + '&' + timestamp + '&' + appKey + '&' + JSON.stringify(params));
    const requestOptions = {
        "url": "https://guide-acs.m.taobao.com/h5/mtop.alsc.growth.tangram.gateway/1.0/?jsv=2.6.1&appKey=12574478&asac=" + asac + "&ttid=1601274958480%40eleme_android_10.14.3&t=" + timestamp + "&sign=" + sign + "&api=mtop.alsc.growth.tangram.gateway",
        "method": "POST",
        "headers": headers,
        "body": body
    };
    return tryCatchPromise(callback => {
        request(requestOptions, async(error, response, body) => {
            
            if (!error && response.statusCode == 200) {
                try {
                    const parsedBody = JSON.parse(body);
                    callback(parsedBody);
                } catch (parseError) {
                    console.log(parseError);
                    callback(null);
                }
            } else {
                callback(null);
            }
        });
    });
}
function processUrl(url) {
    const paramMap = new Map();
    const queryString = url.split('?')[1].split('&');
    for (let i = 0; i < queryString.length; i++) {
        const [key, value] = queryString[i].split('=');
        paramMap.set(key, value);
    }
    return paramMap;
}
async function getShareId(cookie, longitude, latitude) {
    cookie = await checkCk(cookie, -1);
    
    if (!cookie) {
        console.log("需要助力的账号失效！请重新登录！！！");
        process.exit(0);
    }
    let shareId;
    const apiParams = {
        "api": "fissionDrawShare",
        "asac": "2A22C21KPW8PSOH8QMD4LM",
        "bizScene": "growth_fission_coupon",
        "instance": "INNER",
        "params": "{\"latitude\":\"" + latitude + "\",\"longitude\":\"" + longitude + "\",\"cityId\":\"\"}",
        "scene": "fissionDraw001"
    };
    const result = await commonRequest(cookie, "2A22C21KPW8PSOH8QMD4LM", apiParams);
    if (result.data && result.data.result) {
        const resultData = result.data.result;
        shareId = processUrl(resultData.url).get("shareId");
        console.log("获取到的助力 id 为", shareId);
        return shareId;
    } else {
        console.log("获取到助力 id 失败，程序退出");
        process.exit(0);
    }
}
async function jindu(cookie, shareId, longitude, latitude) {
    try {
        cookie = await checkCk(cookie, -1);
        const apiParams = {
            "api": "fissionDrawHomePage",
            "asac": "2A22C216PW8PSO7H6J9G63",
            "bizScene": "growth_fission_coupon",
            "instance": "INNER",
            "params": "{\"latitude\":\"" + latitude + "\",\"longitude\":\"" + longitude + "\",\"cityId\":\"\",\"shareId\":\"" + shareId + "\"}",
            "scene": "fissionDraw001"
        };
        const result = await commonRequest(cookie, "2A22C216PW8PSO7H6J9G63", apiParams);
        if (result.data && result.data.result) {
            const fixedPrize = result.data.result.fixedPrize;
            console.log(fixedPrize.title, fixedPrize.reduction, fixedPrize.threshold, "当前进度：" + fixedPrize.amount);
            if (Number(fixedPrize.amount) >= Number(fixedPrize.maxAmount)) {
                console.log("🎉🎉 任务完成，已获得", fixedPrize.reduction, fixedPrize.threshold);
                process.exit(0);
            }
        }
    } catch (error) {
        console.log("未获取到进度信息,请确认已手动开启天天抽奖");
    }
}
async function fridensHelper(masterCookie, ownCookie, shareId, longitude, latitude) {
    try {
        ownCookie = await checkCk(ownCookie, -1);
        const apiParams = {
            "api": "support",
            "bizScene": "growth_fission_coupon",
            "instance": "INNER",
            "params": "{\"latitude\":\"" + latitude + "\",\"longitude\":\"" + longitude + "\",\"cityId\":\"\",\"shareId\":\"" + shareId + "\"}",
            "scene": "fissionDraw001"
        };
        const result = await commonRequest(masterCookie, "2A22C21RPW8PSOJ9OFOQGY", apiParams);
        if (result.data && result.data.result) {
            const drawRes = result.data.result;
            console.log(drawRes.title + '：' + drawRes.subTitle);
            if (drawRes.title.indexOf("无法助力") !== -1) {
                console.log("防止黑号延时3秒");
                await wait(3);
            } else if (drawRes.title.indexOf("谢谢你为我助力") !== -1) {
                const drawActionParams = {
                    "api": "drawAction",
                    "asac": "2A22C21FPW8PSO7U202V54",
                    "bizScene": "growth_fission_coupon",
                    "instance": "INNER",
                    "params": "{\"latitude\":\"" + latitude + "\",\"longitude\":\"" + longitude + "\",\"cityId\":\"\"}",
                    "scene": "fissionDraw001"
                };
                const drawActionResult = await commonRequest(ownCookie, "2A22C21FPW8PSO7U202V54", drawActionParams);
                if (drawActionResult.data && drawActionResult.data.result) {
                    const popWindow = drawActionResult.data.result.popWindow;
                    const amount = popWindow.content[0].amount;
                    console.log(popWindow.title + '：' + amount);
                    if (drawActionResult.data.success) {
                        const withdrawParams = {
                            "api": "withdrawAction",
                            "bizScene": "growth_fission_coupon",
                            "instance": "INNER",
                            "params": "{\"latitude\":\"" + latitude + "\",\"longitude\":\"" + longitude + "\",\"cityId\":\"\",\"amount\":\"" + amount + "\"}",
                            "scene": "fissionDraw001"
                        };
                        const withdrawResult = await commonRequest(ownCookie, '', withdrawParams);  
                        if (withdrawResult.data && withdrawResult.data.result) {
                            const withdrawPopWindow = withdrawResult.data.result.popWindow;
                            if (withdrawPopWindow.subTitle && !withdrawPopWindow.content) {
                                console.log(withdrawPopWindow.title);
                                console.log(withdrawPopWindow.subTitle);
                                await jindu(ownCookie, shareId, longitude, latitude);
                                return 0;
                            } else {
                                console.log(withdrawPopWindow.title + "：金额", withdrawPopWindow.content[0].amount);
                                console.log(withdrawPopWindow.content[0].step2);
                                await jindu(ownCookie, shareId, longitude, latitude);
                                return withdrawPopWindow.content[0].amount;
                            }
                        } else {
                            console.log("提现：" + withdrawResult.ret[0]);
                        }
                    } else {
                        console.log("抽奖：" + drawActionResult.ret[0]);
                    }
                } else {
                    console.log("抽奖：" + drawActionResult.ret[0]);
                }
                console.log("防止黑号延时5秒");
                await wait(5);
            }
        } else {
            console.log("助力：" + drawRes.ret[0]);
        }
    } catch (error) {}
}
//ownShareId模式助力
async function ownShareIdfridensHelper(masterCookie, shareId, longitude, latitude) {
    try {
        const apiParams = {
            "api": "support",
            "bizScene": "growth_fission_coupon",
            "instance": "INNER",
            "params": "{\"latitude\":\"" + latitude + "\",\"longitude\":\"" + longitude + "\",\"cityId\":\"\",\"shareId\":\"" + shareId + "\"}",
            "scene": "fissionDraw001"
        };
        const result = await commonRequest(masterCookie, "2A22C21RPW8PSOJ9OFOQGY", apiParams);
        if (result.data && result.data.result) {
            const drawRes = result.data.result;
            console.log(drawRes.title + '：' + drawRes.subTitle);
            if (drawRes.title.indexOf("无法助力") !== -1) {
                console.log("防止黑号延时3秒");
                await wait(3);
            } else if (drawRes.title.indexOf("谢谢你为我助力") !== -1) {
                console.log("防止黑号延时5秒");
                await wait(5);
            }
        } else {
            console.log("助力：" + drawRes.ret[0]);
        }
    } catch (error) {}
}
async function start() {
    const ownCookie = process.env.ownCookie;
    const ownShareId = process.env.ownShareId;
    if (!ownCookie) {
        console.log("ShareId 模式");
        if (!ownShareId) {
        console.log("未设置需助力的 ShareId，程序结束!");
        process.exit(0);
        } else {
            //ownShareId模式
            const CookieEles = getCookies();
            const result = await getCoordinates();
            const shareId = ownShareId;
            for (let i = 0; i < CookieEles.length; i++) {
                let masterCookie = CookieEles[i];
                masterCookie = await checkCk(masterCookie, i);
                if (!masterCookie) {
                    continue;
                }
                let userInfo = await getUserInfo(masterCookie);
                if (!userInfo.username) {
                    console.log('第', i + 1, "账号失效！请重新登录！！！😭");
                    continue;
                }
                await ownShareIdfridensHelper(masterCookie, shareId, result.longitude, result.latitude);
            }
            process.exit(0);
        }
    } else {
        //ownCookie模式
        const CookieEles = getCookies();
        const result = await getCoordinates();
        const shareId = await getShareId(ownCookie, result.longitude, result.latitude);
        let zje = 0;
        await jindu(ownCookie, shareId, result.longitude, result.latitude);
        for (let i = 0; i < CookieEles.length; i++) {
            let masterCookie = CookieEles[i];
            masterCookie = await checkCk(masterCookie, i);
            if (!masterCookie) {
                continue;
            }
            let userInfo = await getUserInfo(masterCookie);
            //console.log(userInfo);
            if (!userInfo.userName) {
                console.log('第', i + 1, "账号失效！请重新登录！！！😭");
                continue;
            }
            let fhje = await fridensHelper(masterCookie, ownCookie, shareId, result.longitude, result.latitude);
            zje = zje + (typeof fhje !== 'undefined' ? Number(fhje) : 0);
            if (!fhje || fhje == 0) {
                continue;
            }
            console.log("目前获取到总金额:", zje);
            console.log("防止黑号延时5秒");
            await wait(5);
        }
        console.log("本次执行脚本获取到总金额:", zje);
        process.exit(0);
    }
}
start();

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }