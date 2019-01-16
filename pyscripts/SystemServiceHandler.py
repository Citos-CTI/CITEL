import os
log = True
dev = True

def systemd_service_op(name, operation):
    if log: print(name, operation, "...")
    if not dev: os.spawnlp(os.P_WAIT,'service','service', name, operation)

def console_call(programm, arguments):
    if log: print(programm, *arguments, "...")
    if not dev: os.spawnlp(os.P_WAIT, programm, programm, *arguments)

def delete_dnsmasq_lease(mac_addr):
    if log: print("stopping dnsmasq...")
    if not dev: systemd_service_op("dnsmasq", "stop")

    with open('../Serverconfigs/dnsmasq.leases') as oldfile, open('../Serverconfigs/dnsmasq.leases.txt', 'w') as newfile:
        for line in oldfile:
            if not mac_addr in line:
                newfile.write(line)

    if log: print("starting dnsmasq...")
    if not dev: systemd_service_op("dnsmasq", "start")

if __name__ == "__main__":
    delete_dnsmasq_lease("00:1a:e8:ad:3b:3d")
    systemd_service_op("asterisk", "restart")
    console_call("asterisk", ("reload", "-rv"))
