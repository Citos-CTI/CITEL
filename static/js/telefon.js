actListItems = {}
var actIntMacItemId = -1;

function phones() {
    setActiveNavBar("phones");
    document.getElementById('cont-div').innerHTML = '' +
        '<div style="display: flex; flex-direction: row;"><div>\n' +
        '       <div style="width:500px">\n' +
        '            <div style="width: 100%; color:darkgrey;"><span>Uninitialisiert</span><i style="float: right;" class="fas fa-redo" onclick="reloadUnintMacs()"></i></div>\n' +
        '            <div id="uninitialised-phones" style="margin-top:10px;color:#5a6268">\n' +
        '            </div>\n' +
        '            <div id="pagination-uninitialized-phones"></div>' +
        '        </div>\n' +
        '       <div style="width:500px; margin-top:30px">\n' +
        '            <div style="width: 100%; color:darkgrey;"><span>Nicht bereit</span><i style="float: right;" class="fas fa-redo" onclick="reloadNotReadyMacs()"></i></div>\n' +
        '            <div id="not-ready-phones" style="margin-top:10px;color:#5a6268">\n' +
        '            </div>\n' +
        '            <div id="pagination-not-ready-phones"></div>' +
        '        </div>\n' +
        '        <div style="width:500px;margin-top:30px">\n' +
        '            <div style="width: 100%; color:darkgrey;"><span>Aktiv (mit veralteter Konfiguration)</span><i style="float: right;" class="fas fa-redo" onclick="reloadIntMacs()"></i></div>\n' +
        '            <div id="initialized-phones" style="margin-top:10px; color:#5a6268;">\n' +
        '            </div>' +
        '            <div id="pagination-initialized-phones"></div>' +
        '            <div id="hash-deploy-telephone" style="margin-top:20px; width:500px; color:#5a6268; text-align:center"> </div>' +
        '            <div style="margin-top: 20px;width: 100%;display: flex;">\n' +
        '                <button type="button" class="btn btn-secondary" onclick="restartActivePhone()">Neustarten</button>\n' +
        '                <button type="button" class="btn btn-secondary" style="margin-left: 10px;"onclick="deployActivePhone()">Deployen</button>\n' +
        '                <button type="button" class="btn btn-secondary" style="margin-left: 10px;"onclick="factoryReset()">Reset</button>\n' +
        '            </div>\n' +

        '        </div>\n' +
        '    </div>\n' +
        '    <!-- Vertical Line -->\n' +
        '    <div id="divider-line" style="widht:0px; height: 700px; border-style: solid; border-width: 1px; border-color: lightgray; margin-left:50px;"></div>\n' +
        '    <div style=" margin-left:50px; width:600px">\n' +
        '        <h5>Neuer Benutzer</h5>\n' +
        '        <div id="user-input-acc">\n' +
        '        </div>\n' +
        '    </div></div>';
    userInputBuilder();
    reloadUnintMacs();
    reloadNotReadyMacs();
    reloadIntMacs();
    renewToken();
    discardSettings();
    $.myAjax(buildUrl("getdeploymentsettingshash")).done(function (response) {
        actConfigHash = response["hash"];
        document.getElementById("hash-deploy-telephone").innerHTML = '<span title="' + response["hash"] + '" style="font-size: 10pt;">Aktuelle Konfiguration SHA512 Hash: ' + response["hash"].substr(0, 20) + '...</span>';
    });
}

function userInputBuilder() {
    var inputs = '<form id="newUserForm">';
    inputs += getUserInputNewInput("MAC-Adresse", "mac");
    inputs += getUserInputNewInput("IP-Adresse", "ip");
    inputs += getUserInputNewInput("Benutzername", "user");
    inputs += getUserInputNewInput("Passwort", "secret");
    inputs += getUserInputNewInput("Anruferkennung", "callerid");
    inputs += getUserInputNewInput("PC-IP", "pc_ip");
    inputs += '</form>'
    inputs += '<div style="margin-top: 30px;"><button type="button" class="btn btn-primary" onclick="saveSettings()">Speichern</button>' +
        '<button style="float: right;" type="button" class="btn btn-secondary" onclick="discardSettings()">Zurücksetzen</button></div>';
    document.getElementById('user-input-acc').innerHTML = inputs;
    $("#divider-line").css("height", $("#user-input-acc").css("height"));
}

function saveSettings() {
    var x = document.getElementById("newUserForm");

    var text = "";
    var i;
    var queryStr = 'addqualifieduser?';
    for (i = 0; i < x.length; i++) {
        queryStr = queryStr + x.elements[i].id + "=" + x.elements[i].value + "&";
    }
    queryStr = queryStr.slice(0, -1);
    simpleApiCall(queryStr);
    simpleApiCall('reloadAsterisk/');
    reloadUnintMacs();
    reloadNotReadyMacs();
    reloadIntMacs();
    discardSettings();
}

function discardSettings() {
    var x = document.getElementById("newUserForm");
    var i;
    for (i = 0; i < x.length; i++) {
        x.elements[i].value = "";
    }
}

function reloadUnintMacs() {
    $.myAjax(buildUrl("searchnewphones")).done(function (response) {
        listit = [];
        $.each(response, function (i, item) {
            item["mac"] = i;
            item["timestamp"] = parseInt(item["timestamp"]);
            listit.push(item);
        });
        listit.sort(GetSortOrder("timestamp"));
        var side = 0;
        ready_list = [];
        value_list = [];
        $.each(listit, function (i, item) {
            ready_list.push(item.mac + ' (' + item.vendor + ')');
            value_list.push(item.mac);
        });
        buildPageableList(ready_list, value_list, "uninitialised-phones", 5, 5, "Keine Neuen gefunden", "pagination-uninitialized-phones");
    });
}

function reloadNotReadyMacs() {
    $.myAjax(buildUrl("searchnotreadyphones")).done(function (response) {
        var z = 0;
        listit = [];
        $.each(response, function (i, item) {
            item["mac"] = i;
            item["timestamp"] = parseInt(item["timestamp"]);
            listit.push(item);
        });
        listit.sort(GetSortOrder("timestamp"));
        ready_list = [];
        value_list = [];
        $.each(listit, function (i, item) {
            errormsg = "Gewünschte IP und erfasste IP stimmen nicht überein!"
            ready_list.push(item.mac + ' (' + item.vendor + ') <span style="color:red"><i title="' + errormsg + '" class="fas fa-cogs fas-no-hover"></i></span>');
            value_list.push(item.mac);
        });
        buildPageableList(ready_list, value_list, "not-ready-phones", 5, 5, "Keine Neuen gefunden", "pagination-not-ready-phones");
    });
}

function reloadIntMacs() {
    $.myAjax(buildUrl("queryallmac")).done(function (response) {
        var z = 0;
        listit = [];
        $.each(response, function (i, item) {
            item["mac"] = i;
            item["timestamp"] = parseInt(item["timestamp"]);
            listit.push(item);
        });
        listit.sort(GetSortOrder("timestamp"));
        ready_list = [];
        value_list = [];
        $.each(listit, function (i, item) {
            outdated = "";
            if (item.confighash != actConfigHash) {
                outdated = '<span style="color:red"><i title="Veraltete Konfiguration! SHA512 Hash: fe425226a...." class="fas fa-arrow-alt-circle-up fas-no-hover"></i></span>';
            }
            ready_list.push(item.mac + ' (' + item.vendor + ') [' + item.callerid + '] ' + outdated);
            value_list.push(item.mac);
        });
        buildPageableList(ready_list, value_list, "initialized-phones", 5, 5, "Keine gefunden", "pagination-initialized-phones");
    });
}

function restartActivePhone() {
    var qualified_name = actIntMacItemId;
    var mac = $("#" + qualified_name).attr("value");
    simpleApiCall("restartphone/" + mac)
}

function factoryReset() {
    var qualified_name = actIntMacItemId;
    var mac = $("#" + qualified_name).attr("value");
    simpleApiCall("factoryresetphone/" + mac)
}

function deployActivePhone() {
    var qualified_name = actIntMacItemId;
    var mac = $("#" + qualified_name).attr("value");
    simpleApiCall("deployphone/" + mac)
}

function changeSettings() {
    var qualified_name = actIntMacItemId;
    var mac = $("#" + qualified_name).attr("value");
    var x = document.getElementById("newUserForm");
    console.log("Choosen: " + mac);
    if (mac != "null") {
        list_write_into_form = []
        var url = buildUrl("querymac/" + mac);
        $.myAjax(url).done(function (response) {
            $.each(response, function (i, item) {
                list_write_into_form.push(itemOrNull(item.mac));
                list_write_into_form.push(itemOrNull(item.ip));
                list_write_into_form.push(itemOrNull(item.user));
                list_write_into_form.push(itemOrNull(item.secret));
                list_write_into_form.push(itemOrNull(item.callerid));
                list_write_into_form.push(itemOrNull(item.pc_ip));
            })

            for (i = 0; i < x.length; i++) {
                x.elements[i].value = itemOrNull(list_write_into_form[i]);
            }
        });
    } else {
        var mac = document.getElementById(qualified_name).innerHTML.split(" ")[0];
        var x = document.getElementById("newUserForm");

        for (i = 0; i < x.length; i++) {
            x.elements[i].value = itemOrNull("");
        }
        $("#mac").val(mac);
    }

}

function itemOrNull(item) {
    if (item == undefined) {
        return "";
    }
    return item;
}

function activeListClick(actItemId) {
    var qualified_name = actItemId;
    for (var key in actListItems) {
        $("#" + key).attr('class', 'list-group-item list-group-item-action list-item-mac');
        $("#" + key).css("color", "#5a6268");
    }
    actListItems[qualified_name] = 'in';
    actIntMacItemId = qualified_name;
    $("#" + qualified_name).attr('class', 'list-group-item list-group-item-action active list-item-mac');
    $("#" + qualified_name).css("color", "white");

    changeSettings();
}

function alertBootstrap(success, header, text) {
    document.getElementById("custom-alert-head").innerHTML = header;
    document.getElementById("custom-alert-msg").innerHTML = text;
    if (success) {
        $("#custom-alert").attr('class', 'alert alert-success');
    } else {
        $("#custom-alert").attr('class', 'alert alert-danger');
    }

    $("#custom-alert").fadeTo(2000, 500).slideUp(500, function () {
        $("#custom-alert").slideUp(500);
    });

}

//Comparer Function
function GetSortOrder(prop) {
    return function (a, b) {
        if (a[prop] < b[prop]) {
            return 1;
        } else if (a[prop] > b[prop]) {
            return -1;
        }
        return 0;
    }
}