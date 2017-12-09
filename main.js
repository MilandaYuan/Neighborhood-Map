let initialLocations;

$.ajax({
    url: 'json/data.json',
    dataType: 'json',
    async: true,
    success: function (response) {
        initialLocations = response;
    }

});


//动态绑定原始数据
const ViewModel = function () {
    this.locationList = ko.observableArray([]);
    this.inputLocation = ko.observable('');
    initialLocations.forEach(locationItem => this.locationList.push(locationItem));
    this.showClickedMarker = ele => showClickedMarker(ele.title);

    this.inputLocation.subscribe(newValue => {
        const filteredLocation = initialLocations.filter(function (ele) {
            return ele.title.includes(newValue) || ele.pinyin.includes(newValue);
        });
        this.locationList(filteredLocation);
        showFilteredMarkers(filteredLocation);
    });

    //点击汉堡菜单切换左侧地址列表的显示和隐藏状态
    this.toggleStatus = ko.observable(false);
    this.toggleSidebar = () => {
        this.toggleStatus(!this.toggleStatus());
        google.maps.event.trigger(map, 'resize');
    }
};

ko.applyBindings(new ViewModel());


let map;
const markers = [];

//初始化加载地图
$.getScript('https://maps.googleapis.com/maps/api/js?libraries=places&key=AIzaSyBsP09nfFtiN4v2d_Nd6uUPKKNMn6B9ow0&v=3')
    .done(function initMap(response) {
            map = new google.maps.Map(document.getElementById('map'), {
                center: {lat: 39.90872, lng: 116.39748},
                zoom: 12,
                mapTypeControl: false
            });

            let largeInfowindow = new google.maps.InfoWindow({maxWidth: 250, font: 10});
            let bounds = new google.maps.LatLngBounds();

            //初始化时让所有标记显示在页面上
            for (let i = 0; i < initialLocations.length; i++) {
                const title = initialLocations[i].title;
                const position = initialLocations[i].location;
                const placeID = initialLocations[i].id;
                const wiki = initialLocations[i].wiki;
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
                    toggleBounce(this);
                    populateInfoWindow(this, largeInfowindow);
                });
                bounds.extend(markers[i].position);
                map.fitBounds(bounds);
            }
        }
    )
    .fail(function () {
        $('#map').toggleClass('map-error').text('Oops~~~获取地图失败，请检查您的网络');

    })

//填充被点击标记的信息窗口内容
function populateInfoWindow(marker, infowindow) {
    if (infowindow.marker !== marker) {
        infowindow.marker = marker;
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
                    infowindow.marker = null;
                });

                getWikipediaContent(marker, function (content) {
                    innerHTML += content;
                    infowindow.setContent(innerHTML);
                });

            }
        });

    }
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

//显示被点击的地址对应标记的弹出窗口
function showClickedMarker(clickedLocation) {
    for (let marker of markers) {
        let largeInfowindow = new google.maps.InfoWindow({maxWidth: 250});
        if (clickedLocation === marker.title) {
            toggleBounce(marker);
            populateInfoWindow(marker, largeInfowindow);
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






