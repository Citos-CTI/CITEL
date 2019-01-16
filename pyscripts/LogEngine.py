import json, threading, time
import pyscripts.logscripts.AsteriskStatus as AsteriskStatus
import pyscripts.logscripts.SystemStatus as SystemStatus


class LogEngine():
    def __init__(self, status_path, pluginlist):
        self.status_path = status_path
        self.logfile = json.load(open(self.status_path))
        self.plugins = []
        self.pluginlist = pluginlist
        self.start_logging()
        self.start_retry_logging()

    def start_logging(self):
        for plugin in self.pluginlist:
            self.add_plugin_instance(plugin)
        self.logging = True
        self.worker = threading.Thread(target=self.worker_loop)
        self.worker.start()

    def add_plugin_instance(self, name):
        if name[0] == "asterisk":
            self.plugins.append(AsteriskStatus.AsteriskLogger(*name[1]))
        elif name[0] == "system":
            self.plugins.append(SystemStatus.SystemStatus())

    def read_all_plugins(self):
        for plugin in self.plugins:
            print(plugin.get_logfile())
            print(self.logfile)
            self.logfile = {**self.logfile, **plugin.get_logfile()}

    def start_retry_logging(self):
        self.plugin_retrier = threading.Thread(target=self.retry_failed_plugins_cyclic)
        self.plugin_retrier.start()

    def retry_failed_plugins_cyclic(self):
        while(self.logging):
            time.sleep(10)
            for plugin in self.plugins:
                if plugin.checking_status is not True:
                    plugin.reinit()

    def worker_loop(self):
        print("Logging Started!")
        i = 299 # force to save the first
        while(self.logging):
            self.read_all_plugins()
            time.sleep(1)
            i = i + 1
            if i == 300:
                with open(self.status_path, 'w') as file:
                    file.write(json.dumps(self.logfile))
                i = 0



if __name__ == "__main__":
    plist = []
    plist.append(("asterisk", ('192.168.0.213', 5038, 'ami', 'password')))
    plist.append(("system",))

    sys = LogEngine("../status/status.json",plist)
    while True:
        print(sys.logfile)
        time.sleep(1)