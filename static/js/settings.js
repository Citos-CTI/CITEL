actListItems = {}
var actTelefonSettingsItem = -1;
var currentSettings = "";

function ser_settings() {
    currentSettings = "server";
    setActiveNavBar("ser_settings");
    loadSettingsAndBuild();
    renewToken();
}

function settings() {
    currentSettings = "deployment";
    setActiveNavBar("settings");
    loadSettingsAndBuild();
    renewToken();
}

function loadSettingsAndBuild() {
    document.getElementById("cont-div").innerHTML = '<div  style="display: flex; flex-direction: row;">\n' +
        '    <div id="tabs-deploy-settings-tabs" class="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical"></div>\n' +
        '<div id="tabs-deploy-settings-content" class="tab-content" id="v-pills-tabContent"></div>\n' +
        '</div>\n' +
        '\n' +
        '    <div id="buttons-deploy-settings" style="margin-top:50px; display:flex; flex-direction: row ;justify-content: space-between;">\n' +
        '    </div>\n' +
        '    <div id="hash-deploy-settings" style="margin-top: 20px">\n' +
        '    </div>';

    settingstosavetext = [];
    settingstosavemenue = [];
    settingstosavecheck = [];
    settingstosavetextarea = [];
    var host = window.location.hostname;
    var port = window.location.port;
    var url = "https://" + host + ":" + port;
    if(currentSettings == "server"){
        url = url + "/api/serversettings";
    } else if (currentSettings == "deployment") {
        url = url + "/api/deploymentsettings";
    }
    $.myAjax(url).done(function (response) {
        document.getElementById('tabs-deploy-settings-tabs').innerHTML = "";
        document.getElementById('tabs-deploy-settings-content').innerHTML = "";
        anz_cat = response.num_categories;
        for(cat = 0; cat < anz_cat; cat++) {
            document.getElementById('tabs-deploy-settings-tabs').innerHTML += '  <a class="'+getFirstSettingsTab(cat)+'" id="v-pills-'+cat+'-tab" data-toggle="pill" href="#v-pills-'+cat+'" role="tab" aria-controls="v-pills-'+cat+'" aria-selected="true">'+response.categories[cat]+'</a>\n';
            document.getElementById('tabs-deploy-settings-content').innerHTML += '  <div class="'+getFirstSettingsContent(cat)+'" id="v-pills-'+cat+'" role="tabpanel" aria-labelledby="v-pills-'+cat+'-tab"></div>\n';
            bucket = [];
            $.each(response.settings, function (i,item) {
                if(item.category == cat) {
                    obj = "";
                    if(item.art == 1) {
                    obj = getUserInputNewInput(item.text,item.json, cleanUpString(item.value), false);
                    settingstosavetext.push(item.json);
                } else if (item.art == 2) {
                    obj = getUserInputNewInput(item.text,item.json, cleanUpString(item.value), true);
                    settingstosavetext.push(item.json);
                } else if (item.art == 3) {
                    value_loc = item.value;
                    possible_loc = item.possible;
                    possible_loc.splice(possible_loc.indexOf(value_loc), 1);
                    obj = getSettingsFieldMenue(item.text,item.json, value_loc, possible_loc);
                    settingstosavemenue.push(item.json);
                } else if (item.art == 4) {
                    obj = getSettingsFieldCheckbox(item.text, item.json, cleanUpString(item.value));
                    settingstosavecheck.push(item.json);
                } else if (item.art == 5) {
                    obj = getTextArea(item.text, item.json, cleanUpString(item.value));
                    settingstosavetextarea.push(item.json);
                }
                 bucket[item.position] = obj;

                }
            })
            var insert = '<div style="margin-left: 50px; width:500px"><h4>'+response.categories[cat]+'</h4>';
            $.each(bucket, function (i, item) {
                insert += item;
            })
             insert += '</div>';
            document.getElementById('v-pills-'+cat).innerHTML += insert;

        }

        document.getElementById('buttons-deploy-settings').innerHTML = '' +
            '        <button type="button" class="btn btn-primary" onclick="saveDeploySettings()">Speichern</button>\n' +
            '        <button type="button" class="btn btn-secondary" onclick="discardDeploySettings()">Verwerfen</button>';

        var nw = Number($("#tabs-deploy-settings-tabs").css("width").split("p")[0]) + Number($("#tabs-deploy-settings-content").css("width").split("p")[0]);
        $("#buttons-deploy-settings").css('width', nw);
    });
    if(currentSettings=="deployment") {
        $.myAjax(buildUrl("getdeploymentsettingshash")).done(function (response) {
            var nw = Number($("#tabs-deploy-settings-tabs").css("width").split("p")[0]) + Number($("#tabs-deploy-settings-content").css("width").split("p")[0]);
            document.getElementById("hash-deploy-settings").innerHTML = '<div style="width:' + nw + 'px; text-align: center;"><span title="' + response["hash"] + '" style="font-size: 10pt;">SHA512 Hash: ' + response["hash"].substr(0, 20) + '...</span></div>';
        });
    }
}

function getFirstSettingsContent(zz) {
    if(zz == 0) {
        return "tab-pane fade show active";
    } else {
        return "tab-pane fade";
    }
}

function getFirstSettingsTab(zz) {
    if(zz == 0) {
        return "nav-link active";
    } else {
        return "nav-link";
    }
}

function discardDeploySettings() {
        loadSettingsAndBuild();
}

function saveDeploySettings() {
    var valuesWriteBack = "?";
    $.each(settingstosavetext, function (i, item) {
        val = document.getElementById(item).value;
        valuesWriteBack += item +"=" + val + "&";
    })
    $.each(settingstosavemenue, function (i, item) {
        var id = $('#'+item+' :selected').text();
        console.log(id);
          valuesWriteBack += item + "=" + id + "&";
    })
    $.each(settingstosavecheck, function (i, item) {
        var state = "false"
        if ( $("#"+item).prop( "checked" ) ) {
            state = "true";
        }
        valuesWriteBack += item + "=" + state + "&";
    })
    $.each(settingstosavetextarea, function (i,item) {
        var textAreaVal = $('#'+item).val();
        valuesWriteBack += item + "=" + textAreaVal + "&";
    })
    valuesWriteBack = valuesWriteBack.slice(0, -1);
    console.log(valuesWriteBack);
    if(currentSettings=="deployment") {
        $.myAjax(buildUrl("writedeploymentsettings" + valuesWriteBack)).done(function (response) {
            var nw = Number($("#tabs-deploy-settings-tabs").css("width").split("p")[0]) + Number($("#tabs-deploy-settings-content").css("width").split("p")[0]);
            document.getElementById("hash-deploy-settings").innerHTML = '<div style="width:' + nw + 'px; text-align: center;"><span title="' + response["hash"] + '" style="font-size: 10pt;">SHA512 Hash: ' + response["hash"].substr(0, 20) + '...</span></div>';
        });
    } else if(currentSettings=="server") {
         $.myAjax(buildUrl("writeserversettings" + valuesWriteBack)).done(function (response) {
            if(response["success"]==true) {
                alertBootstrap(true, "Erfolgreich", "Einstellungen erfolgreich gespeichert und aktiviert!")
            }
         });
    }
}


function changeSettingsBox(actItemId) {
    console.log(actItemId);
    var qualified_name = "v-pills-telefon-setings"+actItemId;
    for(var key in actListItems){
        $("#"+key).attr('class', 'nav-link text-primary');
    }
    actListItems[qualified_name] = 'in';
    actTelefonSettingsItem = actItemId;
    $("#"+qualified_name).attr('class', 'nav-link active nav-link-active-white');
    showSettingsBox(1);
}


function showSettingsBox(id) {
    $('#v-pills-profile').tab('show')
}

function getSettingsFieldCheckbox(content, json, value) {
    checked = "";
    if(value == "true") {
        checked = "checked";
    }
    return '<div style="margin-top: 30px;" class="custom-control custom-checkbox">\n' +
        '  <input type="checkbox" class="custom-control-input" id="'+json+'" '+checked+'>\n' +
        '  <label class="custom-control-label" for="'+json+'">'+content+'</label>\n' +
        '</div>'
}

function getSettingsFieldMenue(content,json, selected, options) {
    var html =  '<div class="input-group mb-3" style="margin-top: 30px;">' +
        '<div class="input-group-prepend">' +
        '<span class="input-group-text" id="basic-addon1">'+content+'</span>' +
        '</div>' +
        '<select class="custom-select mr-sm-2" id="'+json+'">\n' +
        '        <option selected pos="0">'+selected+'</option>\n';
    var z = 0;
    $.each(options, function( index, option ) {
        html += '<option pos="'+(z+1)+'" value="'+z+'">'+option+'</option>';
        ++z;
        });

    html += '</select></div>';

    return html;

}

function getTextArea(content, json, value) {
    return '<div class="form-group" style="margin-top: 30px;">\n' +
        '    <label for="exampleFormControlTextarea1">'+content+':</label>\n' +
        '    <textarea class="form-control" id="'+json+'" rows="5">'+value+'</textarea>\n' +
        '  </div>';

}

function getUserInputNewInput(fieldname, json_name, value, typeVal) {
    valtypstr = "text";
    if(typeVal) {
        valtypstr = "number";
    }

    return '<div class="input-group mb-3" style="margin-top: 30px;">' +
        '        <div class="input-group-prepend">' +
        '              <span class="input-group-text" id="basic-addon1">'+fieldname+'</span>' +
        '        </div>' +
        '        <input type="'+valtypstr+'" value="'+value+'" id="'+json_name+'"class="form-control" aria-label="'+fieldname+'" aria-describedby="basic-addon1">' +
        '  </div>';
}

