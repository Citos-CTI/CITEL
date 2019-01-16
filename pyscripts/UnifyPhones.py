import requests, eventlet
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

class ConfigWriter():
    def __init__(self, ip, password):
        self.ip = ip
        self.password = password
        self.sess = requests.session()
        # Login the session
        payload = {'page_submit': 'WEBMp_Admin_Login', 'AdminPassword': password}
        url = 'https://' + ip + '/page.cmd?page=WEBMp_Admin_Login&lang=en'
        try:
            erg = self.requests_retry_session(self.sess).post(url, data=payload, verify=False)
        except requests.exceptions.ConnectionError:
            print("Wir haben es zu haeufig versucht");
            self.success = False
            return
        except TypeError:
            print("Nicht erreichbar")
            self.success = False
            return
        if 'Authentication failed' in erg.text or 'Password is suspended' in erg.text:
            print("Wir haben es zu haeufig versucht");
            self.success = False
        else:
            self.success = True

    def command_or_setting(self, payload):
        url = 'https://' + self.ip + '/page.cmd'
        try:
            erg = self.requests_retry_session(self.sess).post(url, data=payload, verify=False)
        except requests.exceptions.ChunkedEncodingError:
            print("Phone restarted or timed out (Restart, Factory Reset, Time Change)")

    def requests_retry_session(
            self,
            retries=1,
            backoff_factor=0.1,
            status_forcelist=(500, 502, 504),
            session=None,
    ):
        session = session or requests.Session()
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries,
            backoff_factor=backoff_factor,
            status_forcelist=status_forcelist,
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session


class UnifyConfigurator():
    def __init__(self, deploy_dict = {}, debuglog = False):
        self.debuglog = debuglog
        self.deploy_dict = deploy_dict

    def get_wert_ip(self, ip):
        for ip_sipconf, WERT in self.deploydict.iteritems():  # Session Login as admin
            if ip == ip_sipconf:
                return WERT

    def restart_phone(self, ip, phone_password = "288288ptw"):
        cw = ConfigWriter(ip, phone_password)
        payload = {
            'page_submit': 'WEBM_Admin_Restart'
        }
        if cw.success:
            cw.command_or_setting(payload)
            print("Restart Finished")
        else:
            print("Failure, restart. Could not connect to phone")

    def factory_reset_phone(self, ip, phone_password = "288288ptw", reset_password = "124816"):
        cw = ConfigWriter(ip, phone_password)
        payload = {'page_submit': 'WEBM_Admin_FactoryReset',
                   'WEBMv-factory-reset-passwd': reset_password}
        if cw.success:
            cw.command_or_setting(payload)
            print("Factory Reset Finished")
        else:
            print("Failure, factory reset. Could not connect to phone")


    def deploy_phone(self, ip, WERT, settings_dict, old_phone_password = "123456", new_phone_password = "288288ptw"):
        if(WERT is None):
            return
        print(ip)
        print(WERT)
        extension = WERT['user']
        password = WERT['secret']

        cw = ConfigWriter(ip, old_phone_password)

        if not cw.success:
            print("Failure, deploy phone. Could not connect to phone")

        if not old_phone_password == new_phone_password:
            if self.debuglog: print("Change the password to a non default")
            payload = {'page_submit': 'WEBM_Admin_Security',
                       'WEBM-old-password': old_phone_password,
                       'WEBM-set-password': new_phone_password,
                       'WEBM-cfm-password': new_phone_password
                       }
            cw.command_or_setting(payload)
            cw = ConfigWriter(ip, new_phone_password)

        if self.debuglog: print("Set the Registration Configs in the System/Registration")
        payload = {'page_submit': 'WEBM_Admin_Registration',
                   'reg-addr': settings_dict["sip-server-address"]["value"],
                   'registrar-addr': settings_dict["sip-server-address"]["value"],
                   'realm': settings_dict["sip-server-address"]["value"],
                   'sip-user-id': extension,
                   'sip-pwd': password
                   }
        cw.command_or_setting(payload)

        if self.debuglog: print("Set the Registration Configs in the System/Registration")
        payload = {'page_submit': 'WEBM_Admin_LDAP',
                   'ldap-server-address': settings_dict["ldap-server-address"]["value"],
                   'ldap-transport': '0',
                   'ldap-server-port': settings_dict["ldap-server-port"]["value"],
                   'ldap-authentication': '0'
                   }
        cw.command_or_setting(payload)

        if self.debuglog: print("Upload the ldaptemplate from the /File Transfer/LDAP Menue")
        payload = {'page_submit': 'WEBM_Admin_FileTransferLdap',
                   'dl-ldp-method': '1',
                   'dl-ldp-base-url': '100.88.0.254',
                   'dl-ldp-file': 'ldaptempl.txt',
                   'WEBM-Admin-StartDownload': '1',
                   'WEBMv_Admin_Download_FileType': '6',
                   'WEBMv_Admin_Download_FileName': 'dl-ldp-file'}
        cw.command_or_setting(payload)

        if self.debuglog: print("Set the Terminal number in the System/System Identity Menue")
        payload = {'page_submit': 'WEBM_Admin_Identity',
                   'e164': extension,
                   'basic-e164': extension,
                   'sip-name': extension,
                   'use-display-id': 'true',
                   'display-id-unicode': extension}
        cw.command_or_setting(payload)

        if self.debuglog: print("Set the transport to udp in the System/SIP interface Menue")
        payload = {'page_submit': 'WEBM_Admin_SipInterface',
                   'sip-transport': settings_dict["sip-transport"]["value"]}
        cw.command_or_setting(payload)

        if self.debuglog: print("Set the language and time settings to the german time")
        payload = {'page_submit': 'WEBM_User_Locality',
                   'language': 'de',
                   'country': 'de',
                   'date-format': '0',
                   'time-format': '0'
                   }
        cw.command_or_setting(payload)

        if self.debuglog: print("Set the ntp settings in the Date and Time Menue")
        payload = {'page_submit': 'WEBM_Admin_DateAndTime',
                   'sntp-addr': '100.88.0.254',
                   'sntp-tz-offset': '1',
                   'daylight-save': 'true'   #Sommerzeit und Winterzeit
                   }
        try:
            with eventlet.Timeout(2):
                cw.command_or_setting(payload)
        except eventlet.Timeout as te:
            if self.debuglog: print("[INFO/IGNORE] Connection Timeout: NTP Zeit wurde geaendert")

        print("Phone " + extension + " finished")


def fact_reset(ip ,password):
    uc = UnifyConfigurator()
    uc.factory_reset_phone(ip, password)

def restart(ip, password):
    uc = UnifyConfigurator()
    uc.restart_phone(ip, password)

def deployment(ip, user_dict, config):
    uc = UnifyConfigurator()
    uc.deploy_phone(ip, user_dict, config)

