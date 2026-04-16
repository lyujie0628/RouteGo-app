function getNearbyLoopModeConfig(mode){
    if(mode === 'walking'){
        return {
            mode: 'walking',
            speedMetersPerMinute: 68,
            plans: [
                { key: 'short', name: '轻松绕一圈', minMinutes: 12, maxMinutes: 25, targetMinutes: 18 },
                { key: 'medium', name: '街区慢逛', minMinutes: 25, maxMinutes: 45, targetMinutes: 32 },
                { key: 'long', name: '多走一段', minMinutes: 45, maxMinutes: 90, targetMinutes: 58 }
            ],
            hardMaxMinutes: 90
        };
    }

    if(mode === 'riding'){
        return {
            mode: 'riding',
            speedMetersPerMinute: 180,
            plans: [
                { key: 'short', name: '轻松骑一圈', minMinutes: 15, maxMinutes: 30, targetMinutes: 22 },
                { key: 'medium', name: '经典附近骑行', minMinutes: 30, maxMinutes: 55, targetMinutes: 40 },
                { key: 'long', name: '多逛一段', minMinutes: 55, maxMinutes: 90, targetMinutes: 68 }
            ],
            hardMaxMinutes: 90
        };
    }

    return {
        mode: 'driving',
        speedMetersPerMinute: 420,
        plans: [
            { key: 'short', name: '轻松兜一圈', minMinutes: 12, maxMinutes: 22, targetMinutes: 16 },
            { key: 'medium', name: '经典附近兜风', minMinutes: 22, maxMinutes: 40, targetMinutes: 30 },
            { key: 'long', name: '多看几个地方', minMinutes: 40, maxMinutes: 60, targetMinutes: 48 }
        ],
        hardMaxMinutes: 60
    };
}

function estimateNearbyLoopDistanceByDuration(minutes, mode){
    var config = getNearbyLoopModeConfig(mode);
    return Math.round((minutes || 0) * config.speedMetersPerMinute);
}

function estimateNearbyLoopDuration(distance, mode){
    var config = getNearbyLoopModeConfig(mode);
    if(!distance){
        return 0;
    }
    return Math.round(distance / config.speedMetersPerMinute);
}

function offsetPoint(point, eastMeters, northMeters){
    if(!point || point.length < 2){
        return null;
    }

    var lng = Number(point[0]);
    var lat = Number(point[1]);

    var latOffset = northMeters / 111320;
    var lngOffset = eastMeters / (111320 * Math.cos(lat * Math.PI / 180));

    return [lng + lngOffset, lat + latOffset];
}

function createNearbyLoopRoute(name, mode, points, patternType, targetMinutes){
    var path = points.slice();
    var distance = 0;

    for(var i = 0; i < path.length - 1; i++){
        distance += Number(getDistanceBetweenPoints(path[i], path[i + 1])) || 0;
    }

    var minutes = estimateNearbyLoopDuration(distance, mode);

    return {
        cardType: 'route',
        routeKind: 'nearby-loop',
        routeMode: mode,
        name: name,
        address: '围绕当前地图中心生成的附近逛逛路线',
        spots: path.map(function(point, index){
            var isFirst = index === 0;
            var isLast = index === path.length - 1;
            return {
                name: isFirst || isLast ? '当前地图中心' : ('路线点' + index),
                position: point
            };
        }),
        previewPath: path,
        totalDistance: Math.round(distance),
        totalDistanceText: typeof formatDistanceText === 'function' ? formatDistanceText(distance) : '',
        totalDurationMinutes: minutes,
        totalDurationText: minutes + '分钟',
        score: 0,
        isEstimated: true,
        needsRouteValidation: true,
        patternType: patternType || 'loop',
        targetMinutes: targetMinutes || minutes,
        validatedSegments: null,
        validatedPreviewPath: null
    };
}

function buildRectLoop(center, mode, minutes, widthUnits, heightUnits, name){
    var totalDistance = estimateNearbyLoopDistanceByDuration(minutes, mode);
    var unit = totalDistance / (2 * (widthUnits + heightUnits));

    var east = unit * widthUnits;
    var north = unit * heightUnits;

    var p1 = offsetPoint(center, east, 0);
    var p2 = offsetPoint(center, east, north);
    var p3 = offsetPoint(center, 0, north);

    return createNearbyLoopRoute(
        name,
        mode,
        [center, p1, p2, p3, center],
        'block-loop',
        minutes
    );
}

function buildCityShortLoopCandidates(center, mode){
    var config = getNearbyLoopModeConfig(mode);
    var shortPlan = config.plans[0];
    var mediumPlan = config.plans[1];

    return [
        buildRectLoop(center, mode, Math.max(shortPlan.minMinutes, shortPlan.targetMinutes - 4), 0.38, 0.30, '轻松绕一圈'),
        buildRectLoop(center, mode, shortPlan.targetMinutes, 0.52, 0.36, '小圈慢逛'),
        buildRectLoop(center, mode, shortPlan.targetMinutes + 3, 0.68, 0.42, '街区小环线'),
        buildRectLoop(center, mode, Math.max(shortPlan.targetMinutes + 5, mediumPlan.minMinutes - 4), 0.92, 0.55, '双街区慢逛')
    ];
}

function buildBlockLoopCandidates(center, mode){
    var config = getNearbyLoopModeConfig(mode);
    var candidates = [];

    candidates = candidates.concat(buildCityShortLoopCandidates(center, mode));

    config.plans.forEach(function(plan, index){
        candidates.push(buildRectLoop(center, mode, plan.targetMinutes, 1.0 + index * 0.35, 0.7 + index * 0.12, plan.name));
        candidates.push(buildRectLoop(center, mode, plan.targetMinutes, 1.5 + index * 0.45, 0.8 + index * 0.14, '双街区慢逛'));
        candidates.push(buildRectLoop(center, mode, plan.targetMinutes, 2.2 + index * 0.55, 1.05 + index * 0.16, '多街区环线'));

        if(plan.targetMinutes >= 30){
            candidates.push(buildRectLoop(center, mode, plan.targetMinutes, 3.0 + index * 0.7, 1.2 + index * 0.18, '大街区环线'));
        }

        if(plan.targetMinutes >= 45){
            candidates.push(buildRectLoop(center, mode, plan.targetMinutes, 4.2 + index * 0.8, 1.35 + index * 0.2, '城市慢逛大环线'));
        }
    });

    return candidates;
}

function buildOutAndBackRoute(center, mode, minutes, variantIndex){
    var distance = estimateNearbyLoopDistanceByDuration(minutes, mode);
    var forward = distance / 2.2;

    var directions = [
        { east: forward, north: 0 },
        { east: 0, north: forward },
        { east: -forward, north: 0 },
        { east: 0, north: -forward }
    ];

    var dir = directions[variantIndex % directions.length];
    var p1 = offsetPoint(center, dir.east, dir.north);

    return createNearbyLoopRoute(
        '主路往返逛逛',
        mode,
        [center, p1, center],
        'out-and-back',
        minutes
    );
}

function buildOutAndBackCandidates(center, mode){
    var config = getNearbyLoopModeConfig(mode);
    var candidates = [];

    config.plans.forEach(function(plan, index){
        candidates.push(buildOutAndBackRoute(center, mode, plan.targetMinutes, index));
    });

    return candidates;
}

function computeNearbyRouteSkeletonScore(route, poiList, mode){
    if(!route){
        return -9999;
    }

    var config = getNearbyLoopModeConfig(mode);
    var score = 100;
    var minutes = Number(route.totalDurationMinutes) || 0;
    var targetMinutes = Number(route.targetMinutes) || minutes;

    if(minutes > config.hardMaxMinutes){
        return -9999;
    }

    score -= Math.abs(minutes - targetMinutes) * 1.0;

    if(route.patternType === 'block-loop'){
        score += 14;
    }

    if(route.patternType === 'out-and-back'){
        score += 8;
    }

    var poiBonus = 0;
    (poiList || []).forEach(function(item){
        if(!item || !item.position){
            return;
        }

        var minDistanceToPath = Infinity;
        route.previewPath.forEach(function(pathPoint){
            var d = Number(getDistanceBetweenPoints(pathPoint, item.position)) || 0;
            if(d < minDistanceToPath){
                minDistanceToPath = d;
            }
        });

        if(minDistanceToPath > 260){
            return;
        }

        var text = ((item.name || '') + ' ' + (item.type || '') + ' ' + (item.address || '')).toLowerCase();

        if(
            text.indexOf('公园') !== -1 ||
            text.indexOf('绿道') !== -1 ||
            text.indexOf('广场') !== -1 ||
            text.indexOf('湖') !== -1 ||
            text.indexOf('江') !== -1 ||
            text.indexOf('河') !== -1 ||
            text.indexOf('步道') !== -1
        ){
            poiBonus += 5;
        }
    });

    score += Math.min(poiBonus, 16);

    if(route.patternType === 'block-loop' && minutes <= 25){
        score += 8;
    }

    return score;
}

function isLikelyFishboneRoute(route){
    if(!route || !route.spots){
        return false;
    }

    if(route.patternType === 'out-and-back'){
        return false;
    }

    return route.spots.length >= 8;
}

async function validateNearbyLoopPlan(route){
    if(!route || !route.spots || route.spots.length < 2){
        return null;
    }

    var mode = route.routeMode || 'walking';
    var config = getNearbyLoopModeConfig(mode);

    var realPath = [];
    var totalDistance = 0;
    var totalDurationSeconds = 0;
    var validatedSegments = [];

    for(var i = 0; i < route.spots.length - 1; i++){
        var start = route.spots[i].position;
        var end = route.spots[i + 1].position;

        var result = await searchSegmentRoute(start, end, mode);

        if(!result || !result.success){
            return null;
        }

        totalDistance += Number(result.distance) || 0;
        totalDurationSeconds += Number(result.duration) || 0;

        validatedSegments.push({
            start: start,
            end: end,
            mode: mode,
            path: Array.isArray(result.path) ? result.path.slice() : [],
            distance: Number(result.distance) || 0,
            duration: Number(result.duration) || 0
        });

        if(Array.isArray(result.path) && result.path.length){
            if(realPath.length){
                realPath = realPath.concat(result.path.slice(1));
            }else{
                realPath = realPath.concat(result.path);
            }
        }
    }

    var totalMinutes = Math.round(totalDurationSeconds / 60);

    if(totalMinutes > config.hardMaxMinutes){
        return null;
    }

    if(isLikelyFishboneRoute(route)){
        return null;
    }

    return Object.assign({}, route, {
        previewPath: realPath.length ? realPath : route.previewPath,
        validatedPreviewPath: realPath.length ? realPath : route.previewPath,
        validatedSegments: validatedSegments,
        totalDistance: totalDistance,
        totalDistanceText: typeof formatDistanceText === 'function'
            ? formatDistanceText(totalDistance)
            : '',
        totalDurationMinutes: totalMinutes,
        totalDurationText: typeof formatSegmentDuration === 'function'
            ? formatSegmentDuration(totalDurationSeconds)
            : (totalMinutes + '分钟'),
        isEstimated: false,
        needsRouteValidation: false
    });
}

function dedupeNearbyRoutes(routeList){
    var seen = {};
    var results = [];

    (routeList || []).forEach(function(route){
        if(!route){
            return;
        }

        var key = (route.patternType || '') + '|' +
            Math.round((route.totalDurationMinutes || 0) / 4) + '|' +
            Math.round((route.totalDistance || 0) / 250);

        if(seen[key]){
            return;
        }

        seen[key] = true;
        results.push(route);
    });

    return results;
}

async function buildNearbyLoopPlans(center, mode, poiList){
    if(!center || !Array.isArray(center)){
        return [];
    }

    var candidates = []
        .concat(buildBlockLoopCandidates(center, mode))
        .concat(buildOutAndBackCandidates(center, mode));

    candidates.forEach(function(route){
        route.score = computeNearbyRouteSkeletonScore(route, poiList || [], mode);
    });

    candidates.sort(function(a, b){
        return (b.score || 0) - (a.score || 0);
    });

    var finalResults = [];
    var validateLimit = Math.min(candidates.length, 8);

    for(var i = 0; i < validateLimit; i++){
        var validated = await validateNearbyLoopPlan(candidates[i]);
        if(validated){
            finalResults.push(validated);
        }
        if(finalResults.length >= 4){
            break;
        }
    }

    finalResults.sort(function(a, b){
        return (a.totalDurationMinutes || 0) - (b.totalDurationMinutes || 0);
    });

    return dedupeNearbyRoutes(finalResults).slice(0, 3);
}