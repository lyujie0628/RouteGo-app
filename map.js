var map = new AMap.Map('map',{
    zoom: 12,
    center: getLocationPosition()
});

var geocoder = new AMap.Geocoder({
    radius: 1000,
    extensions: 'all'
});

function applyLocationContextToMap(options){
    if(!map || !locationContext){
        return;
    }

    var position = getLocationPosition();
    var zoom = (options && options.zoom) || 12;

    if(typeof map.setZoomAndCenter === 'function'){
        map.setZoomAndCenter(zoom, position);
    }else{
        map.setCenter(position);
        map.setZoom(zoom);
    }
}

function extractCityInfoFromGeocodeResult(result, fallbackPosition){
    var lng = fallbackPosition && fallbackPosition[0];
    var lat = fallbackPosition && fallbackPosition[1];

    var regeocode = result && result.regeocode ? result.regeocode : null;
    var comp = regeocode && regeocode.addressComponent ? regeocode.addressComponent : {};
    var pois = regeocode && Array.isArray(regeocode.pois) ? regeocode.pois : [];

    var cityName = '';
    if(Array.isArray(comp.city)){
        cityName = comp.city[0] || '';
    }else{
        cityName = comp.city || '';
    }

    if(!cityName){
        cityName = comp.province || '当前位置';
    }

    var district = comp.district || '';
    var township = comp.township || '';

    var street = '';
    var streetNumber = '';
    if(comp.streetNumber){
        street = comp.streetNumber.street || '';
        streetNumber = comp.streetNumber.number || '';
    }

    var poiName = '';
    if(pois.length && pois[0] && pois[0].name){
        poiName = pois[0].name;
    }

    var detail = '';
    if(poiName){
        detail = poiName;
    }else if(district || township || street || streetNumber){
        detail = [district, township, street + streetNumber].filter(Boolean).join('');
    }else if(regeocode && regeocode.formattedAddress){
        detail = regeocode.formattedAddress.replace(cityName, '').trim();
    }

    var label = cityName;
    if(detail){
        label = cityName + ' · ' + detail;
    }

    return {
        cityName: cityName,
        adcode: comp.adcode || '',
        lng: lng,
        lat: lat,
        label: label,
        sourceType: 'gps'
    };
}

function reverseGeocodeLocation(position){
    return new Promise(function(resolve, reject){
        if(!geocoder || !position){
            reject(new Error('geocoder unavailable'));
            return;
        }

        geocoder.getAddress(position, function(status, result){
            if(status === 'complete' && result){
                resolve(result);
            }else{
                reject(new Error('reverse geocode failed'));
            }
        });
    });
}

var nearbyLoopStartPointCache = {};
var mapCenterCrosshair = null;
var mapCenterCrosshairHideTimer = null;

function ensureMapCenterCrosshair(){
    if(mapCenterCrosshair){
        return mapCenterCrosshair;
    }

    var mapEl = document.getElementById('map');
    if(!mapEl){
        return null;
    }

    mapCenterCrosshair = document.createElement('div');
    mapCenterCrosshair.id = 'map-center-crosshair';
    mapCenterCrosshair.style.position = 'absolute';
    mapCenterCrosshair.style.left = '50%';
    mapCenterCrosshair.style.top = '50%';
    mapCenterCrosshair.style.transform = 'translate(-50%, -50%)';
    mapCenterCrosshair.style.width = '28px';
    mapCenterCrosshair.style.height = '28px';
    mapCenterCrosshair.style.pointerEvents = 'none';
    mapCenterCrosshair.style.zIndex = '999';
    mapCenterCrosshair.style.display = 'none';
    mapCenterCrosshair.innerHTML =
        '<div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:2px;height:10px;background:#1677ff;border-radius:2px;"></div>' +
        '<div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:2px;height:10px;background:#1677ff;border-radius:2px;"></div>' +
        '<div style="position:absolute;top:50%;left:0;transform:translateY(-50%);height:2px;width:10px;background:#1677ff;border-radius:2px;"></div>' +
        '<div style="position:absolute;top:50%;right:0;transform:translateY(-50%);height:2px;width:10px;background:#1677ff;border-radius:2px;"></div>' +
        '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%, -50%);width:8px;height:8px;background:#ffffff;border:2px solid #1677ff;border-radius:50%;box-shadow:0 1px 6px rgba(22,119,255,0.25);"></div>';

    mapEl.style.position = 'relative';
    mapEl.appendChild(mapCenterCrosshair);
    return mapCenterCrosshair;
}

function showMapCenterCrosshair(){
    var el = ensureMapCenterCrosshair();
    if(!el){
        return;
    }

    if(mapCenterCrosshairHideTimer){
        clearTimeout(mapCenterCrosshairHideTimer);
        mapCenterCrosshairHideTimer = null;
    }

    el.style.display = 'block';
}

function hideMapCenterCrosshair(delay){
    var el = ensureMapCenterCrosshair();
    if(!el){
        return;
    }

    if(mapCenterCrosshairHideTimer){
        clearTimeout(mapCenterCrosshairHideTimer);
    }

    mapCenterCrosshairHideTimer = setTimeout(function(){
        el.style.display = 'none';
    }, typeof delay === 'number' ? delay : 0);
}

function offsetPointByMeters(point, eastMeters, northMeters){
    if(!point || point.length < 2){
        return null;
    }

    var lng = Number(point[0]);
    var lat = Number(point[1]);

    var latOffset = northMeters / 111320;
    var lngOffset = eastMeters / (111320 * Math.cos(lat * Math.PI / 180));

    return [lng + lngOffset, lat + latOffset];
}

async function canUsePointAsNearbyLoopStart(point, mode){
    if(!point){
        return false;
    }

    var probeDistance = mode === 'walking' ? 90 : (mode === 'riding' ? 160 : 260);
    var probeTargets = [
        offsetPointByMeters(point, probeDistance, 0),
        offsetPointByMeters(point, 0, probeDistance),
        offsetPointByMeters(point, -probeDistance, 0),
        offsetPointByMeters(point, 0, -probeDistance)
    ];

    for(var i = 0; i < probeTargets.length; i++){
        var target = probeTargets[i];
        if(!target){
            continue;
        }

        var result = await searchSegmentRoute(point, target, mode);
        if(result && result.success && Number(result.distance) > probeDistance * 0.45){
            return true;
        }
    }

    return false;
}

async function resolveNearbyLoopStartPoint(center, mode){
    if(!center || !Array.isArray(center)){
        return center;
    }

    var cacheKey =
        mode + '|' +
        Number(center[0]).toFixed(4) + ',' +
        Number(center[1]).toFixed(4);

    if(nearbyLoopStartPointCache[cacheKey]){
        return nearbyLoopStartPointCache[cacheKey].slice();
    }

    var candidates = [
        center,
        offsetPointByMeters(center, 60, 0),
        offsetPointByMeters(center, -60, 0),
        offsetPointByMeters(center, 0, 60),
        offsetPointByMeters(center, 0, -60),
        offsetPointByMeters(center, 120, 0),
        offsetPointByMeters(center, -120, 0),
        offsetPointByMeters(center, 0, 120),
        offsetPointByMeters(center, 0, -120)
    ];

    for(var i = 0; i < candidates.length; i++){
        var candidate = candidates[i];
        if(!candidate){
            continue;
        }

        var ok = await canUsePointAsNearbyLoopStart(candidate, mode);
        if(ok){
            nearbyLoopStartPointCache[cacheKey] = candidate.slice();
            return candidate;
        }
    }

    nearbyLoopStartPointCache[cacheKey] = center.slice();
    return center;
}

function clearSegmentOverlays(){
    segmentOverlays.forEach(function(overlay){
        map.remove(overlay);
    });
    segmentOverlays = [];
}

function clearSearchPreviewOverlays(){
    if(Array.isArray(searchPreviewOverlays) && searchPreviewOverlays.length){
        map.remove(searchPreviewOverlays);
    }
    searchPreviewOverlays = [];
}

function normalizeLngLat(point){
    if(!point){
        return null;
    }

    if(Array.isArray(point)){
        return point;
    }

    if(typeof point.getLng === 'function' && typeof point.getLat === 'function'){
        return [point.getLng(), point.getLat()];
    }

    if(typeof point.lng === 'number' && typeof point.lat === 'number'){
        return [point.lng, point.lat];
    }

    return null;
}

function isLngLatLike(point){
    return !!normalizeLngLat(point);
}

function samePoint(a, b){
    if(!a || !b){
        return false;
    }

    return Math.abs(a[0] - b[0]) < 0.000001 && Math.abs(a[1] - b[1]) < 0.000001;
}

function mergePathGroups(pathGroups){
    var merged = [];

    pathGroups.forEach(function(group){
        if(!Array.isArray(group)){
            return;
        }

        group.forEach(function(point){
            var normalized = normalizeLngLat(point);
            if(!normalized){
                return;
            }

            if(merged.length === 0 || !samePoint(normalized, merged[merged.length - 1])){
                merged.push(normalized);
            }
        });
    });

    return merged;
}

function extractDrivingPath(result){
    var route = result && result.routes && result.routes[0];
    var steps = route && route.steps ? route.steps : [];
    var pathGroups = [];

    steps.forEach(function(step){
        if(step && Array.isArray(step.path) && step.path.length > 0){
            pathGroups.push(step.path);
        }
    });

    return mergePathGroups(pathGroups);
}

function extractWalkingOrRidingPath(result){
    var pathGroups = [];

    function walk(node){
        if(!node){
            return;
        }

        if(Array.isArray(node)){
            if(node.length > 0 && isLngLatLike(node[0])){
                pathGroups.push(node);
                return;
            }

            node.forEach(walk);
            return;
        }

        if(typeof node === 'object'){
            Object.keys(node).forEach(function(key){
                walk(node[key]);
            });
        }
    }

    walk(result);
    return mergePathGroups(pathGroups);
}

function extractRoutePathByMode(result, mode){
    if(mode === 'driving'){
        return extractDrivingPath(result);
    }

    return extractWalkingOrRidingPath(result);
}



function extractDrivingRouteData(result){
    var route = result && result.routes && result.routes[0];
    return {
        distance: Number(route && route.distance) || 0,
        duration: Number(route && route.time) || 0
    };
}

function extractWalkingOrRidingRouteData(result){
    var distance = 0;
    var duration = 0;

    function walk(node){
        if(!node){
            return;
        }

        if(Array.isArray(node)){
            node.forEach(walk);
            return;
        }

        if(typeof node !== 'object'){
            return;
        }

        if(!distance && node.distance !== undefined){
            var parsedDistance = Number(node.distance);
            if(isFinite(parsedDistance) && parsedDistance > 0){
                distance = parsedDistance;
            }
        }

        if(!duration){
            if(node.time !== undefined){
                var parsedTime = Number(node.time);
                if(isFinite(parsedTime) && parsedTime > 0){
                    duration = parsedTime;
                }
            }else if(node.duration !== undefined){
                var parsedDuration = Number(node.duration);
                if(isFinite(parsedDuration) && parsedDuration > 0){
                    duration = parsedDuration;
                }
            }
        }

        Object.keys(node).forEach(function(key){
            walk(node[key]);
        });
    }

    walk(result);

    return {
        distance: distance,
        duration: duration
    };
}

function extractRouteMetaByMode(result, mode){
    if(mode === 'driving'){
        return extractDrivingRouteData(result);
    }

    return extractWalkingOrRidingRouteData(result);
}

function createSegmentPolyline(path, mode){
    return new AMap.Polyline({
        path: path,
        strokeColor: modeColorMap[mode] || '#1677ff',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        showDir: true,
        strokeStyle: mode === 'riding' ? 'dashed' : 'solid'
    });
}

function createRouteServiceByMode(mode){
    if(mode === 'driving'){
        return new AMap.Driving({
            hideMarkers: true
        });
    }

    if(mode === 'riding'){
        return new AMap.Riding({
            hideMarkers: true
        });
    }

    return new AMap.Walking({
        hideMarkers: true
    });
}


function runSegmentRouteSearch(startPoint, endPoint, mode){
    return new Promise(function(resolve){
        var service = createRouteServiceByMode(mode);

        service.search(startPoint, endPoint, function(status, result){
            if(status === 'complete'){
                var path = extractRoutePathByMode(result, mode);
                var meta = extractRouteMetaByMode(result, mode);

                resolve({
                    success: path.length > 1,
                    path: path,
                    mode: mode,
                    result: result,
                    distance: meta.distance,
                    duration: meta.duration
                });
            }else{
                resolve({
                    success: false,
                    path: [],
                    mode: mode,
                    result: result,
                    distance: 0,
                    duration: 0
                });
            }
        });
    });
}

function searchSegmentRoute(startPoint, endPoint, mode){
    var cached = getCachedRouteEntry(startPoint, endPoint, mode);

    if(cached && cached.status === 'success' && Array.isArray(cached.path) && cached.path.length > 1){
    var cachedDistance = Number(cached.distance);
    var cachedDuration = Number(cached.duration);

    if(isFinite(cachedDistance) && cachedDistance > 0 && isFinite(cachedDuration) && cachedDuration > 0){
        return Promise.resolve({
            success: true,
            path: cached.path,
            mode: mode,
            fromCache: true,
            distance: cachedDistance,
            duration: cachedDuration
        });
    }
}

    if(cached && cached.status === 'no-route'){
        return Promise.resolve({
            success: false,
            path: [],
            mode: mode,
            fromCache: true,
            impossible: true,
            distance: 0,
            duration: 0
        });
    }

    return runSegmentRouteSearch(startPoint, endPoint, mode).then(function(firstResult){
        if(firstResult.success){
            setCachedRouteEntry(startPoint, endPoint, mode, {
                status: 'success',
                path: firstResult.path,
                distance: firstResult.distance,
                duration: firstResult.duration
            });
            return firstResult;
        }

        return runSegmentRouteSearch(startPoint, endPoint, mode).then(function(secondResult){
            if(secondResult.success){
                setCachedRouteEntry(startPoint, endPoint, mode, {
                    status: 'success',
                    path: secondResult.path,
                    distance: secondResult.distance,
                    duration: secondResult.duration
                });
                return secondResult;
            }

            setCachedRouteEntry(startPoint, endPoint, mode, {
                status: 'no-route'
            });
            return {
                success: false,
                path: [],
                mode: mode,
                impossible: true,
                distance: 0,
                duration: 0
            };
        });
    });
}

function createFallbackLine(startPoint, endPoint, mode, segmentIndex){
    var fallbackLine = new AMap.Polyline({
        path: [startPoint, endPoint],
        strokeColor: modeColorMap[mode] || '#1677ff',
        strokeWeight: 4,
        strokeOpacity: 0.35,
        strokeStyle: 'dashed'
    });
    fallbackLine.setExtData({
        segmentIndex: segmentIndex,
        mode: mode,
        isFallback: true
    });
    return fallbackLine;
}

async function renderSegmentRoutes(token){
    if(spots.length < 2){
    clearSegmentOverlays();
    clearRouteSegmentInfos(currentRouteKey);
    renderRouteSegmentInfosOnly();
    return;
}

    var nextOverlays = [];
    clearRouteSegmentInfos(currentRouteKey);

    for(var i = 0; i < spots.length - 1; i++){
        if(token !== renderToken){
            return;
        }

        var startPoint = spots[i].position;
        var endPoint = spots[i + 1].position;
        var mode = currentRoute.segmentModes[i] || 'walking';
        var segmentResult = await searchSegmentRoute(startPoint, endPoint, mode);

        if(token !== renderToken){
            return;
        }

if(segmentResult.success && segmentResult.path.length > 1){
    setSegmentInfo(currentRouteKey, i, {
        distance: segmentResult.distance,
        duration: segmentResult.duration,
        mode: mode,
        impossible: false
    });

    var polyline = createSegmentPolyline(segmentResult.path, mode);
    polyline.setExtData({
        segmentIndex: i,
        mode: mode
    });
    nextOverlays.push(polyline);
    renderRouteSegmentInfosOnly();
    continue;
}

        var previousOverlay = segmentOverlays[i];
        var previousData = previousOverlay && previousOverlay.getExtData ? previousOverlay.getExtData() : null;
        if(previousOverlay && previousData && previousData.segmentIndex === i && previousData.mode === mode && !previousData.isFallback){
            nextOverlays.push(previousOverlay);
            continue;
        }

        if(segmentResult.impossible){
    setSegmentInfo(currentRouteKey, i, {
        distance: 0,
        duration: 0,
        mode: mode,
        impossible: true
    });
    nextOverlays.push(createFallbackLine(startPoint, endPoint, mode, i));
    renderRouteSegmentInfosOnly();
}else{
    setSegmentInfo(currentRouteKey, i, null);
    renderRouteSegmentInfosOnly();
}
    }

    if(token !== renderToken){
        return;
    }

    clearSegmentOverlays();
    segmentOverlays = nextOverlays;
    if(segmentOverlays.length > 0){
        map.add(segmentOverlays);
    }

    var fitTargets = currentMarkers.concat(segmentOverlays);
    if(fitTargets.length > 0){
        map.setFitView(fitTargets, false, [60, 60, 60, 60]);
    }

    // 关键：路线数据查完后，再刷新一次左侧列表
    renderRouteSegmentInfosOnly();
}

function clearPendingAddMarker(){
    if(pendingAddMarker){
        map.remove(pendingAddMarker);
        pendingAddMarker = null;
    }
    pendingAddSpot = null;
}

function getPlaceNameByLngLat(lnglat, callback){
    geocoder.getAddress([lnglat.lng, lnglat.lat], function(status, result){
        if(status === 'complete' && result.regeocode){
            var regeocode = result.regeocode;
            var addressComponent = regeocode.addressComponent || {};
            var pois = regeocode.pois || [];

            var placeName = '';

            if(pois.length > 0 && pois[0].name){
                placeName = pois[0].name;
            }else if(addressComponent.building && addressComponent.building.name){
                placeName = addressComponent.building.name;
            }else if(addressComponent.neighborhood && addressComponent.neighborhood.name){
                placeName = addressComponent.neighborhood.name;
            }else if(regeocode.formattedAddress){
                placeName = regeocode.formattedAddress;
            }else{
                placeName = '新地点' + (routes[currentRouteKey].spots.length + 1);
            }

            callback(placeName);
        }else{
            callback('新地点' + (routes[currentRouteKey].spots.length + 1));
        }
    });
}

function getMapCenterSearchScope(callback){
    var center = map && typeof map.getCenter === 'function'
        ? normalizeLngLat(map.getCenter())
        : null;

    if(!center){
        callback({
            center: null,
            city: '',
            adcode: '',
            citylimit: false
        });
        return;
    }

    geocoder.getAddress(center, function(status, result){
        var addressComponent = status === 'complete' && result && result.regeocode
            ? (result.regeocode.addressComponent || {})
            : {};

        var cityName = addressComponent.city || addressComponent.province || '';

        if(Array.isArray(cityName)){
            cityName = cityName[0] || '';
        }

        callback({
            center: center,
            city: cityName || '',
            adcode: addressComponent.adcode || '',
            citylimit: !!cityName
        });
    });
}

function getCurrentDistanceReferencePoint(){
    if(distanceReferencePoint && Array.isArray(distanceReferencePoint)){
        return distanceReferencePoint;
    }

    if(map && typeof map.getCenter === 'function'){
        return normalizeLngLat(map.getCenter());
    }

    return null;
}

function formatDistanceText(distanceMeters){
    var value = Number(distanceMeters);

    if(!isFinite(value) || value < 0){
        return '';
    }

    if(value < 1000){
        return Math.round(value) + 'm';
    }

    return (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'km';
}

function getDistanceBetweenPoints(startPoint, endPoint){
    if(!(window.AMap && AMap.GeometryUtil)){
        return null;
    }

    if(!startPoint || !endPoint){
        return null;
    }

    try{
        return AMap.GeometryUtil.distance(startPoint, endPoint);
    }catch(error){
        return null;
    }
}

function buildLoopRoutePoints(anchorPoint, placeList){
    if(!anchorPoint || !Array.isArray(placeList) || !placeList.length){
        return [];
    }

    var usable = placeList.slice(0, 3).map(function(item){
        return {
            name: item.name,
            position: item.position
        };
    });

    if(!usable.length){
        return [];
    }

    var points = [
        { name: '出发点', position: anchorPoint }
    ].concat(usable);

    points.push({
        name: '回到出发点',
        position: anchorPoint
    });

    return points;
}

async function previewSearchRouteOnMap(routeItem){
    clearSearchPreviewMarker();
    clearSearchPreviewOverlays();

    if(!routeItem || !Array.isArray(routeItem.spots) || routeItem.spots.length < 2){
        return;
    }

    var overlays = [];
    var firstPoint = routeItem.spots[0] && routeItem.spots[0].position;
    var allPositions = [];
    var mode = routeItem.routeMode || 'walking';

    if(Array.isArray(routeItem.validatedSegments) && routeItem.validatedSegments.length){
        routeItem.validatedSegments.forEach(function(segment){
            if(Array.isArray(segment.path) && segment.path.length > 1){
                var polyline = new AMap.Polyline({
                    path: segment.path,
                    strokeColor: modeColorMap[mode] || '#1677ff',
                    strokeWeight: 5,
                    strokeOpacity: 0.88,
                    lineJoin: 'round',
                    lineCap: 'round',
                    showDir: true,
                    strokeStyle: mode === 'riding' ? 'dashed' : 'solid',
                    zIndex: 130
                });
                overlays.push(polyline);
                allPositions = allPositions.concat(segment.path);
            }
        });
    } else {
        for(var i = 0; i < routeItem.spots.length - 1; i++){
            var startPoint = routeItem.spots[i].position;
            var endPoint = routeItem.spots[i + 1].position;
            var result = await searchSegmentRoute(startPoint, endPoint, mode);

            if(result && result.success && Array.isArray(result.path) && result.path.length > 1){
                var line = new AMap.Polyline({
                    path: result.path,
                    strokeColor: modeColorMap[mode] || '#1677ff',
                    strokeWeight: 5,
                    strokeOpacity: 0.88,
                    lineJoin: 'round',
                    lineCap: 'round',
                    showDir: true,
                    strokeStyle: mode === 'riding' ? 'dashed' : 'solid',
                    zIndex: 130
                });
                overlays.push(line);
                allPositions = allPositions.concat(result.path);
            }
        }
    }

    routeItem.spots.forEach(function(spot, index){
        var isFirst = index === 0;
        var isLast = index === routeItem.spots.length - 1;
        var label = '';

        if(isFirst && isLast){
            label = '起终点';
        } else if(isFirst && samePoint(spot.position, routeItem.spots[routeItem.spots.length - 1].position)){
            label = '起终点';
        } else if(isFirst){
            label = '起点';
        } else if(isLast){
            label = '终点';
        } else {
            label = index;
        }

        if(isLast && !isFirst && samePoint(spot.position, routeItem.spots[0].position)){
            return;
        }

        var marker = new AMap.Marker({
            position: spot.position,
            offset: new AMap.Pixel(-12, -16),
            zIndex: 140,
            content:
                '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' +
                    '<div style="background:' + (label === '起终点' ? '#7c3aed' : '#f97316') + ';color:white;padding:4px 8px;border-radius:14px;font-size:12px;font-weight:bold;line-height:1;">' + label + '</div>' +
                    '<div style="background:rgba(255,255,255,0.96);color:#1e293b;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.12);line-height:1.2;">' + spot.name + '</div>' +
                '</div>'
        });

        overlays.push(marker);
        allPositions.push(spot.position);
    });

    searchPreviewOverlays = overlays;

    if(searchPreviewOverlays.length){
        map.add(searchPreviewOverlays);
    }

    if(allPositions.length && typeof map.setFitView === 'function'){
        map.setFitView(searchPreviewOverlays, false, [80, 80, 80, 80]);
    } else if(firstPoint){
        map.setCenter(firstPoint);
        map.setZoom(13);
    }
}


function bindPendingAddButton(){
    setTimeout(function(){
        var addBtn = document.getElementById('pending-add-btn');
        if(addBtn){
            function stopMapEvent(event){
                if(event){
                    event.stopPropagation();
                    event.preventDefault();
                }
            }

            addBtn.onmousedown = stopMapEvent;
            addBtn.onmouseup = stopMapEvent;
            addBtn.ontouchstart = stopMapEvent;
            addBtn.ontouchend = stopMapEvent;

            addBtn.onclick = function(event){
                stopMapEvent(event);

                if(document.activeElement){
                    document.activeElement.blur();
                }

                addSpotToCurrentRoute(pendingAddSpot);
            };

            addBtn.addEventListener('touchend', function(event){
                stopMapEvent(event);

                if(document.activeElement){
                    document.activeElement.blur();
                }

                addSpotToCurrentRoute(pendingAddSpot);
            }, { passive: false });
        }
    }, 0);
}

function addSpotToCurrentRoute(spot){
    var route = routes[currentRouteKey];
    var lastIndex = route.spots.length - 1;
    var endLocked = lastIndex >= 0 && !!route.spots[lastIndex].isLocked;

    if(endLocked){
        route.spots.splice(lastIndex, 0, spot);
    }else{
        route.spots.push(spot);
    }

normalizeEdgeLocks(route);
rebuildSegmentModes(currentRouteKey);
clearRouteSegmentInfos(currentRouteKey);

    clearPendingAddMarker();
    clearSegmentOverlays();
    renderRouteSegmentInfosOnly();
    renderRoute();
}

function showPendingAddMarker(lnglat){
    clearPendingAddMarker();

    var lng = Number(lnglat.lng.toFixed(6));
    var lat = Number(lnglat.lat.toFixed(6));

    pendingAddSpot = {
        name: '查询中...',
        position: [lng, lat]
    };

    pendingAddMarker = new AMap.Marker({
        position: [lng, lat],
        map: map,
        offset: new AMap.Pixel(-12, -16),
        content:
            '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' +
                '<div style="background:#f97316;color:white;padding:4px 8px;border-radius:14px;font-size:12px;font-weight:bold;line-height:1;">📍</div>' +
                '<div style="background:rgba(255,255,255,0.96);color:#1e293b;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.12);line-height:1.2;">查询中...</div>' +
                '<button id="pending-add-btn" style="border:none;background:#1677ff;color:white;width:24px;height:24px;border-radius:999px;font-size:16px;line-height:1;cursor:pointer;">+</button>' +
            '</div>'
    });

    pendingAddMarker.on('click', function(event){
        if(event && event.originEvent){
            event.originEvent.stopPropagation();
            event.originEvent.preventDefault();
        }
    });

    bindPendingAddButton();

    getPlaceNameByLngLat(lnglat, function(placeName){
        if(!pendingAddSpot){
            return;
        }

        pendingAddSpot.name = placeName;

        if(pendingAddMarker){
            pendingAddMarker.setContent(
                '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' +
                    '<div style="background:#f97316;color:white;padding:4px 8px;border-radius:14px;font-size:12px;font-weight:bold;line-height:1;">📍</div>' +
                    '<div style="background:rgba(255,255,255,0.96);color:#1e293b;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.12);line-height:1.2;">' + placeName + '</div>' +
                    '<button id="pending-add-btn" style="border:none;background:#1677ff;color:white;width:24px;height:24px;border-radius:999px;font-size:16px;line-height:1;cursor:pointer;">+</button>' +
                '</div>'
            );

            bindPendingAddButton();
        }
    });
}

map.on('click', function(event){
    showPendingAddMarker(event.lnglat);
});

map.on('movestart', function(){
    showMapCenterCrosshair();
});

map.on('dragging', function(){
    showMapCenterCrosshair();
});

map.on('moveend', function(){
    hideMapCenterCrosshair(120);

    if(searchGuideMode !== 'nearby-spots'){
        return;
    }

    if(nearbyAutoRefreshTimer){
        clearTimeout(nearbyAutoRefreshTimer);
    }

    nearbyAutoRefreshTimer = setTimeout(function(){
        if(typeof runNearbySpotsGuideSearch === 'function'){
            runNearbySpotsGuideSearch(true);
        }
    }, 500);
});

map.on('zoomend', function(){
    if(searchGuideMode !== 'nearby-spots'){
        return;
    }

    if(nearbyAutoRefreshTimer){
        clearTimeout(nearbyAutoRefreshTimer);
    }

    nearbyAutoRefreshTimer = setTimeout(function(){
        if(typeof runNearbySpotsGuideSearch === 'function'){
            runNearbySpotsGuideSearch(true);
        }
    }, 500);
});

applyLocationContextToMap({ zoom: 12 });
