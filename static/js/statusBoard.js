navBarItems = {};
var cpuChart;
var memoryChart;
var cpu_data = [];
var ram_data = [];
var intervalID = false;
var widgetCount = 0;
status_stack_cookie_store = {};

function status_board() {
    setAllInactiveNavBar();
    getStatusAndBuild();
}

function getStatusAndBuild() {
    // wrap in function that object will be created and added before widgets will be added
    $(function ($) {
        document.getElementById('cont-div').innerHTML = '<div id="status-stack-items" class="grid-stack" style="color:#5B6876;"></div>' +
            '<div style="text-align: center; margin-top: 20px;"><div class="popup text-secondary" onclick="showAddWidgetPopup()">Add Widget' +
            '<div class="popuptext" id="statusPopupMenue">' +
            '</div>' +
            '</div></div>';
        var options = {
            cellHeight: 80,
        };
        $('.grid-stack').gridstack(options);
    });

    // widgetcount:widgetid(art):x:y:arg:arg:arg
    // DEBUG: Cookies.set("status_items", "0:1:0:0;1:3:5:0:sip.easybell.de;2:2:0:4");
    widgetCount = 0;
    cpu_data = [0, 0, 0, 0, 0];
    ram_data = [0, 0, 0, 0, 0];

    var cookies_status = Cookies.get("status_items");
    cookies_status = cookies_status.split(";");

    $.myAjax(buildUrl("status-summary")).done(function (response) {

        //Add trunks-status
        items_section = response["trunk-status"]
            $.each(items_section, function (i, item) {
                trunk_name = item["trunkname"];
                document.getElementById("statusPopupMenue").innerHTML += '<div class="popup-menu-item" onclick="addWidgetToStatusboard(buildCookieIdent(3, [trunk_name]), grid)" >Trunk: '+trunk_name+'</div>';
            });

    });


    $(function ($) {
        grid = $('.grid-stack').data('gridstack');
    grid.batchUpdate();
    $.each(cookies_status, function (i, item) {
        addWidgetToStatusboard(item, grid);
    });
    grid.commit();

    var saveStateToCookie = function (items) {
        $.each(items, function (i, item) {
            storeStackPosition(item["x"], item["y"], document.getElementById(item["el"]["0"]["id"]).getAttribute("value"));
        });
        Cookies.set("status_items", Object.values(status_stack_cookie_store).join(";"));
    };

    $('.grid-stack').on('change', function (event, items) {
        saveStateToCookie(items);
        renewToken();
    });

    document.getElementById("statusPopupMenue").innerHTML += '' +
            '   <div class="popup-menu-item" onclick="addWidgetToStatusboard(buildCookieIdent(1, null), grid)" >Asterisk</div>' +
            '   <div class="popup-menu-item" onclick="addWidgetToStatusboard(buildCookieIdent(2, null), grid)">Hardware</div>' +
            '   <div class="popup-menu-item" onclick="addWidgetToStatusboard(buildCookieIdent(4, null), grid)">System Übersicht</div>';
    });

    var status_auto_refresh_10_sek = setInterval(function () {
              refreshAllStatusBoardWidgets();
          }, 10000);
}

function buildCookieIdent(type, args) {
    arg_str = "";
    if (args != null && args.length > 0) {
        arg_str += ":" + args.join(":");
    }
    cookie_str = widgetCount + ":" + type + ":0:0" + arg_str;
    return cookie_str;
}

function addWidgetToStatusboard(valstr, grid) {

    $.myAjax(buildUrl("status-summary")).done(function (response) {
        item_and_vars = valstr.split(":");
        widgetCount_load = item_and_vars[0];
        widId = item_and_vars[1];
        x = item_and_vars[2];
        y = item_and_vars[3];
        arg1 = item_and_vars[4];
        if (widId == 1) {
            items_section = response["asterisk-systemstatus"];
            vare = getFourInfoStatusWid("Asterisk Server Status", items_section["status"], getStatusList(items_section, "asterisk-systemstatus", ""), "asterisk-systemstatus-" + widgetCount_load, x, y, valstr);
            grid.addWidget(vare, x, y, 4, 3);
        } else if (widId == 2) {
            items_section = response["system-status"]
            vare = getFourInfoStatusWid("Hardware Status", items_section["status"], getStatusList(items_section, "system-status", ""), "system-status-" + widgetCount_load, x, y, valstr);
            grid.addWidget(vare, x, y, 4, 3);
        } else if (widId == 3) {
            items_section = response["trunk-status"]
            $.each(items_section, function (i, item) {
                if (item["trunkname"] == arg1) {
                    vare = getFourInfoStatusWid("Trunk Status", item["status"], getStatusList(items_section, "trunk-status", item["trunkname"]), "trunk-status-" + item["trunkname"] + "-" + widgetCount_load, x, y, valstr);
                    grid.addWidget(vare, x, y, 4, 3);
                }
            });
        }
    });
    item_and_vars = valstr.split(":");
    widgetCount_load = item_and_vars[0];
    widId = item_and_vars[1];
    x = item_and_vars[2];
    y = item_and_vars[3];
    arg1 = item_and_vars[4];
    if (widId == 4) {
        id = "hardware-bar-status";
        vare = getVerticalBar(id, widgetCount_load, valstr, x, y);
        grid.addWidget(vare, x, y, 5, 6);
        var ctx = document.getElementById("canvas-cpu-chart-" + widgetCount_load).getContext("2d");
        var ctx2 = document.getElementById("canvas-memory-chart-" + widgetCount_load).getContext("2d");

        data = {
            "labels": ['4s', '3s', '2s', '1s', '0s'],
            "datasets": [{
                steppedLine: true,
                "label": "CPU Usage in %",
                "data": cpu_data,
                "fill": false,
                "borderColor": ["rgba(54, 162, 235, 0.6)"],
                fill: true,
                "backgroundColor": ["rgba(54, 162, 235,1)"],
                "borderWidth": 2
            }]
        };
        options = {
            "animation": false,
            "scales": {"xAxes": [{"ticks": {"beginAtZero": true}}], "yAxes": [{"ticks": {"max": 100, "min": 0}}]}
        };
        cpuChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: options
        });

        data2 = {
            "labels": ['4s', '3s', '2s', '1s', '0s'],
            "datasets": [{
                steppedLine: true,
                "label": "RAM Usage in %",
                "data": ram_data,
                "fill": false,
                "borderColor": ["rgba(54, 162, 235, 0.6)"],
                fill: true,
                "backgroundColor": ["rgba(54, 162, 235,1)"],
                "borderWidth": 2
            }]
        };

        memoryChart = new Chart(ctx2, {
            type: 'line',
            data: data2,
            options: options
        });
        if (intervalID === false) {
            intervalID = setInterval(function () {
                updateSysPerf();
            }, 1000);
        }
    }
    widgetCount = Math.max(widgetCount, widgetCount_load) + 1;
}

function showAddWidgetPopup() {
    var popup = document.getElementById("statusPopupMenue");
    popup.classList.toggle("show");
}

function storeStackPosition(x_position, y_position, old_string) {
    item_and_vars = old_string.split(":");
    /* Reminder:
        widgetCount = item_and_vars[0];
        widId = item_and_vars[1];
        x = item_and_vars[2];
        y = item_and_vars[3];
        arg1 = item_and_vars[4];
    */
    item_and_vars[2] = x_position;
    item_and_vars[3] = y_position;
    status_stack_cookie_store[item_and_vars[0]] = item_and_vars.join(":");
}


function timespan_easy(date) {
    if (isNaN(date) == false) {
        date = new Date(date * 1000);
        datediff = Date.now() - date;
        datediff = datediff / 1000;
        if (datediff > 604800) {
            return Math.floor(datediff / 604800) + " Woche(n)";
        } else if (datediff > 86400) {
            return Math.floor(datediff / 86400) + " Tag(e)";
        } else if (datediff > 3600) {
            return Math.floor(datediff / 3600) + "h";
        } else if (datediff > 60) {
            return Math.floor(datediff / 60) + "m";
        } else {
            return Math.floor(datediff) + "s";
        }
    } else {
        return "-";
    }
}

function getVerticalBar(id, count, valstr, x, y) {
    id = id + "-" + count;
    return '<div class="grid-stack-item" id="' + id + '"  data-gs-x="' + x + '" data-gs-y="' + y + '" data-gs-width="5" data-gs-height="6" data-gs-no-resize="yes" value="' + valstr + '">' +
        '<div class="grid-stack-item-content" style="border-radius: 5px; border-width: 1px; border-style: solid; border-color:#DFDFDF;padding-left: 20px; padding-right: 20px; padding-bottom: 10px; display:flex; flex-direction: column; justify-content: space-around">' +
        '            <div id="topbarid" style="flex-grow: 0;">\n' +
        '                <div style="font-size:18px; float: left; color:' + getColorBootstrapForStatus(1) + ' ; margin-top: 15px">System</div>\n' +
        '                <div style="float: right; color:#DFDFDF;padding-top:10px">\n' +
        '                    <i style="margin-top: 5px;font-size: 13px;" class="fas fa-times" onclick="deleteWidgetStatusboard(\'' + id + '\', null)"></i>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '<div style="flex-grow:1;justify-content:space-evenly; display: flex; flex-direction: column;">' +
        '<canvas style="overflow: hidden" id="canvas-cpu-chart-' + count + '"></canvas>' +
        '<canvas  style="overflow: hidden" id="canvas-memory-chart-' + count + '"></canvas>' +
        '</div></div></div>';
}

function updateDataCharts() {
    cpuChart.data.data = cpu_data;
    memoryChart.data.data = ram_data;
    cpuChart.update();
    memoryChart.update();
}

function addDataPoint(array, point) {
    array.push(point);
    array.shift();
}

function updateSysPerf() {
    $.myAjax(buildUrl("status/system-status")).done(function (response) {
        value = response["cpu-percent"];
        addDataPoint(cpu_data, value);
        mem_value = response["ram-percent"];
        addDataPoint(ram_data, mem_value);
        updateDataCharts();
    });
}

function refreshAllStatusBoardWidgets() {
    grid = $('.grid-stack').data('gridstack');
    items = grid.grid.nodes;
    $.each(items, function (i, item) {
        id = item["el"]["0"]["id"];
        if (document.getElementById(id).getAttribute("value").split(":")[1] != 4) {
            console.log("RealIDS: " + id);
            refreshStatusboardWidget(id);
        }
    });


}

function refreshStatusboardWidget(id) {
    renewToken();
    value = document.getElementById(id).getAttribute("value");
    //TODO: Code enhancement -> Umschreiben -> alles sollte mit den Values arbeiten die Loesung mit trunk-name in id ist nicht sauber
    //console.log(value);
    $.myAjax(buildUrl("status/" + id.split("-").slice(0, 2).join("-"))).done(function (response) {
        trunkN = id.split("-")[id.split("-").length - 1];
        if (id.split("-")[0] == "trunk" && id.split("-")[1] == "status") {
            liste = getStatusList(response, "trunk-status", trunkN);
        } else {
            console.log(id.split("-").slice(0, 2).join("-"));
            liste = getStatusList(response, id.split("-").slice(0, 2).join("-"), "");
        }
        itemCode = "";
        $.each(liste, function (i, item) {
            itemCode += '<div style="clear:both; padding-top:15px"><div style="float: left; ">' + item[0] + ':</div><div style="float: right;">' + item[1] + '</div></div>';
        });
        document.getElementById(id + "-statusBoard-items").innerHTML = itemCode;

        document.getElementById(id + "-header-status").style.color = getColorBootstrapForStatus(response["status"]);

    });
}

function deleteWidgetStatusboard(id) {
    renewToken();
    grid = $('.grid-stack').data('gridstack');
    var myElement = $(id);
    items = grid.grid.nodes;
    $.each(items, function (i, item) {
        if (item["el"]["0"]["id"] == id) {
            delete status_stack_cookie_store[document.getElementById(item["el"]["0"]["id"]).getAttribute("value").split(":")[0]];
            grid.removeWidget(item["el"]);
        }
    });
}

function getStatusList(response, id, trunk) {
    items_ready = []
    if (id == "asterisk-systemstatus") {
        items_ready.push(["Version", asterisk_version = response["running-asterisk-version"]]);
        items_ready.push(["Letzter Neustart", core_restart = timespan_easy(response['last-core-restart'])]);
        items_ready.push(["Letzter reload", timespan_easy(response['last-core-reload'])]);
        items_ready.push(["AMI Version", response["running-manager-version"]]);
    }
    else if (id == "trunk-status") {
        $.each(response, function (i, item) {
            items_ready.push(["Trunk", item["trunkname"]])
            items_ready.push(["Benutzername", item["user"]])
            items_ready.push(["Verbunden seit", timespan_easy(item['connected_since'])])
            items_ready.push(["Kanäle", item["channels"]])
        });
    }
    else if (id == "system-status") {
        items_ready.push(["RAM total", (response["ram-total"] / (1024 * 1024 * 1024)).toFixed(2) + " GB"]);
        items_ready.push(["RAM frei", (response["ram-free"] / (1024 * 1024 * 1024)).toFixed(2) + " GB"]);
        items_ready.push(["HDD total", (response["hdd-total"] / (1024 * 1024 * 1024)).toFixed(2) + " GB"]);
        items_ready.push(["HDD frei", (response["hdd-free"] / (1024 * 1024 * 1024)).toFixed(2) + " GB"]);
    }
    return items_ready;
}

function getFourInfoStatusWid(headline, status, items, id, x, y, varstr) {
    itemCode = '<div class="grid-stack-item" id="' + id + '" data-gs-x="' + x + '" data-gs-y="' + y + '" data-gs-width="4" data-gs-height="3" data-gs-no-resize="yes" value="' + varstr + '">\n' +
        '    <div class="grid-stack-item-content" style="border-radius: 5px; border-width: 1px; border-style: solid; border-color:#DFDFDF;padding-left: 20px; padding-right: 20px;">\n' +
        '            <div id="topbarid" style="">\n' +
        '                <div id="'+id+'-header-status" style="font-size:18px; float: left; color:' + getColorBootstrapForStatus(status) + ' ; margin-top: 15px">' + headline + '</div>\n' +
        '                <div style="float: right; color:#DFDFDF;padding-top:10px">\n' +
        '                    <i style="font-size: 13px;" class="fas fa-redo" onclick="refreshStatusboardWidget(\'' + id + '\')"></i>\n' +
        '                    <i style="margin-left: 5px;font-size: 13px;" class="fas fa-times" onclick="deleteWidgetStatusboard(\'' + id + '\')"></i>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '            <div id="' + id + '-statusBoard-items" style="clear:both; padding-left:30px; padding-right: 30px; padding-top:25px">\n';
    $.each(items, function (i, item) {
        itemCode += '<div style="clear:both; padding-top:15px"><div style="float: left; ">' + item[0] + ':</div><div style="float: right;">' + item[1] + '</div></div>';
    });
    itemCode += '            </div>\n' +
        '        </div></div>';
    return itemCode;
}

function getColorBootstrapForStatus(status) {
    if (status == 0) {
        return "#d9534f";
    } else if (status == 1) {
        return "#5cb85c"
    } else if (status == 2) {
        return "#f0ad4e"
    } else {
        return "#0275d8"
    }
}

function setAllInactiveNavBar() {
    for (var key in navBarItems) {
        $("#" + key).attr('class', 'nav-item');
    }
}