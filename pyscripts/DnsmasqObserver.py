dev = "Serverconfigs/dnsmasq.leases"
run = "/var/lib/misc/dnsmasq.leases"
leases_file = dev

def get_vendor(mac):
    vendors = {"00:1a:e8" : "Unify", "00:15:65": "Yealink"}
    return vendors.get(mac[0:8], "unknown")

def add_vendors_dict(users):
    for (k,v) in users.items():
        users[k]["vendor"] = get_vendor(users[k].get("mac", "ZZZZZZZZ"))
    return users

# modi: 1=all phones in the leases which arent mentioned (by mac) in the configs
#       2=all phones in the leases which are mentioned but have a lease with false ip (this phone needs to be resetted
#       3=all phones where the ip the user wants to have is the actual ip
def read_dns_leases(modus, already_edited):
    already = []
    for (k,v) in already_edited.items():
        m = already_edited[k].get("mac", None)
        if m is not None:
            already.append(m)
    scanned_new = {}
    with open(leases_file) as file:
        for line in file.readlines():
            splitter = line.split(" ")
            timestamp = splitter[0]
            mac = splitter[1]
            ip = splitter[2]
            found_entry_for_mac = already_edited.get(ip, None)
            if mac not in already and modus == 1:
                scanned_new[mac] = {}
                scanned_new[mac]["ip"] = ip
                scanned_new[mac]["vendor"] = get_vendor(mac)
                scanned_new[mac]["timestamp"] = timestamp
            elif mac in already and modus == 2 and found_entry_for_mac == None:
                scanned_new[mac] = {}
                scanned_new[mac]["ip"] = ip
                scanned_new[mac]["ip_should"] = ip
                scanned_new[mac]["vendor"] = get_vendor(mac)
                scanned_new[mac]["timestamp"] = timestamp
            elif mac in already and modus == 3 and found_entry_for_mac != None and found_entry_for_mac.get("ip", None) == ip:
                scanned_new[mac] = {}
                scanned_new[mac]["vendor"] = get_vendor(mac)
                scanned_new[mac]["timestamp"] = timestamp
                for (k, v) in found_entry_for_mac.items():
                    scanned_new[mac][k] = v
    return scanned_new

def get_ip_for_mac(mac_addr):
    with open(leases_file) as file:
        for line in file.readlines():
            splitter = line.split(" ")
            mac = splitter[1]
            ip = splitter[2]
            if mac == mac_addr:
                return ip
