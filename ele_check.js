/**
 * @kolikow
 * 变量：elmck: 必填，账号cookie
 * const $ = new Env('饿了么更新');
 * cron: 0 * * * *
 */

const {
    getEnvsByName,
    DisableCk,
    EnableCk,
    updateEnv,
    updateEnv11,
    getEnvByUserId
} = require("./ql");

const {
    wait,
    checkCk,
    validateCarmeWithType,
    invalidCookieNotify,
    getUserInfo,
    runOne,
    getCookieMap
} = require("./common.js");

const _0x11f78e = require("moment");

function _0x543ec4(_0x3fdeea, _0x4dabab) {
    return Math.floor(Math.random() * (_0x4dabab - _0x3fdeea + 1) + _0x3fdeea);
}

function reorderCookie(s) {
    const order = ["cookie2", "sgcookie", "unb", "USERID", "SID", "token", "utdid", "deviceId", "umt", "phone", "pwd"];
    const cookies = s.split(';');
    const cookieDict = {};

    cookies.forEach(cookie => {
        const keyValue = cookie.split('=', 2);
        if (keyValue.length === 2) {
            const key = keyValue[0].trim();
            const value = keyValue[1].trim();
            cookieDict[key] = value;
        }
    });

    const reorderedCookies = [];

    order.forEach(key => {
        if (cookieDict.hasOwnProperty(key)) {
            reorderedCookies.push(`${key}=${cookieDict[key]}`);
        }
    });

    return reorderedCookies.join(';') + ';';
}

function _0x389941(_0x1daaab) {
    let _0x59299c = "";

    for (let [_0x7cf76, _0x5050e8] of _0x1daaab) {
        _0x59299c += _0x7cf76 + "=" + _0x5050e8 + ";";
    }

    return _0x59299c;
}

async function _0x179175(data, context, options) {
    let result1 = await runOne(context, options);
    const msg = result1.msg;
    const responseData = result1.result;

    if (responseData) {
        if (responseData.code === 3000) {
            let parsedData = JSON.parse(responseData.returnValue.data);
            let token = parsedData.autoLoginToken;
            let cookie2 = responseData.returnValue.sid;
            let unb = responseData.returnValue.hid;
            const expiryTimestamp = parsedData.expires;
            const expiryDate = _0x11f78e(expiryTimestamp * 1000).format("YYYY-MM-DD HH:mm:ss");

            let cookieMap = getCookieMap(context);
            let updatedContext = await runOne(context, cookieMap.get("SID"));

            if (!updatedContext) {
                return;
            }

            cookieMap.set('cookie2', cookie2);
            cookieMap.set('token', token);
            cookieMap.set('unb', unb);

            let ck666 = _0x389941(cookieMap);
            let updatedEnvironment = reorderCookie(ck666);

            if (data.id) {
                await updateEnv11(updatedEnvironment, data.id, data.remarks);
            } else {
                await updateEnv(updatedEnvironment, data._id, data.remarks);
            }

            let userID = cookieMap.get("USERID");
            let successMessage = `${msg}: ${expiryDate}`;
            console.log(`账号 ${userID} 状态正常，${successMessage}`);
            return {
                successMessage,
                updatedCookies: cookieMap
            };
        } else {
            if (responseData.message) {
                console.log(`账号 ${data._id} 状态无效：${responseData.message}`);
            } else {
                console.log(`账号 ${data._id} 状态无效：${response.ret[0]}`);
            }
            return null;
        }
    } else {
        console.log(`账号 ${data._id} 状态无效：${msg}`);
    }
}

// 续期 cookies 的函数
async function renewCookies(env, mackala, envName) {
    const athel = env.value.replace(/\s/g, "");
    let houda = env._id || env.id || 0;

    let isValid = await checkCk(athel, mackala);
    if (!isValid) {
        let result = await _0x179175(env, athel);
        if (result && result.successMessage.includes("刷新成功")) {
            await EnableCk(houda);
            // 显示账号状态及环境变量名称
            console.log(`第 ${mackala + 1} 账号 (${envName}) 状态正常！`);
            return result.updatedCookies; // 返回更新后的 cookie
        } else {
            const response = await DisableCk(houda);
            if (response.code === 200) {
                console.log(`第 ${mackala + 1} 账号 (${envName}) 失效！已🈲用`);
            } else {
                console.log(`第 ${mackala + 1} 账号 (${envName}) 失效！请重新登录！！！😭`);
            }
            await invalidCookieNotify(athel, env.remarks);
            return null;
        }
    } else {
        // 显示账号状态及环境变量名称
        console.log(`第 ${mackala + 1} 账号 (${envName}) 状态有效！`);
        return null;
    }
}

// 主异步函数
(async function _0x1f3fe2() {
    const aleo = process.env.ELE_CARME;
    await validateCarmeWithType(aleo, 1);
    
    // 获取三个变量的环境
    const envNames = ["elmck", "elmqqck", "nczlck"];
    
    for (const envName of envNames) {
        const envs = await getEnvsByName(envName);

        for (let mackala = 0; mackala < envs.length; mackala++) {
            const env = envs[mackala];
            await renewCookies(env, mackala, envName); // 传递环境变量名称
            await wait(_0x543ec4(1, 3));
        }
    }

    process.exit(0);
}());
