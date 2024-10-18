
'''
这个没啥好说的，放青龙运行就行 
带自动删除  老秦真帅
'''
import socket  
import base64  
import json  
import os  
import sys  
import time  
import hmac
import struct
import urllib3  
import requests  

os.environ['no_proxy'] = '*'  
urllib3.disable_warnings()  

# elmck检测
def check_cookie(ck):
    try:
        resp_json=requests.get(url="https://restapi.ele.me/eus/v5/user_detail",headers={"cookie":ck}).json()
        if resp_json and resp_json.get('is_mobile_valid') and resp_json.get('user_id'):
            return True
    except Exception as e:
        print(e)

# 本地青龙方法
class QL:
    def __init__(self):
        port = os.environ.get("QL_PORT")
        if not port:
            port = 5700
        self.url = f'http://127.0.0.1:{port}/'
        if not self.__check_port(port):
            print("青龙端口连不上，请设置环境变量QL_PORT='端口号'")
        self.s = requests.session()  
        self.s.headers.update({"authorization": "Bearer " + str(self.__login()),
                               "Content-Type": "application/json;charset=UTF-8"})  

    @staticmethod
    def __ttotp(key):
        key = base64.b32decode(key.upper() + '=' * ((8 - len(key)) % 8))
        counter = struct.pack('>Q', int(time.time() / 30))
        mac = hmac.new(key, counter, 'sha1').digest()
        offset = mac[-1] & 0x0f
        binary = struct.unpack('>L', mac[offset:offset + 4])[0] & 0x7fffffff
        return str(binary)[-6:].zfill(6)

    
    def __login2(self, username, password, twoFactorSecret):  
        print("Token失效, 新登陆\n")  
        if twoFactorSecret:
            try:
                twoCode = self.__ttotp(twoFactorSecret)
            except Exception as err:
                print(str(err))  
                print("尝试登录失败，请关两步验证")
                sys.exit(1)
            url = self.url + "api/user/login"  
            payload = json.dumps({
                'username': username,
                'password': password
            })  
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }  
            try:  
                res = requests.post(url=url, headers=headers, data=payload)  
                if res.status_code == 200 and res.json()["code"] == 420:
                    url = self.url + 'api/user/two-factor/login'
                    data = json.dumps({
                        "username": username,
                        "password": password,
                        "code": twoCode
                    })
                    res = requests.put(url=url, headers=headers, data=data)
                    if res.status_code == 200 and res.json()["code"] == 200:
                        return res.json()["data"]['token']  
                    else:
                        print("两步校验登录失败\n")  
                        sys.exit(1)
                elif res.status_code == 200 and res.json()["code"] == 200:
                    return res.json()["data"]['token']  
            except Exception as err:
                print(str(err))  
                print("尝试登录失败，请关两步验证")
                sys.exit(1)
        else:
            url = self.url + 'api/user/login'
            payload = {
                'username': username,
                'password': password
            }  
            payload = json.dumps(payload)  
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }  
            try:  
                res = requests.post(url=url, headers=headers, data=payload)  
                if res.status_code == 200 and res.json()["code"] == 200:
                    return res.json()["data"]['token']  
                else:
                    print("青龙登录失败!")
                    sys.exit(1)  
            except Exception as err:
                print(str(err))  
                print("使用旧版青龙登录接口")
                url = self.url + 'api/login'
                payload = {
                    'username': username,
                    'password': password
                }  
                payload = json.dumps(payload)  
                headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }  
                try:  
                    res = requests.post(url=url, headers=headers, data=payload)  
                    return res.json()["data"]['token']  
                except Exception as err:  
                    print(str(err))  
                    print("青龙登录失败, 请检查面板状态!")  
                    sys.exit(1)  

    def __login(self):  
        path = '/ql/config/auth.json'  
        if not os.path.isfile(path):
            path = '/ql/data/config/auth.json'  
        if os.path.isfile(path):  
            with open(path, "r") as file:  
                auth = file.read()  
            auth = json.loads(auth)  
            username = auth.get("username")  
            password = auth.get("password")  
            token = auth.get("token")  
            try:
                if auth.get("isTwoFactorChecking"):
                    two_factor_secret = auth["two_factor_secret"]
                else:
                    two_factor_secret = None
            except Exception as err:
                two_factor_secret = None
                print(f"获取两步验证状态出错：{err}")
            if token:
                url = f'{self.url}api/user'
                headers = {
                    'Authorization': f'Bearer {token}',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Edg/94.0.992.38'
                }
                res = requests.get(url=url, headers=headers)
                if res.status_code == 200:
                    return token
                else:
                    return self.__login2(username, password,
                                         two_factor_secret)  
        else:  
            print("/ql/data/config/和/ql/config都没找到auth.json，你这不是青龙吧😅")  
            sys.exit(0)  

    @staticmethod
    def __check_port(port):  
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)  
        sock.settimeout(2)  
        try:  
            sock.connect(('127.0.0.1', port))  
            sock.close()  
            return True  
        except Exception as err:  
            print(str(err))  
            sock.close()  
            return False  

    def getEnvs(self, name) -> list:
        """
        获取环境变量
        """
        url = f"{self.url}/api/envs?searchValue={name}"
        try:
            rjson = self.s.get(url ).json()
            if (rjson['code'] == 200):
                return rjson['data']
            else:
                self.log(f"获取环境变量失败：{rjson['message']}")
        except Exception as e:
            self.log(f"获取环境变量失败：{str(e)}")

    def del_env(self, id_list):  
        t = int(time.time())
        url = self.url + 'api/envs'
        try:  
            res = self.s.delete(url,data=str(id_list))  
            if res.json()['code']==200:
                return True
        except Exception as err:  
            print("\n青龙环境接口错误",err)  
            sys.exit(1)  

if __name__=="__main__":
    env_name='elmck'
    ql=QL()
    elm_values=ql.getEnvs(env_name)
    if not elm_values:
        print('f没有找到{env_name}')
        exit(0)
    elm_values_1=[]
    for value in elm_values:
        if value['name']==env_name:
            elm_values_1.append(value)
    print(f'共{len(elm_values_1)}个{env_name},开始检测')
    del_ids=[]
    for value in elm_values_1:
        if not check_cookie(value['value']):
            del_ids.append(value['id'])
            print(f'ck(备注：{value["remarks"]})失效，自动删除\n{value["value"]}')
    if del_ids:
        if res:=ql.del_env(del_ids):
            print(f'检测完成!\n本次删除{len(del_ids)}个失效{env_name}')
        else:
            print(f'检测完成!\n{len(del_ids)}个失效{env_name}\n自动删除变量失败!',res)
    else:
        print(f'检测完成!\n{len(elm_values_1)}个账号全部有效！')
