import psutil, threading


class SystemStatus():
    def __init__(self):
        self.plugin_name = "system"
        self.local_logfile = {}
        self.local_logfile["system-status"] = {}
        self.log_measurement((0,0,0,0,0,0,0)) # init logfile
        self.checking_status = True
        self.worker = threading.Thread(target=self.worker_loop)
        self.worker.start()

    def worker_loop(self):
        print("System logging Started!")
        while self.checking_status:
            self.log_measurement(self.measurement())

    def get_logfile(self):
        return self.local_logfile

    def measurement(self):
        percent = psutil.cpu_percent(interval=1)
        memory =psutil.virtual_memory()
        disk_usage = psutil.disk_usage('/')
        return(percent, memory[0], memory[1], memory[2], disk_usage[0], disk_usage[2],disk_usage[3])

    def log_measurement(self, status):
        self.local_logfile["system-status"]["cpu-percent"] = status[0]
        self.local_logfile["system-status"]["ram-total"] = status[1]
        self.local_logfile["system-status"]["ram-free"] = status[2]
        self.local_logfile["system-status"]["ram-percent"] = status[3]
        self.local_logfile["system-status"]["hdd-total"] = status[4]
        self.local_logfile["system-status"]["hdd-free"] = status[5]
        self.local_logfile["system-status"]["hdd-percent"] = status[6]
        self.local_logfile["system-status"]["status"] = 1



if __name__ == "__main__":
    sys = SystemStatus()
    import time
    while True:
        print(sys.local_logfile)
        time.sleep(1)