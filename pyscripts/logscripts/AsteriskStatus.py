import time, json, threading, datetime
from asterisk.ami import SimpleAction, AMIClient

class AsteriskLogger():

    def __init__(self, host, port, username, secret):
        self.creds = [host, port, username, secret]
        self.plugin_name = "asterisk"
        self.checking_status = False
        self.local_logfile = {}
        self.local_logfile["asterisk-systemstatus"] = {}
        self.init()

    def reinit(self):
        self.init()

    def init(self):
        try:
            self.client = AMIClient(address=self.creds[0], port=self.creds[1])
            self.client.login(username=self.creds[2], secret=self.creds[3])  # TODO: Sicherheitskonzept
            self.push_to_logfile_system_state("status", 1)
        except Exception as e:
            self.push_to_logfile_system_state("status", 0)
            print("Could not init: " + self.plugin_name, e)
            return
        self.client.add_event_listener(self.event_listener_registry, white_list=['RegistryEntry'])
        self.client.add_event_listener(self.event_listener_extension_status, white_list=['ExtensionStatus'])
        self.client.add_event_listener(self.general_debug_eventlistener)
        self.checking_status = True
        self.worker = threading.Thread(target=self.worker_loop)
        self.worker.start()

    def worker_loop(self):
        print("Asterisk logging Started!")
        i = 299 # force to save the first
        while(self.checking_status):
            action = SimpleAction('CoreStatus')
            self.client.send_action(action, callback=self.callback_response_status)
            action = SimpleAction('CoreSettings')
            self.client.send_action(action, callback=self.callback_response_settings)
            action = SimpleAction('SIPshowregistry')
            self.client.send_action(action)
            time.sleep(0.5)
            action = SimpleAction('ExtensionStateList')
            self.client.send_action(action)
            time.sleep(0.5)

    def get_logfile(self):
        if "running-asterisk-version" not in self.local_logfile["asterisk-systemstatus"]:
            self.push_to_logfile_system_state("running-asterisk-version", "-")
        if "running-manager-version" not in self.local_logfile["asterisk-systemstatus"]:
            self.push_to_logfile_system_state("running-manager-version", "-")
        if "act-current-calls" not in self.local_logfile["asterisk-systemstatus"]:
            self.push_to_logfile_system_state("act-current-calls", "-")
        if "last-core-reload" not in self.local_logfile["asterisk-systemstatus"]:
            self.push_to_logfile_system_state("last-core-reload", "-")
        if "last-core-restart" not in self.local_logfile["asterisk-systemstatus"]:
            self.push_to_logfile_system_state("last-core-restart", "-")

        return self.local_logfile

    def create_timestamp_from_strings(self, date, time):
        date_parts = date.split("-")
        time_parts = time.split(":")
        return datetime.datetime(int(date_parts[0]), int(date_parts[1]), int(date_parts[2]), int(time_parts[0]),
                                       int(time_parts[1]), int(time_parts[2])).timestamp()

    def callback_response_status(self, response):
        reload_time = response.keys.get("CoreReloadTime", None)
        reload_date = response.keys.get("CoreReloadDate", None)
        if reload_date is not None and reload_time is not None:
            self.push_to_logfile_system_state("last-core-reload", self.create_timestamp_from_strings(reload_date, reload_time))

        startup_time = response.keys.get("CoreStartupTime", None)
        startup_date = response.keys.get("CoreStartupDate", None)
        if startup_time is not None and startup_date is not None:
            self.push_to_logfile_system_state("last-core-restart", self.create_timestamp_from_strings(startup_date, startup_time))

        current_calls = response.keys.get("CoreCurrentCalls", None)
        if current_calls is not None:
            self.push_to_logfile_system_state("act-current-calls", current_calls)

    def callback_response_settings(self, response):
        version = response.keys.get("AsteriskVersion", None)
        if version is not None:
            self.push_to_logfile_system_state("running-asterisk-version", version)

        ami_version = response.keys.get("AMIversion", None)
        if ami_version is not None:
            self.push_to_logfile_system_state("running-manager-version", ami_version)

    def push_to_logfile_trunk(self, trunkname, user, state):
        self.local_logfile["timestamp"] = time.time()
        if self.local_logfile["trunk-status"].get(trunkname + "-" + user, None) is None:
            self.local_logfile["trunk-status"][trunkname + "-" + user]= {}
        if state == "Registered":
            self.local_logfile["trunk-status"][trunkname + "-" + user]["status"] = 1
        else:
            self.local_logfile["trunk-status"][trunkname + "-" + user]["status"] = 0

        self.local_logfile["trunk-status"][trunkname + "-" + user]["trunkname"] = trunkname
        self.local_logfile["trunk-status"][trunkname + "-" + user]["user"] = user


    def push_to_logfile_system_state(self, varname, state):
        self.local_logfile["timestamp"] = time.time()
        self.local_logfile["asterisk-systemstatus"][varname] = state


    def push_to_logfile_user(self, exten, status, hint):
        self.local_logfile["timestamp"] = time.time()
        if self.local_logfile["trunk-status"].get(exten, None) is None:
            self.local_logfile["asterisk-user-status"][exten] = {}
        self.local_logfile["asterisk-user-status"][exten]["status"] = status
        self.local_logfile["asterisk-user-status"][exten]["hint"] = hint

    def event_listener_registry(self, event,**kwargs):
        trunk_domain = event.keys.get("Domain", None)
        trunk_user = event.keys.get("Username", None)
        trunk_status = event.keys.get("State", None)
        if trunk_domain is not None and trunk_user is not None and trunk_status is not None:
            self.push_to_logfile_trunk(trunk_domain, trunk_user, trunk_status)

    def event_listener_extension_status(self, event, **kwargs):
        status = event.keys.get("Status", None)
        exten = event.keys.get("Exten", None)
        hint = event.keys.get("Hint", None)
        if status is not None and exten is not None and hint is not None:
            self.push_to_logfile_user(exten, status, hint)

    def general_debug_eventlistener(self, event, **kwargs):
        return




if __name__ == "__main__":
    def callback_response(event, **kwargs):
        print(event)

    client = AMIClient(address='192.168.0.213', port=5038)
    client.login(username='ami', secret='amisecret')

    client.add_event_listener(callback_response, white_list=['CoreShowChannel'])

    action = SimpleAction('CoreShowChannels')
    future = client.send_action(action, callback=callback_response)

    while True:
        time.sleep(1)



    #action = SimpleAction('SIPshowregistry')
    #future = client.send_action(action, callback=callback_response)

    #action = SimpleAction('ExtensionStateList')
    #future = client.send_action(action, callback=callback_response)

#Interessante:
# CoreStatus, CoreSettings
# async: SIPshowregistry
# async: ExtensionStateList

# On the fly adding/removing of users
# DialplanExtensionRemove/Add

# Later adding in the CTI
# CtiDND, CtiCF, CtiExtenState


'''
QueuePenalty: Set the penalty for a queue member.  (Priv: agent,all)
BridgeList: Get a list of bridges in the system.  (Priv: <none>)
QueueRemove: Remove interface from queue.  (Priv: agent,all)
Challenge: Generate Challenge for MD5 Auth.  (Priv: <none>)
SIPnotify: Send a SIP notify.  (Priv: system,all)
ActionID: 5
ConfbridgeUnmute: Unmute a Confbridge user.  (Priv: call,all)
VoicemailUsersList: List All Voicemail User Information.  (Priv: call,reporting,all)
DBGet: Get DB Entry.  (Priv: system,reporting,all)
DialplanExtensionRemove: Remove an extension from the dialplan  (Priv: system,all)
MixMonitor: Record a call and mix the audio during the recording.  Use of StopMixMonitor is required to guarantee the audio file is available for processing during dialplan execution.  (Priv: system,all)
ListCategories: List categories in configuration file.  (Priv: config,all)
SorceryMemoryCacheExpireObject: Expire (remove) an object from a sorcery memory cache.  (Priv: system,all)
DBDel: Delete DB entry.  (Priv: system,all)
Reload: Send a reload event.  (Priv: system,config,all)
PlayDTMF: Play DTMF signal on a specific channel.  (Priv: call,all)
AGI: Add an AGI command to execute by Async AGI.  (Priv: agi,all)
FAXSessions: Lists active FAX sessions  (Priv: call,all)
Getvar: Gets a channel variable or function value.  (Priv: call,reporting,all)
StopMixMonitor: Stop recording a call through MixMonitor, and free the recording's file handle.  (Priv: system,call,all)
Parkinglots: Get a list of parking lots  (Priv: call,all)
ConfbridgeKick: Kick a Confbridge user.  (Priv: call,all)
ConfbridgeUnlock: Unlock a Confbridge conference.  (Priv: call,all)
QueueReset: Reset queue statistics.  (Priv: <none>)
IAXpeers: List IAX peers.  (Priv: system,reporting,all)
SIPshowregistry: Show SIP registrations (text format).  (Priv: system,reporting,all)
UserEvent: Send an arbitrary event.  (Priv: user,all)
Atxfer: Attended transfer.  (Priv: call,all)
ConfbridgeStartRecord: Start recording a Confbridge conference.  (Priv: system,all)
QueueReload: Reload a queue, queues, or any sub-section of a queue or queues.  (Priv: <none>)
AgentLogoff: Sets an agent as no longer logged in.  (Priv: agent,all)
CtiCF: SET Callforwarding via CTI.                  (Priv: system,all)
PauseMonitor: Pause monitoring of a channel.  (Priv: call,all)
DataGet: Retrieve the data api tree.  (Priv: <none>)
BridgeTechnologyList: List available bridging technologies and their statuses.  (Priv: <none>)
Filter: Dynamically add filters for the current manager session.  (Priv: system,all)
Agents: Lists agents and their status.  (Priv: agent,all)
Ping: Keepalive command.  (Priv: <none>)
Monitor: Monitor a channel.  (Priv: call,all)
DialplanExtensionAdd: Add an extension to the dialplan  (Priv: system,all)
PresenceStateList: List the current known presence states.  (Priv: call,reporting,all)
Originate: Originate a call.  (Priv: originate,all)
CoreShowChannels: List currently active channels.  (Priv: system,reporting,all)
DeviceStateList: List the current known device states.  (Priv: call,reporting,all)
UnpauseMonitor: Unpause monitoring of a channel.  (Priv: call,all)
ConfbridgeMute: Mute a Confbridge user.  (Priv: call,all)
DBDelTree: Delete DB Tree.  (Priv: system,all)
IAXnetstats: Show IAX Netstats.  (Priv: system,reporting,all)
FAXStats: Responds with fax statistics  (Priv: reporting,all)
ConfbridgeStopRecord: Stop recording a Confbridge conference.  (Priv: call,all)
GetConfig: Retrieve configuration.  (Priv: system,config,all)
StopMonitor: Stop monitoring a channel.  (Priv: call,all)
SendText: Send text message to channel.  (Priv: call,all)
MessageSend: Send an out of call message to an endpoint.  (Priv: message,all)
AOCMessage: Generate an Advice of Charge message on a channel.  (Priv: aoc,all)
GetConfigJSON: Retrieve configuration (JSON format).  (Priv: system,config,all)
QueueStatus: Show queue status.  (Priv: <none>)
QueueRule: Queue Rules.  (Priv: <none>)
SorceryMemoryCachePopulate: Expire all objects from a memory cache and populate it with all objects from the backend.  (Priv: system,all)
AbsoluteTimeout: Set absolute timeout.  (Priv: system,call,all)
Bridge: Bridge two channels already in the PBX.  (Priv: call,all)
Logoff: Logoff Manager.  (Priv: <none>)
Command: Execute Asterisk CLI Command.  (Priv: command,all)
MixMonitorMute: Mute / unMute a Mixmonitor recording.  (Priv: system,call,all)
SorceryMemoryCacheStale: Marks ALL objects in a sorcery memory cache as stale.  (Priv: system,all)
ChangeMonitor: Change monitoring filename of a channel.  (Priv: call,all)
PresenceState: Check Presence State  (Priv: call,reporting,all)
SIPshowpeer: show SIP peer (text format).  (Priv: system,reporting,all)
Setvar: Sets a channel variable or function value.  (Priv: call,all)
Status: List channel status.  (Priv: system,call,reporting,all)
VoicemailRefresh: Tell Asterisk to poll mailboxes for a change  (Priv: user,all)
ListCommands: List available manager commands.  (Priv: <none>)
ControlPlayback: Control the playback of a file being played to a channel.  (Priv: call,all)
LoggerRotate: Reload and rotate the Asterisk logger.  (Priv: system,reporting,all)
SIPpeers: List SIP peers (text format).  (Priv: system,reporting,all)
ModuleCheck: Check if module is loaded.  (Priv: system,all)
ConfbridgeListRooms: List active conferences.  (Priv: reporting,all)
BlindTransfer: Blind transfer channel(s) to the given destination  (Priv: call,all)
DBPut: Put DB entry.  (Priv: system,all)
ParkedCalls: List parked calls.  (Priv: call,all)
Queues: Queues.  (Priv: <none>)
MailboxCount: Check Mailbox Message Count.  (Priv: call,reporting,all)
ConfbridgeSetSingleVideoSrc: Set a conference user as the single video source distributed to all other participants.  (Priv: call,all)
CreateConfig: Creates an empty file in the configuration directory.  (Priv: config,all)
IAXpeerlist: List IAX Peers.  (Priv: system,reporting,all)
SorceryMemoryCacheStaleObject: Mark an object in a sorcery memory cache as stale.  (Priv: system,all)
ModuleLoad: Module management.  (Priv: system,all)
ConfbridgeLock: Lock a Confbridge conference.  (Priv: call,all)
BridgeTechnologyUnsuspend: Unsuspend a bridging technology.  (Priv: <none>)
Events: Control Event Flow.  (Priv: <none>)
CoreSettings: Show PBX core settings (version etc).  (Priv: system,reporting,all)
BridgeKick: Kick a channel from a bridge.  (Priv: <none>)
UpdateConfig: Update basic configuration.  (Priv: config,all)
ConfbridgeList: List participants in a conference.  (Priv: reporting,all)
Park: Park a channel.  (Priv: call,all)
LocalOptimizeAway: Optimize away a local channel when possible.  (Priv: system,call,all)
WaitEvent: Wait for an event to occur.  (Priv: <none>)
QueueAdd: Add interface to queue.  (Priv: agent,all)
Login: Login Manager.  (Priv: <none>)
BridgeDestroy: Destroy a bridge.  (Priv: <none>)
SorceryMemoryCacheExpire: Expire (remove) ALL objects from a sorcery memory cache.  (Priv: system,all)
ShowDialPlan: Show dialplan contexts and extensions  (Priv: config,reporting,all)
CtiDND: SET DO NOT DISTURB via CTI.                  (Priv: system,all)
BridgeInfo: Get information about a bridge.  (Priv: <none>)
IAXregistry: Show IAX registrations.  (Priv: system,reporting,all)
QueueSummary: Show queue summary.  (Priv: <none>)
BridgeTechnologySuspend: Suspend a bridging technology.  (Priv: <none>)
QueueMemberRingInUse: Set the ringinuse value for a queue member.  (Priv: agent,all)
ExtensionStateList: List the current known extension states.  (Priv: call,reporting,all)
Hangup: Hangup channel.  (Priv: system,call,all)
CtiExtenState: SET Query states for all extensions via CTI.                  (Priv: system,all)
MailboxStatus: Check mailbox.  (Priv: call,reporting,all)
QueueLog: Adds custom entry in queue_log.  (Priv: agent,all)
Redirect: Redirect (transfer) a call.  (Priv: call,all)
CoreStatus: Show PBX core status variables.  (Priv: system,reporting,all)
FAXSession: Responds with a detailed description of a single FAX session  (Priv: call,all)
SIPpeerstatus: Show the status of one or all of the sip peers.  (Priv: system,all)
SIPqualifypeer: Qualify SIP peers.  (Priv: system,reporting,all)
ExtensionState: Check Extension Status.  (Priv: call,reporting,all)
QueuePause: Makes a queue member temporarily unavailable.  (Priv: agent,all)
MuteAudio: Mute an audio stream.  (Priv: system,all)

'''