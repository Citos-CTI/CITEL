import json, bcrypt, sqlite3, time, _thread, hashlib
from flask import Flask, render_template, g, jsonify, request, Response, abort
from passlib.apps import custom_app_context as pwd_context
from flask_httpauth import HTTPBasicAuth
from itsdangerous import (TimedJSONWebSignatureSerializer as Serializer, BadSignature, SignatureExpired)
from flask_sqlalchemy import SQLAlchemy
from pyscripts import UnifyPhones, Datasource, DnsmasqObserver
import pyscripts.SystemServiceHandler as SystemServiceHandler
import pyscripts.ConfigTemplatesRenderer as ConfigTemplatesRenderer
import pyscripts.LogEngine as LogEngine

app = Flask(__name__, static_url_path='/static')
app.config['SECRET_KEY'] = 'maus test gewehr seife stelze faktor'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_COMMIT_ON_TEARDOWN'] = True

auth = HTTPBasicAuth()
db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'logins'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), index=True)
    password_hash = db.Column(db.String(64))

    def hash_password(self, password):
        self.password_hash = pwd_context.encrypt(password)

    def verify_password(self, password):
        return pwd_context.verify(password, self.password_hash)

    def generate_auth_token(self, expiration=600):
        s = Serializer(app.config['SECRET_KEY'], expires_in=expiration)
        return s.dumps({'id': self.id})

    @staticmethod
    def verify_auth_token(token):
        s = Serializer(app.config['SECRET_KEY'])
        try:
            data = s.loads(token)
        except SignatureExpired:
            return None    # valid token, but expired
        except BadSignature:
            return None    # invalid token
        user = User.query.get(data['id'])
        return user

@auth.verify_password
def verify_password(username_or_token, password):
    # first try to authenticate by token
    print(password)
    print(username_or_token)
    user = User.verify_auth_token(username_or_token)
    if not user:
        # try to authenticate with username/password
        user = User.query.filter_by(username=username_or_token).first()
        print(user)
        if not user or not user.verify_password(password):
            abort(401)
            return False
    g.user = user
    return True

def queryUserLite(name):
    conn = sqlite3.connect("users.db")
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username LIKE ?", (name+'%',))
    return cur.fetchall()

def delete_user_db(id):
    #TODO vlt existiert ein Fall bei dem der User nicht geloescht werden kann
    conn = sqlite3.connect("users.db");
    cur = conn.cursor()
    cur.execute("DELETE from users where id=?", (id))
    conn.commit()
    conn.close()
    return True

def update_password_db(user_id, new_value):
    conn = sqlite3.connect("users.db");
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(new_value.encode("utf-8"), salt)
    cur = conn.cursor()
    cur.execute("Update users set passwordhash = ?,salt = ? where id=?", (hashed, salt, user_id,))
    conn.commit()
    conn.close()
    return True

def read_in_file_to_dict(filename):
    d = json.load(open(filename))
    with open(filename+'.templ') as f:
        for line in f:
            (key, name, pos, desc) = line.split('=')
            d['_setting'+key] = (name, pos, desc)
    return d

def check_cookie_and_serve(site):
    token = request.cookies.get('token', None)
    if token is not None:
        print("cookie found")
        if User.verify_auth_token(token) is not None:
            print("valid cookie found")
            return render_template(site)
    abort(401)

@app.route('/')
def render_static():
    return check_cookie_and_serve('index.html')

@app.route('/dev')
def render_static_dev():
    return check_cookie_and_serve('dev.html')

# Use this to prevent chrome from logging in via uggly window
@app.errorhandler(401)
def custom_401(error):
    print("let him in")
    return render_template('login.html')

@app.route('/webfonts/<string:font_name>')
def get_fonts(font_name):
    return app.send_static_file('webfonts/'+font_name)

@app.route('/api/token')
@auth.login_required
def get_auth_token():
    token_time = 600
    token = g.user.generate_auth_token(token_time)
    print(token)
    return jsonify({'token': token.decode('ascii'), 'duration': token_time, 'timestamp': time.time()})

@app.route('/api/queryAll/')
@auth.login_required
def query_all():
    numberList = json.dumps(Datasource.get_all_users())
    return Response(numberList, mimetype='application/json')

@app.route('/api/queryallmac/')
@auth.login_required
def query_all_mac():
    try:
        return json.dumps(DnsmasqObserver.read_dns_leases(3, Datasource.get_all_users()))
    except FileNotFoundError:
        c = {}
        return json.dumps(c, ensure_ascii=False)

def restart_function(mac_addr):
    vendor = DnsmasqObserver.get_vendor(mac_addr)
    if vendor == "Unify":
        ip = DnsmasqObserver.get_ip_for_mac(mac_addr)
        password = Datasource.get_password_for_phone(ip)
        run_command_async(UnifyPhones.restart, (ip,password))
        print("Starte neu die Nummer: " + mac_addr)
        return (True, "restart_phone", "Neustart erfolgreich angestossen!", "Neustart: Unify phone mit MAC: "+ mac_addr)
    else:
        print("Keine Funktion für diesen Hersteller implementiert")
        return (False, "restart_phone", "Neustart nicht erfolgreich!", "Keine Funktion für diesen Hersteller implementiert")

@app.route('/api/restartphone/<string:mac_addr>')
@auth.login_required
def restart_single_phone(mac_addr):
    tup = restart_function(mac_addr)
    return json.dumps({'success': tup[0], 'func_id' : tup[1], 'header': tup[2], 'message': tup[3]}), 200, {'ContentType': 'application/json'}

def fact_reset_function(mac_addr):
    vendor = DnsmasqObserver.get_vendor(mac_addr)
    if(vendor == "Unify"):
        ip = DnsmasqObserver.get_ip_for_mac(mac_addr)
        password = Datasource.get_password_for_phone(ip)
        run_command_async(UnifyPhones.fact_reset_unify, (ip,password))
        print("Factory Reset an Unify phone with MAC: ", mac_addr)
        return (True, "reset_phone", "Reset erfolgreich angestossen!", "Factory Reset an Unify phone mit MAC: "+ mac_addr)
    else:
        print("Keine Funktion für diesen Hersteller implementiert")
        return (False, "reset_phone", "Reset nicht erfolgreich!", "Keine Funktion für diesen Hersteller implementiert")

@app.route('/api/factoryresetphone/<string:mac_addr>')
@auth.login_required
def factory_reset_single_phone(mac_addr):
    tup = fact_reset_function(mac_addr)
    print(tup)
    return json.dumps({'success': tup[0], 'func_id' : tup[1], 'header': tup[2], 'message': tup[3]}), 200, {'ContentType': 'application/json'}

def deployment_function(mac_addr):
    vendor = DnsmasqObserver.get_vendor(mac_addr)
    if vendor == "Unify":
        ip = DnsmasqObserver.get_ip_for_mac(mac_addr)
        user_dict = Datasource.get_user_dict_by_ip(ip)
        config = json.load(open("deploymentconfig/deployment.json"))
        run_command_async(UnifyPhones.deployment, (ip, user_dict, config))
        print("Deploye neu die MAC: " + mac_addr)
        return (True, "reset_phone", "Deployment erfolgreich angestossen!", "Deploy Unify phone mit MAC: "+ mac_addr)
    else:
        print("Keine Funktion für diesen Hersteller implementiert")
        return (False, "reset_phone", "Deployment nicht erfolgreich!", "Keine Funktion für diesen Hersteller implementiert")

@app.route('/api/deployphone/<string:mac_addr>')
@auth.login_required
def deploy_single_phone(mac_addr):
    tup = deployment_function(mac_addr)
    return json.dumps({'success': tup[0], 'func_id' : tup[1], 'header': tup[2], 'message': tup[3]}), 200, {'ContentType': 'application/json'}

@app.route('/api/query/<string:query_name>')
@auth.login_required
def query(query_name):
    numberList = Datasource.get_query(query_name)
    return Response(numberList, mimetype='application/json')

@app.route('/api/querymac/<string:mac>')
@auth.login_required
def query_mac(mac):
    numberList = Datasource.get_query_mac(mac)
    return Response(numberList, mimetype='application/json')

@app.route('/api/deleteUser/<string:user_id>')
@auth.login_required
def delete_user(user_id):
    print("Delte User:",user_id)
    if(Datasource.delete_user_id(user_id)):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    else:
        return json.dumps({'success': False}), 200, {'ContentType': 'application/json'}

@app.route('/api/addUser/<string:user_id>')
@auth.login_required
def add_user(user_id):
    print("Adde User:", user_id)
    if (Datasource.add_user_id(user_id)):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    else:
        return json.dumps({'success': False}), 200, {'ContentType': 'application/json'}

@app.route('/api/alteruser', methods=['GET'])
@auth.login_required
def alter_user():
   ip = request.args.get('id')
   variable = request.args.get('var')
   new_value = request.args.get('new')
   if (Datasource.alter_user_id(ip, variable, new_value)):
       return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
   else:
       return json.dumps({'success': False}), 200, {'ContentType': 'application/json'}

@app.route('/api/addqualifieduser', methods=['GET'])
@auth.login_required
def add_qualified_user():
    user = {}
    ip = request.args.get('ip')
    user["mac"] = request.args.get('mac')
    user["ip"] = request.args.get('ip')
    user["user"] = request.args.get('user')
    user["secret"] = request.args.get('secret')
    user["callerid"] = request.args.get('callerid')
    user["pc_ip"] = request.args.get('pc_ip')
    if Datasource.add_qualified_user(ip, user):
        return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}
    else:
        return json.dumps({'success': False}), 200, {'ContentType': 'application/json'}

@app.route('/api/getsettings/')
@auth.login_required
def get_all_settings():
    print("getsettings")
    return jsonify(read_in_file_to_dict("server.json"))

@app.route('/api/altersetting', methods=['GET'])
@auth.login_required
def alter_setting():
    d = json.load(open("server.json"))
    for item in request.args.items():
        d[item[0]] = item[1]
    with open('server.json', 'w') as file:
        file.write(json.dumps(d))
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/writedeploymentsettings', methods=['GET'])
@auth.login_required
def write_deployment_settings():
    deployment_settings = json.load(open("deploymentconfig/deployment.json"))
    for item in request.args.items():
        deployment_settings["settings"][item[0]]["value"] = item[1]
    with open('deploymentconfig/deployment.json', 'w') as file:
        file.write(json.dumps(deployment_settings, sort_keys=True))
    h = hashlib.sha512(open('deploymentconfig/deployment.json','rb').read()).hexdigest()
    return json.dumps({'hash': h, 'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/getdeploymentsettingshash')
@auth.login_required
def get_deployment_settings_hash():
    h = hashlib.sha512(open('deploymentconfig/deployment.json', 'rb').read()).hexdigest()
    return json.dumps({'hash': h, 'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/saveusersettings/')
@auth.login_required
def save_user_settings():
    print("Save User Settings")
    Datasource.saveUserSettings()
    reload_asterisk()
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/discardusersettings/')
@auth.login_required
def discard_user_settings():
    print("Discard User Settings")
    Datasource.discardUserSettings()
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/searchnotreadyphones/')
@auth.login_required
def search_not_ready_phones():
    try:
        return json.dumps(DnsmasqObserver.read_dns_leases(2, Datasource.get_all_users()))
    except FileNotFoundError:
        c = {}
        return json.dumps(c, ensure_ascii=False)

@app.route('/api/searchnewphones/')
@auth.login_required
def search_new_phones():
    try:
        return json.dumps(DnsmasqObserver.read_dns_leases(1, Datasource.get_all_users()))
    except FileNotFoundError:
        c = {}
        return json.dumps(c, ensure_ascii=False)

@app.route('/api/reloadAsterisk/')
@auth.login_required
def reload_asterisk():
    print("Reloading Asterisk")
    #TODO Configs should load from one source
    ConfigTemplatesRenderer.write_sip_conf(json.load(open("../serverconfig/server_config.json")), json.load(open("../users.json")))
    SystemServiceHandler.console_call("asterisk", ("reload", "-rv"))
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/deploymentsettings')
@auth.login_required
def get_deployment_settings():
    print("get deployment settings")
    return jsonify(json.load(open("deploymentconfig/deployment.json")))

@app.route('/api/serversettings')
@auth.login_required
def get_server_settings():
    print("get deployment settings")
    return jsonify(json.load(open("serverconfig/server_config.json")))

@app.route('/api/writeserversettings', methods=['GET'])
@auth.login_required
def write_server_settings():
    deployment_settings = json.load(open("serverconfig/server_config.json"))
    for item in request.args.items():
        deployment_settings["settings"][item[0]]["value"] = item[1]
    with open('serverconfig/server_config.json', 'w') as file:
        file.write(json.dumps(deployment_settings, sort_keys=True))
    h = hashlib.sha512(open('serverconfig/server_config.json','rb').read()).hexdigest()
    return json.dumps({'hash': h, 'success': True}), 200, {'ContentType': 'application/json'}

@app.route('/api/status/<string:status>')
@auth.login_required
def get_status(status):
    if status == 'asterisk-status' or status == 'asterisk-systemstatus':
        return jsonify(log_engine.logfile['asterisk-systemstatus'])
    if status == 'system-status':
        return jsonify(log_engine.logfile['system-status'])
    if status == 'trunk-status':
        return jsonify(log_engine.logfile['trunk-status'])

@app.route('/api/status-summary')
@auth.login_required
def get_status_summary():
    return jsonify(log_engine.logfile)

def run_command_async(function, args):
    _thread.start_new_thread(function, args)

if __name__ == '__main__':
    plist = []
    plist.append(("asterisk", ('192.168.0.213', 5038, 'ami', 'd5314ae0dceddff')))
    plist.append(("system",))
    log_engine = LogEngine.LogEngine("status/status.json", plist)
    app.run(host= '0.0.0.0', port=8080, ssl_context='adhoc')

#
#call_intern('55', get_users_from_ldap("Engler")[2]['telephoneNumber'])