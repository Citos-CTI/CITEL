var lastTokenTime = "";
var lastTokenSpan = "";

$.myAjax = function(url){
    return $.ajax({
        contentType: "application/json",
        url: url,
        type: "GET",
        dataType: "json",
         headers: {
            //TODO: Remove Hard coded Password -> only for dev purpose
        'Authorization' : "Basic " + btoa("admin:admin")
         }
    });
}

function buildUrl(call) {
    var host = window.location.hostname;
    var port = window.location.port;
    var url = "https://" + host + ":" + port+ "/api/"+call;
    return url;
}


function login() {
    var url = "https://" + window.location.hostname + ":" + window.location.port+ "/api/token";

    resss = $.myAjax(url);
    resss.done(function (response) {
        Cookies.set("token", response["token"]);
        Cookies.set("tokendur", response["duration"]);
        Cookies.set("tokenstamp", response["timestamp"]);
    });
    resss.fail(function (response)  {
        console.log("not in");
    });

}


function logout() {
     Cookies.set("token", "");
     Cookies.set("tokendur", "");
     Cookies.set("tokenstamp", "");
    location.reload();
}


function simpleApiCall(call) {
    var host = window.location.hostname;
    var port = window.location.port;
    var url = "https://" + host + ":" + port+ "/api/"+call;
    $.myAjax(url).done(function (response) {
         if(response.hasOwnProperty('func_id')) {
             resp_funct = response["func_id"]
             if(resp_funct=="reset_phone" || resp_funct=="restart_phone") {
                    alertBootstrap(response["success"],response["header"], response["message"])
             }
        }
        if(response["success"]== true) {
            console.log("Positive");
            return true;
        } else {
            console.log("FALSE");
            return false;
        }

    });
}

$.renewToken = function(url, username, password){
    return $.ajax({
        contentType: "application/json",
        url: url,
        type: "GET",
        dataType: "json",
         headers: {
        'Authorization' : "Basic " + btoa(username + ":"+password)
         }
    });
}
function renewToken() {
    var url = "https://" + window.location.hostname + ":" + window.location.port+ "/api/token";
    resss = $.myAjax(url, token, "undefined");
    resss.done(function (response) {
        lastTokenSpan = response["duration"]+"";
        lastTokenTime = response["timestamp"]+"";
        token = response["token"];
        Cookies.set("token", token);
        Cookies.set("tokendur", lastTokenSpan);
        Cookies.set("tokenstamp", lastTokenTime);
    });
}


function tokenTimer() {
    var now = Math.round(Date.now()/1000);
    var lastTimeStamp = Number(lastTokenTime.split(".")[0]);
    var timeToShow = Math.floor(lastTokenSpan/60) - Math.floor((now-lastTimeStamp)/60);
    if(timeToShow<1) {
        logout();
    }
    document.getElementById('timeUntLogout').innerHTML = timeToShow+"m";
}