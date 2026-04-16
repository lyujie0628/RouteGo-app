var defaultRoutes = {
    classic: {
        title: '行程1',
        startDate: '',
        startTime: '',
        spots: [
            {name:"灵隐寺", position:[120.1017,30.2403]},
            {name:"西湖", position:[120.1551,30.2429]},
            {name:"河坊街", position:[120.1706,30.2433]},
            {name:"雷峰塔", position:[120.1487,30.2304]}
        ],
        segmentModes: ['walking', 'driving', 'walking']
    },

    westlake: {
        title: '行程2',
        startDate: '',
        startTime: '',
        spots: [
            {name:"曲院风荷", position:[120.1324,30.2591]},
            {name:"苏堤", position:[120.1482,30.2506]},
            {name:"断桥", position:[120.1619,30.2580]},
            {name:"平湖秋月", position:[120.1547,30.2563]}
        ],
        segmentModes: ['walking', 'walking', 'walking']
    },

    culture: {
        title: '行程3',
        startDate: '',
        startTime: '',
        spots: [
            {name:"南宋御街", position:[120.1765,30.2452]},
            {name:"河坊街", position:[120.1706,30.2433]},
            {name:"胡雪岩故居", position:[120.1783,30.2394]},
            {name:"城隍阁", position:[120.1656,30.2368]}
        ],
        segmentModes: ['walking', 'walking', 'driving']
    }
};

var ROUTE_STATE_STORAGE_KEY = 'walkup_route_state_v1';

function cloneJson(obj){
    return JSON.parse(JSON.stringify(obj));
}

var routeState = loadRouteState();
var routes = routeState.routes;
var currentRouteKey = routeState.currentRouteKey;
var currentRoute = routes[currentRouteKey];
var spots = currentRoute.spots;
var currentMarkers = [];
var draggedIndex = null;
var dragTargetIndex = null;
var dragEnabledIndex = null;
var editingSpotRouteKey = null;
var editingSpotIndex = null;
var settingsSpotRouteKey = null;
var settingsSpotIndex = null;
var isEditingRoutes = false;
var pendingAddMarker = null;
var pendingAddSpot = null;
var segmentOverlays = [];
var renderToken = 0;
var ROUTE_CACHE_STORAGE_KEY = 'walkup_route_cache_v1';
var routeCache = {};

var modeLabelMap = {
    walking: '步行',
    driving: '驾车',
    riding: '骑行'
};

var modeColorMap = {
    walking: '#1677ff',
    driving: '#22c55e',
    riding: '#f97316'
};

var isTimelineExpanded = false;
var searchKeyword = '';
var searchResults = [];
var searchLoading = false;
var searchErrorText = '';
var searchPreviewMarker = null;
var searchPreviewOverlays = [];

var searchPanelMode = 'guide';          // guide | results
var searchResultType = 'place';         // place | route
var searchResultTitle = '';
var searchDebounceTimer = null;
var searchRequestId = 0;
var lastSearchInputAt = 0;

var searchGuideMode = '';               // nearby-spots | nearby-loop | travel-routes
var nearbyExploreAnchor = null;         // 当前附近看点参考点
var nearbyLoopMode = 'walking';         // walking | riding | driving
var nearbyLoopDurationMinutes = 30;
var nearbyLoopRefreshToken = 0;
var travelRouteDays = 1;                // 1 | 2 | 3
var nearbyAutoRefreshTimer = null;

var distanceReferenceMode = 'map';      // user | custom | map
var distanceReferencePoint = null;      // [lng, lat]
var distanceReferenceLabel = '当前地图中心';

var isSearchComposing = false;
var addedSearchRouteBatchMap = {};
var nearbyLoopLoadingToken = 0;

var LOCATION_CONTEXT_STORAGE_KEY = 'walkup_location_context_v1';
var RECENT_LOCATIONS_STORAGE_KEY = 'walkup_recent_locations_v1';
var MAX_RECENT_LOCATIONS = 8;

var defaultLocationContext = {
    cityName: '杭州',
    adcode: '',
    lng: 120.1551,
    lat: 30.2741,
    label: '杭州',
    sourceType: 'manual' // manual / gps / search
};

var hotCityOptions = [
    { cityName: '深圳', label: '深圳', lng: 114.0579, lat: 22.5431, adcode: '440300' },
    { cityName: '广州', label: '广州', lng: 113.2644, lat: 23.1291, adcode: '440100' },
    { cityName: '上海', label: '上海', lng: 121.4737, lat: 31.2304, adcode: '310000' },
    { cityName: '北京', label: '北京', lng: 116.4074, lat: 39.9042, adcode: '110000' },
    { cityName: '杭州', label: '杭州', lng: 120.1551, lat: 30.2741, adcode: '330100' },
    { cityName: '苏州', label: '苏州', lng: 120.5853, lat: 31.2989, adcode: '320500' },
    { cityName: '成都', label: '成都', lng: 104.0665, lat: 30.5728, adcode: '510100' },
    { cityName: '重庆', label: '重庆', lng: 106.5516, lat: 29.5630, adcode: '500000' },
    { cityName: '长沙', label: '长沙', lng: 112.9388, lat: 28.2282, adcode: '430100' },
    { cityName: '厦门', label: '厦门', lng: 118.0894, lat: 24.4798, adcode: '350200' },
    { cityName: '三亚', label: '三亚', lng: 109.5119, lat: 18.2528, adcode: '460200' },
    { cityName: '武汉', label: '武汉', lng: 114.3054, lat: 30.5931, adcode: '420100' }
];

function safeParseJson(text, fallback){
    try{
        return JSON.parse(text);
    }catch(error){
        return fallback;
    }
}

function normalizeLoadedRoutes(rawRoutes){
    if(!rawRoutes || typeof rawRoutes !== 'object'){
        return cloneJson(defaultRoutes);
    }

    var nextRoutes = cloneJson(rawRoutes);
    var keys = Object.keys(nextRoutes);

    if(!keys.length){
        return cloneJson(defaultRoutes);
    }

    keys.forEach(function(routeKey){
        var route = nextRoutes[routeKey];

        if(!route || !Array.isArray(route.spots)){
            nextRoutes[routeKey] = {
                title: '未命名行程',
                startDate: '',
                startTime: '',
                spots: [],
                segmentModes: []
            };
            return;
        }

        if(!Array.isArray(route.segmentModes)){
            route.segmentModes = [];
        }

        if(typeof route.title !== 'string'){
            route.title = '未命名行程';
        }

        if(typeof route.startDate !== 'string'){
            route.startDate = '';
        }

        if(typeof route.startTime !== 'string'){
            route.startTime = '';
        }
    });

    return nextRoutes;
}

function loadRouteState(){
    var raw = localStorage.getItem(ROUTE_STATE_STORAGE_KEY);
    if(!raw){
        return {
            routes: cloneJson(defaultRoutes),
            currentRouteKey: 'classic'
        };
    }

    var parsed = safeParseJson(raw, null);
    if(!parsed || typeof parsed !== 'object'){
        return {
            routes: cloneJson(defaultRoutes),
            currentRouteKey: 'classic'
        };
    }

    var loadedRoutes = normalizeLoadedRoutes(parsed.routes);
    var keys = Object.keys(loadedRoutes);
    var loadedCurrentRouteKey = parsed.currentRouteKey;

    if(!loadedCurrentRouteKey || !loadedRoutes[loadedCurrentRouteKey]){
        loadedCurrentRouteKey = keys[0];
    }

    return {
        routes: loadedRoutes,
        currentRouteKey: loadedCurrentRouteKey
    };
}

function saveRouteState(){
    localStorage.setItem(
        ROUTE_STATE_STORAGE_KEY,
        JSON.stringify({
            routes: routes,
            currentRouteKey: currentRouteKey
        })
    );
}

function normalizeLocationContext(raw){
    var base = raw || {};
    var lng = Number(base.lng);
    var lat = Number(base.lat);

    return {
        cityName: base.cityName || defaultLocationContext.cityName,
        adcode: base.adcode || '',
        lng: isFinite(lng) ? lng : defaultLocationContext.lng,
        lat: isFinite(lat) ? lat : defaultLocationContext.lat,
        label: base.label || base.cityName || defaultLocationContext.label,
        sourceType: base.sourceType || 'manual'
    };
}

function loadLocationContext(){
    var saved = localStorage.getItem(LOCATION_CONTEXT_STORAGE_KEY);
    if(!saved){
        return normalizeLocationContext(defaultLocationContext);
    }
    return normalizeLocationContext(safeParseJson(saved, defaultLocationContext));
}

function saveLocationContext(context){
    locationContext = normalizeLocationContext(context);
    localStorage.setItem(
        LOCATION_CONTEXT_STORAGE_KEY,
        JSON.stringify(locationContext)
    );
}

function getLocationDisplayText(){
    if(!locationContext){
        return '杭州';
    }
    return locationContext.cityName || locationContext.label || '杭州';
}

function getLocationFullLabel(){
    if(!locationContext){
        return '杭州';
    }
    return locationContext.label || locationContext.cityName || '杭州';
}

function getLocationPosition(){
    if(!locationContext){
        return [defaultLocationContext.lng, defaultLocationContext.lat];
    }
    return [Number(locationContext.lng), Number(locationContext.lat)];
}

function loadRecentLocations(){
    var saved = localStorage.getItem(RECENT_LOCATIONS_STORAGE_KEY);
    var list = safeParseJson(saved, []);
    if(!Array.isArray(list)){
        return [];
    }

    return list.map(function(item){
        return normalizeLocationContext(item);
    }).filter(function(item){
        return isFinite(Number(item.lng)) && isFinite(Number(item.lat));
    });
}

function saveRecentLocations(list){
    recentLocations = Array.isArray(list) ? list.slice(0, MAX_RECENT_LOCATIONS) : [];
    localStorage.setItem(
        RECENT_LOCATIONS_STORAGE_KEY,
        JSON.stringify(recentLocations)
    );
}

function pushRecentLocation(context){
    var normalized = normalizeLocationContext(context);

    var nextList = recentLocations.filter(function(item){
        var sameCity = item.cityName === normalized.cityName;
        var sameLabel = item.label === normalized.label;
        var sameLng = Number(item.lng).toFixed(6) === Number(normalized.lng).toFixed(6);
        var sameLat = Number(item.lat).toFixed(6) === Number(normalized.lat).toFixed(6);
        return !(sameCity && sameLabel && sameLng && sameLat);
    });

    nextList.unshift(normalized);
    saveRecentLocations(nextList.slice(0, MAX_RECENT_LOCATIONS));
}

function setLocationContext(context, options){
    var normalized = normalizeLocationContext(context);
    var shouldPushRecent = !options || options.pushRecent !== false;

    saveLocationContext(normalized);

    if(shouldPushRecent){
        pushRecentLocation(normalized);
    }
}

var locationContext = loadLocationContext();
var recentLocations = loadRecentLocations();

function ensureSegmentState(route){
    if(!route){
        return;
    }

    if(!Array.isArray(route.spots)){
        route.spots = [];
    }

    var expectedLength = Math.max(0, route.spots.length - 1);

    if(!Array.isArray(route.segmentModes)){
        route.segmentModes = [];
    }

    route.segmentModes = route.segmentModes.slice(0, expectedLength);

    while(route.segmentModes.length < expectedLength){
        route.segmentModes.push('walking');
    }
}
