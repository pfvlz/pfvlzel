
const axios = require('axios');
const crypto = require('crypto');

const elmSignUrl = process.env.elmSignUrl ? process.env.elmSignUrl : "http://192.168.1.253:9999/api/getXSign";


async function getApiElmSign(api, data, uid, sid) {

    const response = await axios.post(
        elmSignUrl,
        {
            "data": data, "api": api, "pageId": '', "uid": uid, 'sid': sid, "deviceId": '', "utdid": '',
        },
        {
            headers:
                {"content-type": "application/json"}
        });
    if (response && response.data ) {
        return response.data
    }
    return null;
}


async function elmRequestByApi(api, data, cookie) {

    var cookieMap = cookiesToMap(cookie);
    let uid = cookieMap.get("unb")
    let sid = cookieMap.get("cookie2")
    let uin = cookieMap.get("USERID")

    if (!uid || !sid) {
        console.log(`${uin}饿了么Cookie unb或sid为空`);
        return;
    }
    let elmSignInfo = await getApiElmSign(api, data, uid, sid);

    if (!elmSignInfo || !elmSignInfo['x-sign']) {
        console.log(`${uin}饿了么sign请求失败${api}`);
        return;
    }

    let url = `https://acs.m.goofish.com/gw/${api}/1.0/`
    let headers = {
        "x-sgext": encodeURIComponent(elmSignInfo['x-sgext']),
        "x-sign": encodeURIComponent(elmSignInfo['x-sign']),
        'x-sid': sid,
        'x-uid': uid,
        'x-pv': '6.3',
        'x-features': '1051',
        'x-mini-wua': encodeURIComponent(elmSignInfo['x-mini-wua']),
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'x-t': elmSignInfo['x-t'],
        'x-extdata': 'openappkey%3DDEFAULT_AUTH',
        'x-ttid': '1551089129819@eleme_android_10.14.3',
        'x-utdid': '',
        'x-appkey': '24895413',
        'x-devid': '',
    }

    let params = elmSignInfo['wua'] ? {
        "wua": elmSignInfo['wua'], "data": data
    } : {"data": data};

    const response = await axios.post(url, params, {headers});
    if (response && response.data && response.data.data) {
        return response.data
    }
    return null;

}

function cookiesToMap(cookies) {
    let map = new Map();
    if (cookies) {
        let cookieList = cookies.split(';');
        for (let cookie of cookieList) {
            if (cookie.indexOf("=") > -1) {
                let [key, value] = cookie.split('=');
                map.set(key.trim(), value.trim());
            }
        }
    }
    return map;
}

function hbh5tk(tkCookie, encCookie, cookieStr) {
    let txt = cookieStr.replace(/\s/g, '');
    if (txt.slice(-1) !== ';') {
        txt += ';';
    }
    const cookieParts = txt.split(';').slice(0, -1);
    let updated = false;
    for (let i = 0; i < cookieParts.length; i++) {
        const [key] = cookieParts[i].split('=');
        if (['_m_h5_tk', ' _m_h5_tk'].includes(key.trim())) {
            cookieParts[i] = tkCookie;
            updated = true;
        } else if (['_m_h5_tk_enc', ' _m_h5_tk_enc'].includes(key.trim())) {
            cookieParts[i] = encCookie;
            updated = true;
        }
    }
    if (updated) {
        return cookieParts.join(';') + ';';
    } else {
        return txt + tkCookie + ';' + encCookie + ';';
    }
}



function getmh5tkValue(cookieString) {
    if (!cookieString) return '-1';
    const cookiePairs = cookieString.split(';');
    for (const pair of cookiePairs) {
        const [key] = pair.split('=');
        if (['_m_h5_tk', ' _m_h5_tk'].includes(key.trim())) {
            return pair.split('=')[1];
        }
    }
    return '-1';
}

function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

async function checkCookie(cookie) {
    const url = "https://waimai-guide.ele.me/h5/mtop.alsc.personal.queryminecenter/1.0/?jsv=2.6.2&appKey=12574478";
    const headers = {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36"
    };

    try {
        const response = await axios.get(url, {headers});
        if (response.status === 200) {
            const {
                '_m_h5_tk': token, '_m_h5_tk_enc': encToken
            } = response.headers['set-cookie'].reduce((acc, cookieStr) => {
                const [name, value] = cookieStr.split(';')[0].split('=');
                acc[name] = value;
                return acc;
            }, {});
            const tokenCookie = `_m_h5_tk=${token}`;
            const encTokenCookie = `_m_h5_tk_enc=${encToken}`;
            return hbh5tk(tokenCookie, encTokenCookie, cookie);
        } else {
            return null;
        }
    } catch (e) {
        console.log("解析ck错误");
        return null;
    }
}

async function elmRequestByH5(cookies, api, dataStr,host = 'guide-acs.m.taobao.com') {
    const tranH5Cookie = await checkCookie(cookies);
    const headers = {
        "authority": "shopping.ele.me",
        "accept": "application/json",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        "cookie": tranH5Cookie,
        "user-agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G955U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36"
    };

    const timestamp = Date.now();
    //09a04b8b9b63edd65c3bfe785f14c891_1722190104764
    const tokenPart = getmh5tkValue(tranH5Cookie).split("_")[0];
    const signStr = `${tokenPart}&${timestamp}&12574478&${dataStr}`;
    const sign = md5(signStr);

    // https://shopping.ele.me
    // https://guide-acs.m.taobao.com
    // https://mtop.ele.me
    const url = `https://${host}/h5/${api}/1.0/?jsv=2.7.1&appKey=12574478&t=${timestamp}&sign=${sign}&api=${api}&v=1.0&type=originaljson&dataType=json`;
    try {
        const response = await axios.post(url, {data: dataStr}, {headers});
        return response.data
    } catch (error) {
        console.error("请求错误:", error);
    }
}

// 获取用户信息，可用于判断ck是否有效
async function getUserInfo(cookie) {
    const headers = {
        Cookie: cookie,
        "user-agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36"
    };
    const url = "https://restapi.ele.me/eus/v5/user_detail";
    try {
        const response = await axios.get(url, {headers});
        if (response.status === 200) {
            return response.data
        } else {
            return null;
        }
    } catch (e) {
        return null;
    }
};

module.exports = {
    getApiElmSign,
    elmRequestByApi,
    cookiesToMap,
    elmRequestByH5,
    getUserInfo
}



