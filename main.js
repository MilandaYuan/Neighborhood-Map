
var initialLocations = [
    {
        title: '天安门',
        pinyin: 'tiananmen',
        location: {lat: 39.90872, lng: 116.39748},
        id: 'ChIJtZy9k79S8DURURn7o3wj30Q'
    },
    {
        title: '香山公园',
        pinyin: 'xiangshangongyuan',
        location: {lat: 39.9926176, lng: 116.1867996},
        id: 'ChIJIc2UcK9b8DURcnVb7tVrF7o'
    },
    {
        title: '尤伦斯当代艺术中心',
        pinyin: 'youlunsidangdaiyishuzhongxin',
        location: {lat: 39.9838588, lng: 116.4951909},
        id: 'ChIJl3OsUL-r8TURjRjdvXQ_TTE'
    },
    {
        title: '国家体育场',
        pinyin: 'guojiatiyuchang',
        location: {lat: 39.9929431, lng: 116.3965112},
        id: 'ChIJ-3xmbcJU8DURR-pxV2SC8jA'
    },
    {
        title: '北京动物园',
        pinyin: 'beijingdongwuyuan',
        location: {lat: 39.93879400000001, lng: 116.339571},
        id: 'ChIJPRYRTDJS8DUR5fFsHhL_tW4'
    },
    {
        title: '中国人民大学',
        pinyin: 'zhongguorenmindaxue',
        location: {lat: 39.9696062, lng: 116.3188145},
        id: 'ChIJjSNcWFtR8DURiHGXEcrhDbg'
    },
    {
        title: '麦当劳牡丹园店',
        pinyin: 'maidanglaomudanyuandian',
        location: {lat: 39.9756227, lng: 116.3696116},
        id: 'ChIJod0J44BU8DURpZk97WVBJ7Q'
    }

];


//动态绑定原始数据
var Location = function(data){
    this.title = ko.observable(data.title)
};
var ViewModel = function(){
    var self = this;
    this.locationList = ko.observableArray([]);
    this.inputLocation = ko.observable('');
    initialLocations.forEach(function(locationItem){
        self.locationList.push(new Location(locationItem))
    });

    this.inputLocation.subscribe(function(newValue){
        var filteredLocation = initialLocations.filter(function(ele){
            return ele.title.includes(newValue) || ele.pinyin.includes(newValue);
        });
        self.locationList(filteredLocation);
        showFilteredMarkers(filteredLocation);
    });
};

ko.applyBindings(new ViewModel());


//给左侧地址列表绑定点击事件，以显示右侧对应的标记
var locationItems = document.getElementsByClassName('location-item');
for(var i =0;i<locationItems.length;i++){
    var currentLocation =locationItems[i];
    currentLocation.addEventListener('click',function(){
        showClickedMarker(this)
    })
}


var map;
var markers = [];

//初始化加载地图
$.getScript('https://maps.googleapis.com/maps/api/js?libraries=places&key=[YOUR_API_KEY]&v=3')
    .done(function initMap(response){
        map = new google.maps.Map(document.getElementById('map'),{
            center:{lat: 39.90872, lng: 116.39748},
            zoom:12,
            mapTypeControl: false
        });

        var largeInfowindow = new google.maps.InfoWindow();
        var bounds = new google.maps.LatLngBounds();

        //初始化时让所有标记显示在页面上

        for(var i=0;i<initialLocations.length;i++){
            var title = initialLocations[i].title;
            var position = initialLocations[i].location;
            var placeID = initialLocations[i].id;
            var marker = new google.maps.Marker({
                map:map,
                title:title,
                position:position,
                animation:google.maps.Animation.DROP,
                placeID:placeID
            });
            markers.push(marker);
            marker.addListener('click',function(){
                toggleBounce(this);
                populateInfoWindow(this,largeInfowindow);
            });
            bounds.extend(markers[i].position);
            map.fitBounds(bounds);
        }
    }
)
    .fail(function(){
        $('#map').toggleClass('map-error').text('Oops~~~获取地图失败，请检查您的网络') ;

    })

//填充被点击标记的信息窗口内容
function populateInfoWindow(marker,infowindow){
    if(infowindow.marker !=marker){
        infowindow.marker = marker;
        var service = new google.maps.places.PlacesService(map);
        service.getDetails({
            placeId:marker.placeID
        },function(place,status){
            if(status ===google.maps.places.PlacesServiceStatus.OK){
                var innerHTML = '<div>';
                if(place.name){
                    innerHTML+='<strong>'+place.name+'</strong>';
                }
                if(place.formatted_address){
                    innerHTML+='<br>'+place.formatted_address
                }
                if(place.formatted_phone_number){
                    innerHTML+='<br>'+place.formatted_phone_number
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

                innerHTML += '</div>';
                infowindow.setContent(innerHTML);
                infowindow.open(map,marker);
                infowindow.addListener('closeclick',function(){
                    infowindow.marker = null;
                })

                getWikipediaContent(place,function(content){
                    innerHTML+=content;
                    infowindow.setContent(innerHTML);
                });

            }
        });

    }
}

//获取维基百科的内容
function getWikipediaContent(place,callback){
    var wikiUrl = 'http://zh.wikipedia.org/w/api.php?action=opensearch&search=' + place.name + '&format=json&callback=wikiCallback';
    $.ajax({
        url:wikiUrl,
        dataType:'jsonp',
        jsonp:'callback',
        timeout: 3000,
        success:function(response){
            var url = 'http://zh.wikipedia.org/wiki/'+place.name;
            if(response[1].length===0){
                callback('')
            }else{
                callback( '<div>'+response[2][0]+'<a href="'+url+'" target ="_blank">详见维基百科</a>'+'</div>')
            }
        },
        error: function(req, errorMessage, e) {
            callback("<div>Failed to get wikipedia resources</div>")
        }
    });
}

//切换标记的弹跳动画
function toggleBounce(marker){
    if(marker.getAnimation() !==null){
        marker.setAnimation(null)
    }else{
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){ marker.setAnimation(null); }, 3000);
    }
}

//显示被点击的地址对应标记的弹出窗口
function showClickedMarker(clickedLocation){
    for(var i =0;i<markers.length;i++){
        var marker = markers[i];
        var largeInfowindow = new google.maps.InfoWindow();
        if (clickedLocation.innerText===marker.title) {
            toggleBounce(marker);
            populateInfoWindow(marker,largeInfowindow);
        }
    }
}

//根据输入内容筛选出对应的标记
function showFilteredMarkers(filtered){
    markers.forEach(function (m) {
        var needDisplay = filtered.some(function (e){
            return e.title === m.title;
        });
        if(needDisplay){
            m.setMap(map);
        }else{
            m.setMap(null);
        }
    });
}

//点击汉堡菜单切换左侧地址列表的显示和隐藏状态
var menuIcon = $('.menuIcon');
menuIcon.on('click',function(){
    $('.container').toggleClass('menu-hidden');
    google.maps.event.trigger(map, 'resize');
});




