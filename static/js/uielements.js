// ****************** PAGINATION BUILD WITH BOOTSTRAP*********************************
pagination_dict = [];

function changeSite(tonum, name, number, sites_to_show) {
    sites_to_show = parseFloat(sites_to_show);
    if (sites_to_show % 2 == 0) {
        sites_to_show -= 1;
    }
    pagination_dict[name] = tonum;
    for (var i = 0; i < number; ++i) {
        // hide all result sites -> later we'll unhide the one to show
        document.getElementById(name + i).hidden = true;
        // enable all pagination options -> later we'll disable the one were currently on (indicates where user is)
        document.getElementById(name + (i + 1) + "-auswl").classList.remove('disabled');
        // Hide all pagination options to later select only 5 we are intereseted in
        document.getElementById(name + (i + 1) + "-auswl").hidden = true;
    }

    // Determine how much sites we want to show to the left and the right side
    var side_limit = Math.ceil(sites_to_show / 2);

    // We dont want to show all pagination options only max as much as sites_to_show is set
    if (pagination_dict[name] < side_limit) {
        for (var i = 0; i < Math.min(number, sites_to_show); ++i) {
            document.getElementById(name + (i + 1) + "-auswl").hidden = false;
        }
    } else if (number - pagination_dict[name] <= side_limit) {
        for (var i = number - sites_to_show; i < number; ++i) {
            document.getElementById(name + (i + 1) + "-auswl").hidden = false;
        }
    } else {
        for (var i = (parseInt(pagination_dict[name]) - (side_limit - 1)); i < (parseInt(pagination_dict[name]) + side_limit); ++i) {
            document.getElementById(name + (i + 1) + "-auswl").hidden = false;
        }
    }

    // unhide the one element we want to show
    document.getElementById(name + tonum).hidden = false;
    // disable the item we have currently selected
    document.getElementById(name + (parseInt(tonum) + 1) + "-auswl").classList.add('disabled');

    // Corner cases for next and previous button (has to be disabled if no next item exists):
    if(pagination_dict[name]==0 && pagination_dict[name]==number-1) {
        document.getElementById(name+'-leftend').classList.add('disabled');
        document.getElementById(name+'-rightend').classList.add('disabled');
    } else if (pagination_dict[name] == 0) {
        document.getElementById(name+'-rightend').classList.remove('disabled');
        document.getElementById(name+'-leftend').classList.add('disabled');
    } else if (pagination_dict[name] == number-1){
        document.getElementById(name+'-rightend').classList.add('disabled');
        document.getElementById(name+'-leftend').classList.remove('disabled');
    } else {
        document.getElementById(name+'-rightend').classList.remove('disabled');
        document.getElementById(name+'-leftend').classList.remove('disabled');

    }
}

function next_site(right, name, number, sites_to_show) {
    // hack -> the if's disable the onclick function if all at left or right (thats cause its only pretended that the button doesnt work)
    if(right==true && pagination_dict[name] <= number-2) {
        pagination_dict[name] = parseInt(pagination_dict[name]) + 1;
        changeSite(pagination_dict[name], name, number, sites_to_show);
    } else if (right == false && pagination_dict[name] >=1) {
        pagination_dict[name] = pagination_dict[name] - 1;
        changeSite(pagination_dict[name], name, number, sites_to_show);
    }
}

function addPagination(number, page_name, sites_to_show) {
    str =   '           <nav style="margin-top:10px" aria-label="Page navigation example">\n' +
            '  <ul class="pagination justify-content-center">\n' +
            ' <li id="'+page_name+'-leftend" class="page-item" onclick="next_site(false,\''+page_name+'\', \''+number+'\', \''+sites_to_show+'\')">\n' +
            '      <a class="page-link" aria-label="Previous">\n' +
            '        <span aria-hidden="true">&laquo;</span>\n' +
            '        <span class="sr-only">Previous</span>\n' +
            '      </a>\n' +
            '    </li>' +
            '    <li id="'+page_name+'1-auswl"class="page-item disabled"><a class="page-link" onclick="changeSite(0, \''+page_name+'\', \''+number+'\', \''+sites_to_show+'\')">1</a></li>\n';
    for(i = 1; i<number; ++i) {
        str += '<li id="'+page_name+(i+1)+'-auswl" class="page-item"><a class="page-link" style="cursor:pointer;" onclick="changeSite(\''+i+'\', \''+page_name+'\', \''+number+'\', \''+sites_to_show+'\')">'+(i+1)+'</a></li>\n';
    }
    str += '<li id="'+page_name+'-rightend" class="page-item" onclick="next_site(true,\''+page_name+'\', \''+number+'\', \''+sites_to_show+'\')">\n' +
            '      <a class="page-link" aria-label="Next">\n' +
            '        <span aria-hidden="true">&raquo;</span>\n' +
            '        <span class="sr-only">Next</span>\n' +
            '      </a>\n' +
            '    </li>  ' +
            ' </ul>\n' +
            '</nav>';
    return str;
}

 function buildPageableList(itemlist, valuelist, container_name, page_size, pagination_visible, message_empty, pagination_container) {
    var side = 0;
    document.getElementById(container_name).innerHTML = "";
    $.each(itemlist, function (i,item) {
            if(i % page_size == 0) {
                document.getElementById(container_name).innerHTML = document.getElementById(container_name).innerHTML + "<div id='"+container_name+"-side-"+side+"' hidden='true'></div>";
                side = side +1;
            }
            var name_of_item = container_name+"-item-"+i;
            var inner_container_name = container_name+'-side-'+(side-1);
            document.getElementById(inner_container_name).innerHTML = document.getElementById(inner_container_name).innerHTML +
                '<a id="'+name_of_item+'" onclick="activeListClick(\''+name_of_item+'\')" value="'+valuelist[i]+'" class="list-group-item list-group-item-action list-item-mac">'+item+'</a>';
        });
      if (Object.keys(itemlist).length == 0) {
            document.getElementById(container_name).innerHTML ='<a id="" class="list-group-item list-group-item-action list-item-mac">'+message_empty+'</a>';
        }
        var name = container_name+'-side-';
        var num_pages = Math.ceil(listit.length/page_size);
        document.getElementById(pagination_container).innerHTML = addPagination(num_pages,name,pagination_visible);
        changeSite(0, name, num_pages, pagination_visible);
}
// ****************** END PAGINATION BUILD WITH BOOTSTRAP END *********************************
