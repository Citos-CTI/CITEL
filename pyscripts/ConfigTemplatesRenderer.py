
def write_dnsmasq_config(user_dict, interface, range, ntp_server):
    items_for_template = []
    for (k, v) in user_dict.items():
        mac = user_dict[k].get("mac", None)
        if mac is not None and len(k) > 6: #shortest valid ip I can think of is 1.1.1.1 or so
            items_for_template.append((mac, k ,user_dict[k].get("callerid","no caller id set")))
    env = jinja2.Environment(loader=jinja2.FileSystemLoader("../configtemplates/"),
                         trim_blocks=True)
    with open("../productiveconfigs/dnsmasq.citos.conf", "w") as text_file:
        text_file.write(env.get_template('dnsmasq.citos.conf.templ').render(interface=interface, range=range, items=items_for_template, ntp_server=ntp_server, ))

def prepare_users(users):
    clean = []
    for (k,v) in users.items():
        callerid = v.get("callerid",None)
        secret = v.get("secret", None)
        user = v.get("user", None)
        if(callerid is not None and secret is not None and user is not None):
            clean.append((user, secret, callerid))
    return clean

def write_sip_conf(server_settings, users):
    users_clean = prepare_users(users)
    print(users_clean)
    env = jinja2.Environment(loader=jinja2.FileSystemLoader("../configtemplates/"), trim_blocks=True)
    with open("../productiveconfigs/sip.conf", "w") as text_file:
        text_file.write(env.get_template("sip.conf.templ").render(sip_trunk_port=server_settings["settings"]["sip-trunk-port"]["value"], sip_trunk_login_string=server_settings["settings"]["sip-trunk-login-string"]["value"],
                                                                  sip_trunk_name=server_settings["settings"]["sip-trunk-name"]["value"], sip_trunk_login_name=server_settings["settings"]["sip-trunk-login-name"]["value"],
                                                                  sip_trunk_host=server_settings["settings"]["sip-trunk-host"]["value"], sip_trunk_login_password=server_settings["settings"]["sip-trunk-login-password"]["value"], users=users_clean))

def write_ami_conf(server_settings):
    # Maybe there will later be the option to add multiple user -> for now its just 1
    users = [(server_settings["settings"]["asterisk-manager-username"]["value"],
              server_settings["settings"]["asterisk-manager-password"]["value"],
              server_settings["settings"]["asterisk-manager-permit-ip"]["value"])]
    env = jinja2.Environment(loader=jinja2.FileSystemLoader("../configtemplates/"), trim_blocks=True)
    with open("../productiveconfigs/manager.conf", "w") as text_file:
        text_file.write(env.get_template("manager.conf.templ").render(enabled=server_settings["settings"]["asterisk-manager-enabled"]["value"],port=server_settings["settings"]["asterisk-manager-port"]["value"],
                                                                      users = users))

if __name__ == "__main__":
    import json
    #write_dnsmasq_config(json.load(open("../users.json")), "eth1", ("100.88.0.200", "100.88.0.229"), "100.88.0.254")
    #write_sip_conf(json.load(open("../serverconfig/server_config.json")), json.load(open("../users/users.json")))
    write_ami_conf(json.load(open("../serverconfig/server_config.json")))