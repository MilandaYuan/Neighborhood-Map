const ViewModel = function () {
    this.locationList = ko.observableArray([]);
    this.inputLocation = ko.observable('');
    this.showClickedMarker = ele => showClickedMarker(ele.title);

    //点击汉堡菜单切换左侧地址列表的显示和隐藏状态
    this.toggleStatus = ko.observable(false);
    this.toggleSidebar = () => {
        this.toggleStatus(!this.toggleStatus());
        google.maps.event.trigger(map, 'resize');
    }
};

const viewModel = new ViewModel();
ko.applyBindings(viewModel);

let map;
const markers = [];

//异步获取数据并绑定
const dataPromise = $.ajax({
    url: 'json/data.json',
    dataType: 'json',
}).then(response => {
    response.forEach(locationItem => viewModel.locationList.push(locationItem));
    viewModel.inputLocation.subscribe(newValue => {
        const filteredLocation = response.filter(function (ele) {
            return ele.title.includes(newValue) || ele.pinyin.includes(newValue);
        });
        viewModel.locationList(filteredLocation);
        showFilteredMarkers(filteredLocation);
    });
    return response;
});

//初始化加载地图
const googleMapPromise = $.getScript('https://maps.googleapis.com/maps/api/js?libraries=places&key=[YOUR_API_KEY]&v=3')
    .done(function initMap(response) {
            map = new google.maps.Map(document.getElementById('map'), {
                center: {lat: 39.90872, lng: 116.39748},
                zoom: 12,
                mapTypeControl: false
            });
        }
    )
    .fail(function () {
        $('#map').toggleClass('map-error').text('Oops~~~获取地图失败，请检查您的网络');
    });

//异步获取数据和地图成功后，将标记显示在页面上
Promise.all([dataPromise, googleMapPromise]).then(([dataResp]) => {
    let bounds = new google.maps.LatLngBounds();
    for (let i = 0; i < dataResp.length; i++) {
        const title = dataResp[i].title;
        const position = dataResp[i].location;
        const placeID = dataResp[i].id;
        const wiki = dataResp[i].wiki;
        const marker = new google.maps.Marker({
            map: map,
            title: title,
            position: position,
            animation: google.maps.Animation.DROP,
            placeID: placeID,
            wiki: wiki
        });
        markers.push(marker);
        marker.addListener('click', function () {
            if(!this.infowindow){
                let largeInfowindow = new google.maps.InfoWindow({maxWidth: 250});
                this.infowindow = largeInfowindow;
                toggleBounce(this);
                populateInfoWindow(this, largeInfowindow);
            }
        });
        bounds.extend(markers[i].position);
        map.fitBounds(bounds);
    }
});

//填充被点击标记的信息窗口内容
function populateInfoWindow(marker, infowindow) {
        const service = new google.maps.places.PlacesService(map);
        service.getDetails({
            placeId: marker.placeID
        }, function (place, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let innerHTML = '<div>';
                if (place.name) {
                    innerHTML += '<strong>' + place.name + '</strong>';
                }
                if (place.formatted_address) {
                    innerHTML += '<br>' + place.formatted_address
                }
                if (place.formatted_phone_number) {
                    innerHTML += '<br>' + place.formatted_phone_number
                }
                if (place.opening_hours) {
                    innerHTML += '<br><br><strong>Hours:</strong><br>' +
                        place.opening_hours.weekday_text[0] + '<br>' +
                        place.opening_hours.weekday_text[1] + '<br>' +
                        place.opening_hours.weekday_text[2] + '<br>' +
                        place.opening_hours.weekday_text[3] + '<br>' +
                        place.opening_hours.weekday_text[4] + '<br>' +
                        place.opening_hours.weekday_text[5] + '<br>' +
                        place.opening_hours.weekday_text[6];
                }
                if (place.photos) {
                    innerHTML += '<br><br><img src="' + place.photos[0].getUrl(
                        {maxHeight: 100, maxWidth: 200}) + '">';
                }

                innerHTML += '</div></br>';
                infowindow.setContent(innerHTML);
                infowindow.open(map, marker);
                infowindow.addListener('closeclick', function () {
                    marker.infowindow = null
                });

                getWikipediaContent(marker, function (content) {
                    innerHTML += content;
                    infowindow.setContent(innerHTML);
                });

            }
        });
}

//获取维基百科的内容
function getWikipediaContent(marker, callback) {
    const wikiUrl = 'http://zh.wikipedia.org/w/api.php?action=opensearch&search=' + (marker.wiki || marker.title) + '&format=json&callback=wikiCallback';
    $.ajax({
        url: wikiUrl,
        dataType: 'jsonp',
        jsonp: 'callback',
        timeout: 3000,
        success: function (response) {
            const url = 'http://zh.wikipedia.org/wiki/' + (marker.wiki || marker.title);
            if (response[1].length === 0) {
                callback('')
            } else {
                callback(`<div>${response[2][0]}<a href=${url} target ="_blank">详见维基百科</a></div>`)
            }
        },
        error: function (req, errorMessage, e) {
            callback("<div>Failed to get wikipedia resources</div>")
        }
    });
}

//切换标记的弹跳动画
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null)
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function () {
            marker.setAnimation(null);
        }, 3000);
    }
}

//显示左侧被点击地址对应标记的弹出窗口
function showClickedMarker(clickedLocation) {
    for (let marker of markers) {
        if (clickedLocation === marker.title) {
            if(!marker.infowindow){
                let largeInfowindow = new google.maps.InfoWindow({maxWidth: 250});
                marker.infowindow = largeInfowindow;
                toggleBounce(marker);
                populateInfoWindow(marker, largeInfowindow);

            }
        }
    }
}

//根据输入内容筛选出对应的标记
function showFilteredMarkers(filtered) {
    markers.forEach(function (m) {
        let needDisplay = filtered.some(function (e) {
            return e.title === m.title;
        });
        if (needDisplay) {
            m.setVisible(true)
        } else {
            m.setVisible(false);
        }
    });
}






