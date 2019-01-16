$.myAjax = function(url, username, password){
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



function login() {
    var url = "https://" + window.location.hostname + ":" + window.location.port+ "/api/token";
    var username = $("#username").val();
    var password = $("#password").val();

    resss = $.myAjax(url, username, password);
    resss.done(function (response) {

        Cookies.set("token", response["token"]);
        Cookies.set("tokendur", response["duration"]);
        Cookies.set("tokenstamp", response["timestamp"]);

        document.getElementById('errorSpan').innerHTML = "";
        document.location.href=document.location.href;
    });
    resss.fail(function (response)  {
        console.log("not in");
        document.getElementById('errorSpan').innerHTML = "Username or Password Wrong";
    });

}