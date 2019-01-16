var lastUrl = "";
var ip_array = [];
var settings_name = [];
var settings_var_temp = [];
navBarItems = {};




$(document).ready(function () {
    $("#custom-alert").hide();

    if (Cookies.get("token")!=null) {
      token = Cookies.get("token");
      lastTokenSpan = Cookies.get("tokendur");
      lastTokenTime = Cookies.get("tokenstamp");
          var intervalID = setInterval(function () {
              tokenTimer();
          }, 1000);
      tokenTimer();
    } else {
        document.location.href = "https://" + window.location.hostname + ":" + window.location.port + "/"
    }
})



function users() {
    setActiveNavBar("users");
    document.getElementById('cont-div').innerHTML = '' +
        '<div style="float:left; width: 100%; display: flex;\n' +
        '    align-items: center;justify-content: space-between\n' +
        '    ">\n' +
        '        <div style="display:flex">\n' +
        '           <button type="button" class="btn btn-primary" onclick="addUser()">Hinzufügen</button>\n' +
        '                <input class="form-control" name="search" id="searchField" placeholder="Benutzer suchen...."\n' +
        '                style="float:right; margin-left: 5px;"/>\n' +
        '        </div>\n' +
        '            <div >\n' +
        '             <button type="button" id="applyChangesButton" style="margin-left: 10px; color:white" class="btn btn-warning" hidden="true" onclick="applyUserChanges()">Übernehmen und Aktivieren</button>\n' +
        '            <button type="button" id="discardChangesButton" style="margin-left: 5px; color:white" class="btn btn-warning" hidden="true" onclick="discardUserChanges()">Verwerfen</button>\n' +
        '            </div>\n' +
        '        </div>' +
        '<div class="table-responsive">\n' +
        '        <table id="resTable" style="margin-top:10px;overflow-y:scroll" class="table table-striped">\n' +
        '            <thead>' +
        '            <tr align="center">' +
        '                <th>IP</th>\n' +
        '                <th>Username</th>\n' +
        '                <th>Secret</th>\n' +
        '                <th>CallerID</th>\n' +
        '                <th>MAC</th>\n' +
        '                <th>PC-IP</th>\n' +
        '                <th>Löschen</th>\n' +
        '            </tr>\n' +
        '            </thead>\n' +
        '            <tbody id="resBody">\n' +
        '            </tbody>\n' +
        '        </table>\n' +
        '    </div>';
     $("#searchField").keyup(function () {
              var query = $("#searchField").val();
              queryDB(query);
          });
    queryDB("");
    renewToken();
}

function setActiveNavBar(navItemId) {
    for(var key in navBarItems){
        $("#"+key).attr('class', 'nav-item');
    }
    navBarItems[navItemId] = 'in';
    $("#"+navItemId).attr('class', 'nav-item active');
}


function querySettings() {
    var host = window.location.hostname;
    var port = window.location.port;
    var url = "https://" + host + ":" + port;
    url = url + "/api/getsettings";
    $.myAjax(url).done(function (response) {
        var z = 0;
        settings_name = [];
        settings_var_temp = [];
        elements = [response.length];
        $('#settingsTable').empty();

        $.each(response, function (i,item) {
            if(!i.startsWith("_setting")) {
                settings_name.push(i);
                settings_var_temp.push(item);
                var name_var = response["_setting"+i][0];
                var position = response["_setting"+i][1];
                var description = response["_setting"+i][2];
                elements[position]='<tr style="margin-top:5px"><td style="width: 30%"><span style="cursor:pointer" title="'+description+'">'+name_var+'</span></td><td style="color:darkgray; display:flex;"><div id="div'+z+'"><input style="color:darkgrey; border: none; background: transparent; border-bottom: 1px solid #fff; outline: none;" type="text" id="val'+z+'" readonly value="'+item+'"/><i id="schrval'+z+'" style="margin-left:10px" class="fas fa-wrench" onclick="edit(\'val'+z+'\')"></i></div> </td></tr>';
                ++z;
            }
        });
        $.each(elements, function (i,item) {
            $('#settingsTable').append(item);
        });
        $('#settingsTable').append('<tr style="margin-top:5px">\n' +
            '    <td style="width:30%"><button type="button" class="btn btn-primary" onclick="saveSettings()">Speichern und Aktivieren</button></td>\n' +
            '    <td><button type="button" class="btn btn-secondary" onclick="discardSettings()">Verwerfen</button></td>\n' +
            '</tr>');
    });

}

function queryDB(query) {

    var host = window.location.hostname;
    var port = window.location.port;
    var url = "https://" + host + ":" + port;
    if (query.length == 0) {
        url = url + "/api/queryAll";
    } else {
        url = url + "/api/query/" + query;
    }
    lastUrl = url;
    runQuery(url);
}

function runQuery(url) {
    ip_array = [];
    $.myAjax(url).done(function (response) {
        $('#resBody').empty();
        if (response.length == 0) {
            $('#resBody').append('<tr><td></td><td></td><td>&lt;not found&gt;</td><td></td><td></td>');
        }
        var z = 0;

        const ordered = {};
        Object.keys(response).sort().forEach(function(key) {
            ordered[key] = response[key];
        });

        if(Object.keys(ordered).length > 0) {

            $.each(ordered, function (i, item) {

                ip_array.push(i);
                console.log(item.mac);
                $('#resBody').append('<tr>' +

                    createTdElement('listItip', z, cleanUpString(i)) +

                    createTdElement('listItuser', z, cleanUpString(item.user)) +

                    createTdElement('listItsecret', z, cleanUpString(item.secret)) +

                    createTdElement('listItcallerid', z, cleanUpString(item.callerid)) +

                    createTdElement('listItmac', z, cleanUpString(item.mac)) +

                    createTdElement('listItpc_ip', z, cleanUpString(item.pc_ip)) +

                    '<td align="center" style="color:darkgray;"><i id="schr3" style="margin-left:5px" class="fas fa-minus-circle" onclick="deleteUser(\'' + i + '\')"></i></td></tr>');
                z = z + 1;
            });
        } else {
             $('#resBody').append('<tr>' +
            createTdElement('-', z, "-") +
            createTdElement('-', z, "-") +
            createTdElement('-', z, "-") +
            createTdElement('-', z, "-") +
            createTdElement('-', z, "-") +
            createTdElement('-', z, "-") +
            '<td align="center" style="color:darkgray;"><i id="schr3" style="margin-left:5px" class="fas fa fa-ban"></i></td></tr>');
        }

    });
}

function cleanUpString(string) {
    if(string==undefined) {
        return "";
    }
    string = string.replace(/['"]+/g, '');
    return string;
}

function createTdElement(name, count, value) {
    return '<td><input class="coolInp" onclick="edit(\''+ name + count + '\')" onfocus="edit(\''+ name + count + '\')" type="text" id="'+ name + count + '" readonly value="' + value + '" /></td>'
}


function edit(name) {
    var valOpt = $("#" + name);
    var strLength = valOpt.val().length * 2;
    //valOpt[0].setSelectionRange(strLength, strLength);
    valOpt.css("color", "black");
    valOpt.attr("readonly", false);
    $("#schr" + name).css("color", "#00000000");

    valOpt.focusout(function () {
        focusAway(name);
        //write Back
        writeBackToServer(name);
    });

    valOpt.on("keyup", function (event) {
        if (event.which == 13) {
            /*    if(!$("#val"+(num+1)).length == 0) {
                    focusAway(num);
                    edit(num+1);
                  } else {*/
            valOpt.blur();
            focusAway(name);
            //  }

        }
    });
}

function focusAway(name) {
    var valOpt = $("#" + name);
    valOpt.css("color", "darkgrey");
    valOpt.attr("readonly", true);
    $("#schr" + name).css("color", "darkgrey");
}
function writeBackToServer(name) {
    if(name.startsWith("listIt")) {
        var number = name.replace(/[^0-9\.]+/g, '');
        var variable = name.split("listIt")[1].replace(new RegExp("[0-9]"), "")
        simpleApiCall("alteruser?id=" + ip_array[number] + "&var=" + variable + "&new=" + $("#" + name).val());
        showButtons();
    } else if (name.startsWith("val")) {
        var number = name.replace(/[^0-9\.]+/g, '');
        settings_var_temp[number] = $("#" + name).val();
    }

}
function applyUserChanges() {
    hideButtons();
    simpleApiCall("saveusersettings/");
    queryDB("");
}

function discardUserChanges() {
    hideButtons();
    simpleApiCall("discardusersettings/");
    queryDB("");
}

function showButtons() {
    $("#applyChangesButton").attr("hidden", false);
    $("#discardChangesButton").attr("hidden", false);
}

function hideButtons() {
    $("#applyChangesButton").attr("hidden", true);
    $("#discardChangesButton").attr("hidden", true);
}

function saveSettings() {
    var queryStr= 'altersetting?';
    $.each(settings_var_temp, function (i,item) {
        queryStr = queryStr + settings_name[i] + "=" + item + "&";
    });
    queryStr = queryStr.slice(0, -1);
    simpleApiCall(queryStr);
    simpleApiCall('reloadAsterisk/');
}

function discardSettings() {
    alert("discard");
    querySettings();
}

function deleteUser(id) {
    simpleApiCall("deleteUser/"+id);
    showButtons();
}

function addUser() {
        simpleApiCall("addUser/0.0.0.0");
        runQuery(lastUrl);
}