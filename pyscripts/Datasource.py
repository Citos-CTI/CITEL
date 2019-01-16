import sqlite3, json, os

datasource = "json"

def loadUsersDict():
    # First check if temp already exists, if not copy working and edit it as temp
    try:
        d = json.load(open("users/users.json.tmp"))
        print("Loading TMP file")
    except IOError:
        d = json.load(open("users/users.json"))
        print("Loading Working File")
    return d

def send_user_results(list):
    dicList = []
    for number in list:
        dic = {"id": number[0], "username": number[1], "extension": number[4]}
        dicList.append(dic)
    repl = dicList
    return repl


def get_all_users():
    if datasource is "json":
        d = loadUsersDict()
        print(d)
        return d
    elif datasource is "sqlite":
        conn = sqlite3.connect("users.db")
        cur = conn.cursor()
        cur.execute("SELECT * FROM users ORDER BY id asc")
        return send_user_results(cur.fetchall())

def get_query(query):
    if datasource is "json":
        d = loadUsersDict()
        queried = {k: v for k, v in d.items() if query in v.get('user', "") or query in v.get('callerid', "") or query in v.get('mac', "") or query in v.get('pc_ip', "") or query in k}
        return json.dumps(queried, ensure_ascii=False)

def get_query_mac(mac):
    if datasource is "json":
        d = loadUsersDict()
        queried = {k: v for k, v in d.items() if mac in v.get('mac', "")}
        print(queried)
        return json.dumps(queried, ensure_ascii=False)

def get_user_dict_by_ip(ip):
    if datasource is "json":
        d = json.load(open("users/users.json"))
        return d.get(ip,None)

def delete_user_id(user_id):
    if datasource is "json":
        d = loadUsersDict()
        d.pop(user_id, None)
        with open('users/users.json.tmp', 'w') as file:
            file.write(json.dumps(d))
        return True

def add_user_id(user_id):
    if datasource is "json":
        d = loadUsersDict()
        d[user_id]={}
        with open('users/users.json.tmp', 'w') as file:
            file.write(json.dumps(d))
        return True

def add_qualified_user(ip, user):
    if datasource is "json":
        d = json.load(open("users/users.json"))
        d[ip]=user
        with open('users/users.json', 'w') as file:
            file.write(json.dumps(d))
        return True

def alter_user_id(user_id, var, new):
    if datasource is "json":
        d = loadUsersDict()
        if var == "ip":
            d[new] = d[user_id]
            d.pop(user_id, None)
        else:
            d[user_id][var] = new
        with open('users/users.json.tmp', 'w') as file:
            file.write(json.dumps(d))
        return True
    # TODO add source
    '''elif datasource is "sqlite":
        conn = sqlite3.connect("users.db")
        cur = conn.cursor()
        cur.execute("SELECT * FROM users ORDER BY id asc limit 10")
        return send_user_results(cur.fetchall())'''

def saveUserSettings():
    if datasource is "json":
        d = loadUsersDict()
        with open("users/users.json", "w") as file:
            file.write(json.dumps(d))
        os.remove("users/users.json.tmp")

def discardUserSettings():
    if datasource is "json":
        try:
            os.remove("users/users.json.tmp")
        except OSError:
            print("There was no tmp file")

def get_password_for_phone(ip):
    standard_pw = "123456"
    if datasource is "json":
        d = json.load(open("users/users.json"))
        if ip not in d:
            return standard_pw
        return d[ip].get("phone_secret", standard_pw)