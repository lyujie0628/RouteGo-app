function isMiddleSpotIndex(route, index){
    if(!route || !Array.isArray(route.spots)){
        return false;
    }

    return index > 0 && index < route.spots.length - 1;
}

function canBindSpotWithNext(route, index){
    if(!isMiddleSpotIndex(route, index)){
        return false;
    }

    return index + 1 < route.spots.length - 1;
}

function normalizeSpotBindings(route){
    if(!route || !Array.isArray(route.spots)){
        return;
    }

    route.spots.forEach(function(spot, index){
        if(!canBindSpotWithNext(route, index)){
            delete spot.boundNext;
            return;
        }

        if(spot.boundNext){
            spot.boundNext = true;
        }else{
            delete spot.boundNext;
        }
    });
}

function isSpotBoundToNext(route, index){
    if(!route || !route.spots[index]){
        return false;
    }

    return !!route.spots[index].boundNext;
}

function isSpotBoundToPrev(route, index){
    if(!route || index <= 0){
        return false;
    }

    return !!(route.spots[index - 1] && route.spots[index - 1].boundNext);
}

function isSpotInBoundGroup(route, index){
    return isSpotBoundToPrev(route, index) || isSpotBoundToNext(route, index);
}

function getBoundBlockRange(route, index){
    var start = index;
    var end = index;

    while(start > 0 && isSpotBoundToPrev(route, start)){
        start -= 1;
    }

    while(end < route.spots.length - 1 && isSpotBoundToNext(route, end)){
        end += 1;
    }

    return {
        start: start,
        end: end
    };
}

function getBlockInsertIndex(range, toIndex){
    var blockLength = range.end - range.start + 1;

    if(toIndex > range.end){
        return toIndex - blockLength + 1;
    }

    return toIndex;
}

function getAllowedBlockStartRange(route, blockLength){
    var minIndex = isFirstSpotLocked(route) ? 1 : 0;
    var maxIndex = route.spots.length - blockLength;

    if(isLastSpotLocked(route)){
        maxIndex -= 1;
    }

    return {
        min: minIndex,
        max: maxIndex
    };
}

function canReorderToIndex(route, fromIndex, toIndex){
    if(!route){
        return false;
    }

    if(fromIndex === null || toIndex === null){
        return false;
    }

    if(fromIndex < 0 || fromIndex >= route.spots.length){
        return false;
    }

    if(toIndex < 0 || toIndex >= route.spots.length){
        return false;
    }

    var minIndex = 0;
    var maxIndex = route.spots.length - 1;

    if(isFirstSpotLocked(route) && fromIndex !== 0){
        minIndex = 1;
    }

    if(isLastSpotLocked(route) && fromIndex !== route.spots.length - 1){
        maxIndex = route.spots.length - 2;
    }

    return toIndex >= minIndex && toIndex <= maxIndex;
}

function toggleBindWithNext(routeKey, index){
    var route = routes[routeKey];

    if(!route || !canBindSpotWithNext(route, index)){
        return;
    }

    route.spots[index].boundNext = !route.spots[index].boundNext;
    normalizeSpotBindings(route);
    clearRouteSegmentInfos(routeKey);
    rebuildSegmentModes(routeKey);
}

function buildBoundUnits(spotsList){
    var units = [];
    var i = 0;

    while(i < spotsList.length){
        var unit = [spotsList[i]];

        while(i < spotsList.length - 1 && spotsList[i].boundNext){
            unit.push(spotsList[i + 1]);
            i += 1;
        }

        units.push(unit);
        i += 1;
    }

    return units;
}

function flattenBoundUnits(units){
    var flat = [];

    units.forEach(function(unit){
        unit.forEach(function(spot){
            flat.push(spot);
        });
    });

    return flat;
}

function buildNearestNeighborUnitRoute(allUnits, startIndex, fixedStartSpot, fixedEndSpot){
    var remaining = allUnits.slice();
    var plannedUnits = [];
    var currentSpot = null;

    if(fixedStartSpot){
        currentSpot = fixedStartSpot;
    }else{
        var firstUnit = remaining.splice(startIndex, 1)[0];
        plannedUnits.push(firstUnit);
        currentSpot = firstUnit[firstUnit.length - 1];
    }

    while(remaining.length > 0){
        var nearestIndex = 0;
        var nearestDistance = Infinity;

        remaining.forEach(function(unit, index){
            var firstSpot = unit[0];
            var distance = calculateDistance(currentSpot.position, firstSpot.position);

            if(distance < nearestDistance){
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        var nextUnit = remaining.splice(nearestIndex, 1)[0];
        plannedUnits.push(nextUnit);
        currentSpot = nextUnit[nextUnit.length - 1];
    }

    var result = [];

    if(fixedStartSpot){
        result.push(fixedStartSpot);
    }

    result = result.concat(flattenBoundUnits(plannedUnits));

    if(fixedEndSpot){
        result.push(fixedEndSpot);
    }

    return result;
}

function reorderSpot(routeKey, fromIndex, toIndex){
    var route = routes[routeKey];

    if(!route){
        return;
    }

    if(fromIndex === null || toIndex === null || fromIndex === toIndex){
        return;
    }

    if(!canReorderToIndex(route, fromIndex, toIndex)){
        return;
    }

    var movedSpot = route.spots.splice(fromIndex, 1)[0];
    route.spots.splice(toIndex, 0, movedSpot);

    normalizeEdgeLocks(route);
    rebuildSegmentModes(routeKey);
}

function deleteSpot(routeKey, index){
    var route = routes[routeKey];

    if(route.spots.length <= 2){
        alert('至少保留两个景点，才能形成路线。');
        return;
    }

    route.spots.splice(index, 1);
    normalizeEdgeLocks(route);
    rebuildSegmentModes(routeKey);
}

function rebuildSegmentInfos(routeKey){
    var route = routes[routeKey];
    var neededLength = Math.max(0, route.spots.length - 1);
    var oldInfos = Array.isArray(route.segmentInfos) ? route.segmentInfos : [];
    var newInfos = [];

    for(var i = 0; i < neededLength; i++){
        newInfos.push(oldInfos[i] || null);
    }

    route.segmentInfos = newInfos;
}

function rebuildSegmentModes(routeKey){
    var route = routes[routeKey];
    var neededLength = route.spots.length - 1;
    var newModes = [];

    for(var i = 0; i < neededLength; i++){
        newModes.push(route.segmentModes[i] || 'walking');
    }

    route.segmentModes = newModes;
    rebuildSegmentInfos(routeKey);
}

function ensureRouteSegmentState(routeKey){
    var route = routes[routeKey];
    if(!route){
        return;
    }

    if(!Array.isArray(route.segmentModes)){
        route.segmentModes = [];
    }

    normalizeEdgeLocks(route);
    rebuildSegmentModes(routeKey);
    rebuildSegmentInfos(routeKey);
}

function setSegmentInfo(routeKey, segmentIndex, info){
    var route = routes[routeKey];
    if(!route){
        return;
    }

    if(!Array.isArray(route.segmentInfos)){
        route.segmentInfos = [];
    }

    route.segmentInfos[segmentIndex] = info;
}

function clearRouteSegmentInfos(routeKey){
    var route = routes[routeKey];
    if(!route){
        return;
    }

    rebuildSegmentInfos(routeKey);

    for(var i = 0; i < route.segmentInfos.length; i++){
        route.segmentInfos[i] = null;
    }
}

function formatSegmentDistance(distance){
    if(typeof distance !== 'number' || !isFinite(distance) || distance <= 0){
        return '';
    }

    if(distance < 1000){
        return Math.round(distance) + 'm';
    }

    return (distance / 1000).toFixed(1) + 'km';
}

function formatSegmentDuration(duration){
    if(typeof duration !== 'number' || !isFinite(duration) || duration <= 0){
        return '';
    }

    var minutes = Math.round(duration / 60);

    if(minutes < 60){
        return minutes + '分钟';
    }

    var hours = Math.floor(minutes / 60);
    var remainMinutes = minutes % 60;

    if(remainMinutes === 0){
        return hours + '小时';
    }

    return hours + '小时' + remainMinutes + '分钟';
}

function getSegmentInfoText(route, segmentIndex){
    if(!route || !Array.isArray(route.segmentInfos)){
        return '';
    }

    var info = route.segmentInfos[segmentIndex];
    if(!info){
        return '';
    }

    if(info.impossible){
        return '暂无可用路线';
    }

    var durationText = formatSegmentDuration(info.duration);
    var distanceText = formatSegmentDistance(info.distance);

    if(durationText && distanceText){
        return durationText + ' · ' + distanceText;
    }

    return durationText || distanceText || '';
}

function loadRouteCache(){
    try{
        var raw = localStorage.getItem(ROUTE_CACHE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }catch(error){
        return {};
    }
}
routeCache = loadRouteCache();

function saveRouteCache(){
    try{
        localStorage.setItem(ROUTE_CACHE_STORAGE_KEY, JSON.stringify(routeCache));
    }catch(error){
    }
}

function normalizeCachePoint(point){
    var normalized = normalizeLngLat(point);
    if(!normalized){
        return null;
    }
    return [Number(normalized[0].toFixed(6)), Number(normalized[1].toFixed(6))];
}

function buildRouteCacheKey(startPoint, endPoint, mode){
    var start = normalizeCachePoint(startPoint);
    var end = normalizeCachePoint(endPoint);
    if(!start || !end){
        return null;
    }
    return mode + '|' + start[0] + ',' + start[1] + '|' + end[0] + ',' + end[1];
}

function getCachedRouteEntry(startPoint, endPoint, mode){
    var key = buildRouteCacheKey(startPoint, endPoint, mode);
    if(!key){
        return null;
    }
    return routeCache[key] || null;
}

function setCachedRouteEntry(startPoint, endPoint, mode, entry){
    var key = buildRouteCacheKey(startPoint, endPoint, mode);
    if(!key){
        return;
    }
    routeCache[key] = entry;
    saveRouteCache();
}

function calculateDistance(pointA, pointB){
    if(!pointA || !pointB){
        return Infinity;
    }

    var lng1 = pointA[0];
    var lat1 = pointA[1];
    var lng2 = pointB[0];
    var lat2 = pointB[1];

    var rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad;
    var dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
}

function calculateRouteTotalDistance(spotsList){
    var total = 0;

    for(var i = 0; i < spotsList.length - 1; i++){
        total += calculateDistance(spotsList[i].position, spotsList[i + 1].position);
    }

    return total;
}

function isFirstSpotLocked(route){
    if(!route || !route.spots || route.spots.length === 0){
        return false;
    }

    return !!route.spots[0].isLocked;
}

function isLastSpotLocked(route){
    if(!route || !route.spots || route.spots.length === 0){
        return false;
    }

    return !!route.spots[route.spots.length - 1].isLocked;
}

function normalizeEdgeLocks(route){
    if(!route || !Array.isArray(route.spots) || route.spots.length === 0){
        return;
    }

    var shouldLockStart = !!route.spots[0].isLocked;
    var shouldLockEnd = route.spots.length > 1
        ? !!route.spots[route.spots.length - 1].isLocked
        : false;

    route.spots.forEach(function(spot){
        spot.isLocked = false;
    });

    if(shouldLockStart){
        route.spots[0].isLocked = true;
    }

    if(shouldLockEnd){
        route.spots[route.spots.length - 1].isLocked = true;
    }
}

function buildNearestNeighborRoute(allSpots, startIndex, fixedStartSpot, fixedEndSpot){
    var remaining = allSpots.slice();
    var planned = [];
    var currentSpot = null;

    if(fixedStartSpot){
        planned.push(fixedStartSpot);
        currentSpot = fixedStartSpot;
    }else{
        currentSpot = remaining.splice(startIndex, 1)[0];
        planned.push(currentSpot);
    }

    while(remaining.length > 0){
        var nearestIndex = 0;
        var nearestDistance = Infinity;

        remaining.forEach(function(spot, index){
            var distance = calculateDistance(currentSpot.position, spot.position);

            if(distance < nearestDistance){
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        currentSpot = remaining.splice(nearestIndex, 1)[0];
        planned.push(currentSpot);
    }

    if(fixedEndSpot){
        planned.push(fixedEndSpot);
    }

    return planned;
}

function planCurrentRoute(){
    if(!currentRoute || currentRoute.spots.length <= 2){
        alert('至少需要三个地点，才能进行一键规划。');
        return;
    }

    var originalSpots = currentRoute.spots.slice();
    var startLocked = isFirstSpotLocked(currentRoute);
    var endLocked = isLastSpotLocked(currentRoute);

    var fixedStartSpot = startLocked ? originalSpots[0] : null;
    var fixedEndSpot = endLocked ? originalSpots[originalSpots.length - 1] : null;

    var middleSpots = originalSpots.slice();

    if(startLocked){
        middleSpots.shift();
    }

    if(endLocked){
        middleSpots.pop();
    }

    if(middleSpots.length === 0){
        return;
    }

    var bestRoute = null;
    var bestDistance = Infinity;

    if(startLocked){
        var candidateRouteWhenStartLocked = buildNearestNeighborRoute(
            middleSpots,
            0,
            fixedStartSpot,
            fixedEndSpot
        );
        var candidateDistanceWhenStartLocked = calculateRouteTotalDistance(candidateRouteWhenStartLocked);

        bestRoute = candidateRouteWhenStartLocked;
        bestDistance = candidateDistanceWhenStartLocked;
    }else{
        for(var startIndex = 0; startIndex < middleSpots.length; startIndex++){
            var candidateRoute = buildNearestNeighborRoute(
                middleSpots,
                startIndex,
                fixedStartSpot,
                fixedEndSpot
            );
            var candidateDistance = calculateRouteTotalDistance(candidateRoute);

            if(candidateDistance < bestDistance){
                bestDistance = candidateDistance;
                bestRoute = candidateRoute;
            }
        }
    }

    if(!bestRoute){
        return;
    }

    currentRoute.spots = bestRoute;
    normalizeEdgeLocks(currentRoute);
    rebuildSegmentModes(currentRouteKey);
    clearRouteSegmentInfos(currentRouteKey);
    renderRoute();
}

Object.keys(routes).forEach(function(routeKey){
    ensureRouteSegmentState(routeKey);
});