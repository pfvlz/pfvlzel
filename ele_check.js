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
            let userEnvironment = await getEnvByUserId(userID);

            let successMessage = `${msg}: ${expiryDate}`;
            console.log(successMessage);
            return successMessage;
        } else {
            if (responseData.message) {
                console.log(responseData.message);
            } else {
                console.log(response.ret[0]);
            }
            return null;
        }
    } else {
        console.log(msg);
    }
}

// 续期 cookies 的函数，根据给定的变量名称
async function renewCookies(variableName, mackala, houda, athel, pragati) {
    let status = await checkCk(athel, variableName);
    if (!status) {
        let result = await _0x179175(pragati[mackala], athel);
        if (result && result.indexOf("刷新成功") !== -1) {
            await EnableCk(houda);
            console.log(`第${mackala + 1}账号正常😁`);
        } else {
            const response = await DisableCk(houda);
            if (response.code === 200) {
                console.log(`第${mackala + 1}账号失效！已🈲用`);
            } else {
                console.log(`第${mackala + 1}账号失效！请重新登录！！！😭`);
            }
            await invalidCookieNotify(athel, pragati[mackala].remarks);
        }
    } else {
        console.log(`第${mackala + 1}账号${variableName}状态有效！`);
    }
}

// 主异步函数
(async function _0x1f3fe2() {
    const aleo = process.env.ELE_CARME;
    await validateCarmeWithType(aleo, 1);
    const pragati = await getEnvsByName("elmck");

    for (let mackala = 0; mackala < pragati.length; mackala++) {
        let athel = pragati[mackala].value;
        if (!athel) {
            console.log(" ❌无效用户信息, 请重新获取ck");
        } else {
            try {
                var houda = pragati[mackala]._id || pragati[mackala].id || 0; // 获取 _id 或 id
                athel = athel.replace(/\s/g, "");

                // 续期 elmck
                await renewCookies('elmck', mackala, houda, athel, pragati);
                
                // 续期 elmqqck
                await renewCookies('elmqqck', mackala, houda, athel, pragati);
                
                // 续期 nczlck
                await renewCookies('nczlck', mackala, houda, athel, pragati);
                
            } catch (error) {
                console.log(error);
            }
        }
        await wait(_0x543ec4(1, 3));
    }
    process.exit(0);
}());
