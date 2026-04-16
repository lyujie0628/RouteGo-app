function renderTabs(){
    var routeTabsBox = document.getElementById('route-tabs');
    routeTabsBox.innerHTML = '';

    var routeKeys = Object.keys(routes);

    routeKeys.forEach(function(routeKey){
        var route = routes[routeKey];

        var tab = document.createElement('div');
        tab.className = 'route-tab route-tab-item';
        tab.dataset.route = routeKey;

        if(routeKey === currentRouteKey){
            tab.classList.add('active-tab');
        }

        if(isEditingRoutes){
            var titleInput = document.createElement('input');
            titleInput.className = 'route-tab-input';
            titleInput.type = 'text';
            titleInput.value = route.title;

            titleInput.onclick = function(event){
                event.stopPropagation();
                currentRouteKey = routeKey;
            };

            titleInput.oninput = function(){
    routes[routeKey].title = titleInput.value;

    if(currentRouteKey === routeKey){
        var pageTitleEl = document.getElementById('page-title');
        if(pageTitleEl){
            pageTitleEl.textContent = titleInput.value + ' Demo';
        }
    }
};

            titleInput.onblur = function(){
                updateRouteTitle(routeKey, titleInput.value);
            };

            titleInput.onkeydown = function(event){
                if(event.key === 'Enter'){
                    titleInput.blur();
                }
            };

            tab.appendChild(titleInput);
        }else{
            var titleSpan = document.createElement('span');
            titleSpan.className = 'route-tab-title';
            titleSpan.textContent = route.title;

            titleSpan.onclick = function(){
                currentRouteKey = routeKey;
                renderRoute();
            };

            tab.appendChild(titleSpan);
        }

        if(isEditingRoutes){
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'route-tab-close';
            deleteBtn.textContent = '×';

            
            deleteBtn.onclick = function(event){
                event.stopPropagation();
                deleteRoute(routeKey);
            };

            tab.appendChild(deleteBtn);
        }

        routeTabsBox.appendChild(tab);
    });

    if(isEditingRoutes){
        var addBtn = document.createElement('button');
        addBtn.className = 'route-tab';
        addBtn.id = 'add-route-btn';
        addBtn.textContent = '+';

        addBtn.onclick = function(){
            createNewRoute();
        };

        routeTabsBox.appendChild(addBtn);
    }
}

function renameRoute(routeKey){
    var oldName = routes[routeKey].title;
    var newName = prompt('请输入新的行程名称', oldName);

    if(!newName){
        return;
    }

    newName = newName.trim();

    if(!newName){
        alert('行程名称不能为空');
        return;
    }

    routes[routeKey].title = newName;
    renderRoute();
}

function createNewRoute(){
    var routeKeys = Object.keys(routes);
    var newIndex = routeKeys.length + 1;
    var newKey = 'route_' + Date.now();

routes[newKey] = {
    title: '行程' + newIndex,
    startDate: '',
    startTime: '',
    spots: [],
    segmentModes: [],
    segmentInfos: []
}; //添加新list的时候list维持空白

ensureRouteSegmentState(newKey);
    currentRouteKey = newKey;
    renderRoute();
}

function deleteRoute(routeKey){
    var routeKeys = Object.keys(routes);

    if(routeKeys.length <= 1){
        alert('至少保留一个行程');
        return;
    }

    delete routes[routeKey];

    var remainingKeys = Object.keys(routes);

    if(currentRouteKey === routeKey){
        currentRouteKey = remainingKeys[0];
    }

    renderRoute();
}

function updateRouteTitle(routeKey, newTitle){
    newTitle = newTitle.trim();

    if(!newTitle){
        alert('行程名称不能为空');
        renderRoute();
        return;
    }

    routes[routeKey].title = newTitle;

    if(currentRouteKey === routeKey){
    var pageTitleEl = document.getElementById('page-title');
    if(pageTitleEl){
        pageTitleEl.textContent = newTitle + ' Demo';
    }
}
}

function getDisplaySpotName(name){
    if(!name){
        return '';
    }

    var shortName = String(name).trim();

    // 统一连接符
    shortName = shortName.replace(/——|－|–|—/g, '-');

    // 规则1：凡是“xxx风景名胜区-yyy / xxx风景区-yyy / xxx旅游景区-yyy / xxx景区-yyy”
    // 直接只保留最后的小地点名
    if(/(风景名胜区|名胜风景区|风景区|旅游景区|景区)-/.test(shortName)){
        shortName = shortName.split('-').pop().trim();
    }

    // 规则2：去掉常见冗余前缀
    shortName = shortName
        .replace(/^中国人民解放军/, '')
        .replace(/联勤保障部队/g, '')
        .replace(/第\d+医院/g, '医院')
        .replace(/院区/g, '')
        .replace(/文化旅游区/g, '')
        .replace(/度假区/g, '')
        .trim();

    // 规则3：如果没有“-”，但名字里本身带“风景区/景区”等后缀，也去掉
    shortName = shortName
        .replace(/风景名胜区/g, '')
        .replace(/名胜风景区/g, '')
        .replace(/风景区/g, '')
        .replace(/旅游景区/g, '')
        .replace(/景区/g, '')
        .trim();

    // 规则4：最多显示13个字，超出加省略号
    if(shortName.length <= 13){
        return shortName;
    }

    return shortName.slice(0, 13) + '...';
}

function getSpotDisplayName(spot){
    if(!spot){
        return '';
    }

    if(spot.customName && String(spot.customName).trim()){
        var customName = String(spot.customName).trim();

        if(customName.length <= 13){
            return customName;
        }

        return customName.slice(0, 13) + '...';
    }

    return getDisplaySpotName(spot.name);
}


function isStartSpot(index){
    return index === 0;
}

function isEndSpot(index){
    return index === spots.length - 1;
}

function canShowLockButton(index){
    return isStartSpot(index) || isEndSpot(index);
}


function canDropToIndex(route, fromIndex, toIndex){
    if(!route){
        return false;
    }

    return canReorderToIndex(route, fromIndex, toIndex);
}

function getSpotCircleText(index){
    // ✅ 只有1个点 → 显示“终”
    if(spots.length === 1){
        return '终';
    }

    if(isStartSpot(index)){
        return '起';
    }

    if(isEndSpot(index)){
        return '终';
    }

    return String(index + 1);
}

function editSpotName(routeKey, index){
    var route = routes[routeKey];
    var spot = route.spots[index];

    if(!spot){
        return;
    }

    editingSpotRouteKey = routeKey;
    editingSpotIndex = index;
    renderRoute();
}

function saveSpotNameEdit(routeKey, index, newName){
    var route = routes[routeKey];
    var spot = route && route.spots[index];

    if(!spot){
        editingSpotRouteKey = null;
        editingSpotIndex = null;
        renderRoute();
        return;
    }

    newName = (newName || '').trim();

    if(newName){
        spot.customName = newName;
    }else{
        delete spot.customName;
    }

    editingSpotRouteKey = null;
    editingSpotIndex = null;
    renderRoute();
}

function cancelSpotNameEdit(){
    editingSpotRouteKey = null;
    editingSpotIndex = null;
    renderRoute();
}

function openSpotSettings(routeKey, index){
    var route = routes[routeKey];
    var spot = route && route.spots[index];

    if(!spot){
        return;
    }

    settingsSpotRouteKey = routeKey;
    settingsSpotIndex = index;
    renderRoute();
}

function closeSpotSettings(){
    settingsSpotRouteKey = null;
    settingsSpotIndex = null;
    renderRoute();
}

function formatRouteStartDateText(dateStr){
    if(!dateStr){
        return '';
    }

    var parts = dateStr.split('-');
    if(parts.length !== 3){
        return dateStr;
    }

    var year = parts[0];
    var month = Number(parts[1]);
    var day = Number(parts[2]);

    if(!month || !day){
        return dateStr;
    }

    return year + '年' + month + '月' + day + '日';
}

function getRouteStartTimeValue(route){
    return route && route.startTime ? route.startTime : '';
}

function getRouteStartTimeText(route){
    if(!route || (!route.startDate && !route.startTime)){
        return '<span class="route-start-time-placeholder">设置行程开始时间</span>';
    }

    if(route.startDate && route.startTime){
        var dateText = formatRouteStartDateText(route.startDate);

        return (
            '<span class="route-start-time-date">' + dateText + '</span>' +
            '<span class="route-start-time-value">' + route.startTime + ' 出发</span>'
        );
    }

    if(route.startDate){
        return (
            '<span class="route-start-time-date">' + formatRouteStartDateText(route.startDate) + '</span>' +
            '<span class="route-start-time-value">未设置出发时间</span>'
        );
    }

    return '<span class="route-start-time-value">' + route.startTime + ' 出发</span>';
}

function openRouteStartTimeSettings(){
    renderRouteStartTimeModal();
}

function saveRouteStartTime(routeKey, dateValue, timeValue){
    var route = routes[routeKey];

    if(!route){
        return;
    }

    dateValue = (dateValue || '').trim();
    timeValue = (timeValue || '').trim();

    if(dateValue){
        route.startDate = dateValue;
    }else{
        delete route.startDate;
    }

    if(timeValue){
        route.startTime = timeValue;
    }else{
        delete route.startTime;
    }

    renderRoute();
}

function getSpotArrivalTimeValue(spot){
    return spot && spot.arrivalTime ? spot.arrivalTime : '';
}

function getSpotStayMinutesValue(spot){
    if(!spot){
        return '';
    }

    if(typeof spot.stayMinutes === 'number' && isFinite(spot.stayMinutes) && spot.stayMinutes > 0){
        return String(spot.stayMinutes);
    }

    return '';
}

function getSpotStayHoursValue(spot){
    if(!spot){
        return '0';
    }

    var stayMinutes = Number(spot.stayMinutes);

    if(isFinite(stayMinutes) && stayMinutes > 0){
        return String(Math.floor(stayMinutes / 60));
    }

    return '0';
}

function getSpotStayRemainMinutesValue(spot){
    if(!spot){
        return '0';
    }

    var stayMinutes = Number(spot.stayMinutes);

    if(isFinite(stayMinutes) && stayMinutes > 0){
        return String(stayMinutes % 60);
    }

    return '0';
}

function formatStayMinutesText(stayMinutes){
    var total = Number(stayMinutes);

    if(!isFinite(total) || total <= 0){
        return '';
    }

    total = Math.round(total);

    var hours = Math.floor(total / 60);
    var minutes = total % 60;
    var parts = [];

    if(hours > 0){
        parts.push(hours + '小时');
    }

    if(minutes > 0){
        parts.push(minutes + '分钟');
    }

    if(parts.length === 0){
        return '0分钟';
    }

    return parts.join('');
}

function getExternalSuggestedStayMinutes(spot){
    if(!spot){
        return null;
    }

    var candidateKeys = [
        'suggestedStayMinutes',
        'recommendedStayMinutes',
        'visitDurationMinutes',
        'amapSuggestedStayMinutes',
        'playDurationMinutes'
    ];

    for(var i = 0; i < candidateKeys.length; i++){
        var value = Number(spot[candidateKeys[i]]);
        if(isFinite(value) && value > 0){
            return Math.round(value);
        }
    }

    return null;
}

function getFallbackSuggestedStayMinutes(spot){
    var name = '';
    if(spot){
        name = String(spot.customName || spot.name || '').trim();
    }

    if(!name){
        return 45;
    }

    if(/(餐厅|饭店|火锅|面馆|小吃|咖啡|酒馆|茶馆|烧烤|甜品)/.test(name)){
        return 75;
    }

    if(/(博物馆|美术馆|展览馆|纪念馆|科技馆)/.test(name)){
        return 100;
    }

    if(/(商场|广场|中心|mall|Mall|购物)/.test(name)){
        return 90;
    }

    if(/(酒店|民宿|客栈)/.test(name)){
        return 30;
    }

    if(/(寺|庙|塔|湖|山|公园|园|街|古镇|景区|风景区|湿地|乐园|遗址|故居)/.test(name)){
        return 120;
    }

    return 60;
}

function getEffectiveSpotStayMinutes(spot){
    if(!spot){
        return 0;
    }

    var manualStay = Number(spot.stayMinutes);
    if(isFinite(manualStay) && manualStay > 0){
        return Math.round(manualStay);
    }

    var externalSuggested = getExternalSuggestedStayMinutes(spot);
    if(isFinite(externalSuggested) && externalSuggested > 0){
        return externalSuggested;
    }

    return getFallbackSuggestedStayMinutes(spot);
}

function getSpotStaySource(spot){
    if(!spot){
        return 'fallback';
    }

    var manualStay = Number(spot.stayMinutes);
    if(isFinite(manualStay) && manualStay > 0){
        return 'manual';
    }

    var externalSuggested = getExternalSuggestedStayMinutes(spot);
    if(isFinite(externalSuggested) && externalSuggested > 0){
        return 'external';
    }

    return 'fallback';
}

function getTimelineSpotStayText(spot){
    var stayMinutes = getEffectiveSpotStayMinutes(spot);
    var source = getSpotStaySource(spot);

    if(source === 'manual'){
        return '停留 ' + formatStayMinutesText(stayMinutes);
    }

    if(source === 'external'){
        return '建议游玩 ' + formatStayMinutesText(stayMinutes);
    }

    return '建议停留 ' + formatStayMinutesText(stayMinutes);
}

function escapeHtml(text){
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseClockToMinutes(value){
    if(!value){
        return null;
    }

    var parts = String(value).split(':');
    if(parts.length < 2){
        return null;
    }

    var hours = Number(parts[0]);
    var minutes = Number(parts[1]);

    if(
        !isFinite(hours) || !isFinite(minutes) ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59
    ){
        return null;
    }

    return hours * 60 + minutes;
}

function formatMinutesToClock(totalMinutes){
    if(!isFinite(totalMinutes)){
        return '';
    }

    var normalized = Math.round(totalMinutes);
    normalized = ((normalized % 1440) + 1440) % 1440;

    var hours = Math.floor(normalized / 60);
    var minutes = normalized % 60;

    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

function getTimelineConflictMeta(estimatedArrivalMinutes, userArrivalMinutes){
    if(estimatedArrivalMinutes === null || userArrivalMinutes === null){
        return {
            level: 'none',
            text: ''
        };
    }

    var diff = estimatedArrivalMinutes - userArrivalMinutes;

    // 早到：系统预计比用户设定更早
    if(diff < 0){
        var earlyMinutes = Math.abs(diff);

        // 早到 3 分钟以内：弱提醒
        if(earlyMinutes <= 3){
            return {
                level: 'weak',
                text: '早到' + earlyMinutes + '分钟'
            };
        }

        // 早到 4–15 分钟：不提醒
        // 早到 15 分钟以上：不提醒
        return {
            level: 'none',
            text: ''
        };
    }

    // 同时到：弱提醒
    if(diff === 0){
        return {
            level: 'weak',
            text: '刚好卡点'
        };
    }

    // 晚到 20 分钟以上：强冲突
    if(diff >= 20){
        return {
            level: 'strong',
            text: '晚到' + diff + '分钟'
        };
    }

    // 晚到 1–19 分钟：弱提醒
    return {
        level: 'weak',
        text: '晚到' + diff + '分钟'
    };
}

function getTimelineTravelMinutes(route){
    if(!route || !Array.isArray(route.segmentInfos)){
        return 0;
    }

    var total = 0;

    route.segmentInfos.forEach(function(info){
        if(!info || info.impossible){
            return;
        }

        var duration = Number(info.duration);
        if(isFinite(duration) && duration > 0){
            total += Math.round(duration / 60);
        }
    });

    return total;
}

function getTimelineVisitMinutes(route){
    if(!route || !Array.isArray(route.spots)){
        return 0;
    }

    var total = 0;

    route.spots.forEach(function(spot){
        total += getEffectiveSpotStayMinutes(spot);
    });

    return total;
}

function getTimelineSummaryChips(timelineData){
    var chips = [];

    if(timelineData.state === 'loading'){
        chips.push('<span class="route-timeline-chip">路线时间计算中</span>');
        return chips.join('');
    }

    if(timelineData.state === 'impossible'){
        chips.push('<span class="route-timeline-chip route-timeline-chip-danger">存在无法规划路段</span>');
        return chips.join('');
    }

    if(timelineData.state !== 'ready'){
        chips.push('<span class="route-timeline-chip">暂无时间轴数据</span>');
        return chips.join('');
    }

    if(timelineData.mode === 'simple'){
        chips.push('<span class="route-timeline-chip">未设开始时间</span>');
    }else{
        if(timelineData.startMinutes !== null){
            chips.push('<span class="route-timeline-chip">' + formatMinutesToClock(timelineData.startMinutes) + ' 出发</span>');
        }

        if(timelineData.endMinutes !== null){
            chips.push('<span class="route-timeline-chip">预计 ' + formatMinutesToClock(timelineData.endMinutes) + ' 结束</span>');
        }

if(timelineData.travelMinutes > 0){
    chips.push(
        '<span class="route-timeline-chip">路程 ' +
        formatSegmentDuration(timelineData.travelMinutes * 60) +
        '</span>'
    );
}

if(timelineData.visitMinutes > 0){
    chips.push(
        '<span class="route-timeline-chip">游览 ' +
        formatSegmentDuration(timelineData.visitMinutes * 60) +
        '</span>'
    );
}

if(timelineData.totalMinutes > 0){
    chips.push(
        '<span class="route-timeline-chip">总计 ' +
        formatSegmentDuration(timelineData.totalMinutes * 60) +
        '</span>'
    );
}
    }

    chips.push('<span class="route-timeline-chip">' + timelineData.spotCount + ' 个点</span>');

    if(timelineData.weakConflictCount > 0){
        chips.push('<span class="route-timeline-chip route-timeline-chip-warning">' + timelineData.weakConflictCount + ' 个弱提醒</span>');
    }

    if(timelineData.strongConflictCount > 0){
        chips.push('<span class="route-timeline-chip route-timeline-chip-danger">' + timelineData.strongConflictCount + ' 个强冲突</span>');
    }

    return chips.join('');
}

function getTimelineSegmentDurationMinutes(route, segmentIndex){
    if(!route || !Array.isArray(route.segmentInfos)){
        return null;
    }

    var info = route.segmentInfos[segmentIndex];
    if(!info){
        return null;
    }

    if(info.impossible){
        return 'impossible';
    }

    var duration = Number(info.duration);
    if(!isFinite(duration) || duration <= 0){
        return null;
    }

    return Math.max(1, Math.round(duration / 60));
}

function getTimelineSpotWidth(stayMinutes){
    var safeMinutes = Number(stayMinutes) || 0;
    var width = 72 + Math.min(safeMinutes, 300) * 0.65;
    return Math.max(72, Math.min(240, Math.round(width)));
}

function getTimelineSegmentWidth(durationMinutes){
    var safeMinutes = Number(durationMinutes) || 0;
    var width = 52 + Math.min(safeMinutes, 240) * 0.62;
    return Math.max(52, Math.min(170, Math.round(width)));
}

function getTimelineModeIcon(mode){
    if(mode === 'driving'){
        return '🚗';
    }

    if(mode === 'riding'){
        return '🚴';
    }

    if(mode === 'transit'){
        return '🚌';
    }

    return '🚶';
}

function ensureTimelinePanel(){
    var mapEl = document.getElementById('map');
    if(!mapEl){
        return null;
    }

    var existingPanel = document.getElementById('map-timeline-panel');
    if(existingPanel){
        return document.getElementById('route-timeline-panel');
    }

    var panel = document.createElement('div');
    panel.id = 'map-timeline-panel';

    var parent = mapEl.parentNode;
    parent.insertBefore(panel, mapEl);
    panel.appendChild(mapEl);

    var timelinePanel = document.createElement('div');
    timelinePanel.id = 'route-timeline-panel';
    panel.appendChild(timelinePanel);

    return timelinePanel;
}

function ensureSearchPanel(){
    var container = document.getElementById('container');
    if(!container){
        return null;
    }

    var existingPanel = document.getElementById('search-panel');
    if(existingPanel){
        return existingPanel;
    }

    var panel = document.createElement('div');
    panel.id = 'search-panel';
    container.appendChild(panel);
    return panel;
}

function closeLocationPicker(){
    var oldMask = document.getElementById('location-picker-mask');
    if(oldMask){
        oldMask.remove();
    }
}

function renderRecentLocationButtonsHtml(){
    if(!Array.isArray(recentLocations) || recentLocations.length === 0){
        return '<div class="location-empty-text">还没有最近使用记录</div>';
    }

    return recentLocations.map(function(item, index){
        return (
            '<button class="location-chip" type="button" data-recent-index="' + index + '">' +
                escapeHtml(item.label || item.cityName || '未命名位置') +
            '</button>'
        );
    }).join('');
}

function renderHotCityButtonsHtml(){
    return hotCityOptions.map(function(item, index){
        return (
            '<button class="location-chip" type="button" data-hot-city-index="' + index + '">' +
                escapeHtml(item.label) +
            '</button>'
        );
    }).join('');
}

function updateLocationUiAfterChange(){
    renderSearchPanel();

    if(typeof applyLocationContextToMap === 'function'){
        applyLocationContextToMap({ zoom: 12 });
    }
}

function openLocationPicker(){
    closeLocationPicker();

    var mask = document.createElement('div');
    mask.id = 'location-picker-mask';
    mask.className = 'location-picker-mask';

    mask.innerHTML =
        '<div class="location-picker-dialog">' +
            '<div class="location-picker-header">' +
                '<div class="location-picker-title">选择所在地区</div>' +
                '<button class="location-picker-close" type="button">×</button>' +
            '</div>' +

            '<div class="location-picker-body">' +
                '<div class="location-search-box">' +
                    '<input id="location-search-input" class="location-search-input" type="text" placeholder="搜索城市 / 区域 / 景点（下一步再接搜索）">' +
                '</div>' +

                '<div class="location-section">' +
                    '<div class="location-section-title">当前选择</div>' +
                    '<div class="location-current-card">' +
                        '<div class="location-current-label">当前选择：' + escapeHtml(getLocationDisplayText()) + '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="location-section">' +
                    '<div class="location-section-title">当前位置</div>' +
                    '<div class="location-action-row">' +
                        '<button id="use-current-location-btn" class="location-action-btn primary" type="button">使用当前定位</button>' +
                        '<button id="relocate-btn" class="location-action-btn" type="button">重新定位</button>' +
                    '</div>' +
                '</div>' +

                '<div class="location-section">' +
                    '<div class="location-section-title">最近使用</div>' +
                    '<div class="location-chip-list">' +
                        renderRecentLocationButtonsHtml() +
                    '</div>' +
                '</div>' +

                '<div class="location-section">' +
                    '<div class="location-section-title">热门城市</div>' +
                    '<div class="location-chip-list">' +
                        renderHotCityButtonsHtml() +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(mask);

    mask.addEventListener('click', function(event){
        if(event.target === mask){
            closeLocationPicker();
        }
    });

    var closeBtn = mask.querySelector('.location-picker-close');
    if(closeBtn){
        closeBtn.onclick = function(){
            closeLocationPicker();
        };
    }

    var useCurrentBtn = document.getElementById('use-current-location-btn');
    var relocateBtn = document.getElementById('relocate-btn');

    function handleLocate(){
        if(!navigator.geolocation){
            alert('当前浏览器不支持定位。');
            return;
        }

        useCurrentBtn.disabled = true;
        relocateBtn.disabled = true;
        useCurrentBtn.textContent = '定位中...';

        navigator.geolocation.getCurrentPosition(
            function(position){
                var lng = Number(position.coords.longitude);
                var lat = Number(position.coords.latitude);
                var point = [lng, lat];

                reverseGeocodeLocation(point).then(function(result){
                    var nextLocation = extractCityInfoFromGeocodeResult(result, point);
                    setLocationContext(nextLocation, { pushRecent: true });
                    updateLocationUiAfterChange();
                    closeLocationPicker();
                }).catch(function(){
                    setLocationContext({
                        cityName: '当前位置',
                        adcode: '',
                        lng: lng,
                        lat: lat,
                        label: '当前位置',
                        sourceType: 'gps'
                    }, { pushRecent: true });

                    updateLocationUiAfterChange();
                    closeLocationPicker();
                });
            },
            function(){
                alert('定位失败，请检查浏览器定位权限。');
                useCurrentBtn.disabled = false;
                relocateBtn.disabled = false;
                useCurrentBtn.textContent = '使用当前定位';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    if(useCurrentBtn){
        useCurrentBtn.onclick = handleLocate;
    }

    if(relocateBtn){
        relocateBtn.onclick = handleLocate;
    }

    mask.querySelectorAll('[data-recent-index]').forEach(function(btn){
        btn.onclick = function(){
            var index = Number(btn.dataset.recentIndex);
            var item = recentLocations[index];
            if(!item){
                return;
            }

            setLocationContext(item, { pushRecent: true });
            updateLocationUiAfterChange();
            closeLocationPicker();
        };
    });

    mask.querySelectorAll('[data-hot-city-index]').forEach(function(btn){
        btn.onclick = function(){
            var index = Number(btn.dataset.hotCityIndex);
            var item = hotCityOptions[index];
            if(!item){
                return;
            }

            setLocationContext({
                cityName: item.cityName,
                adcode: item.adcode || '',
                lng: item.lng,
                lat: item.lat,
                label: item.label,
                sourceType: 'manual'
            }, { pushRecent: true });

            updateLocationUiAfterChange();
            closeLocationPicker();
        };
    });
}

function clearSearchPreviewMarker(){
    if(searchPreviewMarker){
        map.remove(searchPreviewMarker);
        searchPreviewMarker = null;
    }

    if(typeof clearSearchPreviewOverlays === 'function'){
        clearSearchPreviewOverlays();
    }
}

function clearSearchDebounce(){
    if(searchDebounceTimer){
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }
}

function resetSearchToGuideMode(){
    clearSearchDebounce();
    searchPanelMode = 'guide';
    searchGuideMode = '';
    nearbyLoopDurationMinutes = 30;
    travelRouteDays = 1;
    searchResultType = 'place';
    searchResultTitle = '';
    searchResults = [];
    searchLoading = false;
    searchErrorText = '';
    clearSearchPreviewMarker();
    renderSearchPanel();
}

function buildSearchResultAddress(item){
    var parts = [];

    if(item.cityname){
        parts.push(item.cityname);
    }

    if(item.adname && item.adname !== item.cityname){
        parts.push(item.adname);
    }

    if(item.address){
        parts.push(item.address);
    }

    var text = parts.join(' ');
    return text || '暂无地址信息';
}

function normalizePlaceSearchResult(poi){
    if(!poi || !poi.location){
        return null;
    }

    var lng = Number(poi.location.lng);
    var lat = Number(poi.location.lat);

    if(!isFinite(lng) || !isFinite(lat)){
        return null;
    }

    var position = [lng, lat];
    var referencePoint = typeof getCurrentDistanceReferencePoint === 'function'
        ? getCurrentDistanceReferencePoint()
        : null;

    var distanceMeters = typeof getDistanceBetweenPoints === 'function'
        ? getDistanceBetweenPoints(referencePoint, position)
        : null;

    return {
        cardType: 'place',
        name: poi.name || '未命名地点',
        address: buildSearchResultAddress(poi),
        type: poi.type || '',
        cityname: poi.cityname || '',
        adname: poi.adname || '',
        position: position,
        distanceMeters: distanceMeters,
        distanceText: typeof formatDistanceText === 'function' ? formatDistanceText(distanceMeters) : ''
    };
}

function getSearchScopeText(scope){
    if(scope && scope.city){
        return scope.city;
    }
    return '当前地图区域';
}

function extractPlaceListFromSearchResult(result){
    if(!result || !result.poiList || !Array.isArray(result.poiList.pois)){
        return [];
    }

    return result.poiList.pois
        .map(normalizePlaceSearchResult)
        .filter(function(item){
            return !!item;
        });
}

function runScopedPlaceSearch(keyword, options){
    keyword = String(keyword || '').trim();
    options = options || {};

    return new Promise(function(resolve){
        if(!(window.AMap && AMap.plugin)){
            resolve({
                ok: false,
                scope: null,
                list: [],
                errorText: '当前地图搜索能力未加载成功'
            });
            return;
        }

        getMapCenterSearchScope(function(scope){
            AMap.plugin(['AMap.PlaceSearch'], function(){
                var placeSearch = new AMap.PlaceSearch({
                    pageSize: options.pageSize || 8,
                    pageIndex: 1,
                    city: scope && scope.city ? scope.city : '全国',
                    citylimit: !!(scope && scope.citylimit),
                    extensions: 'base',
                    map: null,
                    panel: null
                });

                var done = function(status, result){
                    var list = extractPlaceListFromSearchResult(result);

                    if(status !== 'complete'){
                        resolve({
                            ok: false,
                            scope: scope,
                            list: [],
                            errorText: '没有搜到相关地点'
                        });
                        return;
                    }

                    resolve({
                        ok: true,
                        scope: scope,
                        list: list,
                        errorText: list.length ? '' : '没有搜到相关地点'
                    });
                };

                if(options.useNearby && scope && scope.center){
                    placeSearch.searchNearBy(
                        keyword,
                        scope.center,
                        options.radius || 5000,
                        done
                    );
                }else{
                    placeSearch.search(keyword, done);
                }
            });
        });
    });
}

function setSearchLoading(resultType, title){
    searchPanelMode = 'results';
    searchResultType = resultType || 'place';
    searchResultTitle = title || '';
    searchResults = [];
    searchLoading = true;
    searchErrorText = '';
    renderSearchPanel();
}

function setSearchResults(resultType, title, list, errorText){
    searchPanelMode = 'results';
    searchResultType = resultType || 'place';
    searchResultTitle = title || '';
    searchResults = Array.isArray(list) ? list : [];
    searchLoading = false;
    searchErrorText = errorText || '';
    renderSearchPanel();
}

function runPlaceSearch(keyword, options){
    options = options || {};
    keyword = String(keyword || '').trim();
    searchKeyword = keyword;
    searchGuideMode = '';

    if(!keyword){
        resetSearchToGuideMode();
        return;
    }

    clearSearchDebounce();

var currentRequestId = ++searchRequestId;
var isAutoSearch = !!options.fromAuto;

if(!isAutoSearch){
    setSearchLoading('place', '地点结果');
}

   runScopedPlaceSearch(keyword, {
    pageSize: 8
}).then(function(payload){
    if(currentRequestId !== searchRequestId){
        return;
    }

    if(options.fromAuto){
        var activeEl = document.activeElement;
        var isStillTyping = activeEl && activeEl.id === 'search-input';
        var recentlyTyped = Date.now() - lastSearchInputAt < 2000;

        if(isStillTyping || recentlyTyped){
            return;
        }
    }

    var scopeText = getSearchScopeText(payload.scope);

    if(!payload.ok){
        setSearchResults('place', scopeText + ' · 地点结果', [], payload.errorText || '没有搜到相关地点');
        return;
    }

    setSearchResults(
        'place',
        scopeText + ' · 地点结果',
        payload.list,
        payload.list.length ? '' : ('在' + scopeText + '附近没有搜到相关地点')
    );
});
}

function scheduleAutoPlaceSearch(keyword){
    keyword = String(keyword || '').trim();
    searchKeyword = keyword;
    searchGuideMode = '';

    if(!keyword){
        resetSearchToGuideMode();
        return;
    }

    clearSearchDebounce();

searchDebounceTimer = setTimeout(function(){
    runPlaceSearch(keyword, { fromAuto: true });
}, 1200);
}

function runNearbySpotsGuideSearch(isSilentRefresh){
    searchGuideMode = 'nearby-spots';
    searchKeyword = '';
    clearSearchDebounce();

    if(!isSilentRefresh){
        setSearchLoading('place', '附近看点');
    }

    var currentRequestId = ++searchRequestId;

    runScopedPlaceSearch('景点', {
        useNearby: true,
        radius: 6000,
        pageSize: 10
    }).then(function(payload){
        if(currentRequestId !== searchRequestId){
            return;
        }

        var scopeText = getSearchScopeText(payload.scope);

        if(payload.scope && payload.scope.center){
            nearbyExploreAnchor = payload.scope.center;
        }

        distanceReferenceMode = 'map';
        distanceReferencePoint = payload.scope && payload.scope.center ? payload.scope.center : null;
        distanceReferenceLabel = '当前地图中心';

        setSearchResults(
            'place',
            scopeText + ' · 附近看点',
            payload.list,
            payload.list.length ? '' : ('在' + scopeText + '附近暂时没找到合适地点')
        );
    });
}

async function buildNearbyLoopRouteResults(placeList, mode){
    var center = typeof getCurrentDistanceReferencePoint === 'function'
        ? getCurrentDistanceReferencePoint()
        : null;

    if(!center || !Array.isArray(placeList) || !placeList.length){
        return [];
    }

    var config = getNearbyLoopConfig(mode, nearbyLoopDurationMinutes || 30);
    var timeRange = getNearbyLoopTimeRange(mode, nearbyLoopDurationMinutes || 30);

    var pointCount = config.pointCount;
    var maxDistance = config.maxDistance;

    var candidates = sortNearbyLoopCandidates(placeList, center, maxDistance);

    if(candidates.length < pointCount){
        return [];
    }

    var candidateSets = buildLoopCandidateSets(candidates, pointCount);
    var titles = ['轻松绕一圈', '经典附近逛逛', '多看几个点'];
    var results = [];

    for(var i = 0; i < candidateSets.length; i++){
        var evaluated = await evaluateNearbyLoopCandidate(
            center,
            candidateSets[i],
            mode,
            titles[i] || ('附近逛逛方案' + (i + 1))
        );

        if(!evaluated){
            continue;
        }

        var minutes = evaluated.totalDurationMinutes || 0;

        if(minutes >= timeRange.min && minutes <= timeRange.max){
            results.push(evaluated);
        }
    }

    if(results.length){
        return results.slice(0, 3);
    }

    // 如果没有命中理想区间，就退一步给最接近的
    var fallbackResults = [];

    for(var j = 0; j < candidateSets.length; j++){
        var fallback = await evaluateNearbyLoopCandidate(
            center,
            candidateSets[j],
            mode,
            titles[j] || ('附近逛逛方案' + (j + 1))
        );

        if(fallback){
            fallback.durationDiff = Math.abs((fallback.totalDurationMinutes || 0) - (nearbyLoopDurationMinutes || 30));
            fallbackResults.push(fallback);
        }
    }

    fallbackResults.sort(function(a, b){
        return a.durationDiff - b.durationDiff;
    });

    return fallbackResults.slice(0, 3);
}

function runNearbyLoopGuideSearch(){
    searchGuideMode = 'nearby-loop';
    searchKeyword = '';
    clearSearchDebounce();
    setSearchLoading('route', '附近逛逛');

    var currentRequestId = ++searchRequestId;
    var loadingToken = ++nearbyLoopLoadingToken;

    runScopedPlaceSearch('公园', {
        useNearby: true,
        radius: nearbyLoopMode === 'walking' ? 3500 : (nearbyLoopMode === 'riding' ? 7000 : 12000),
        pageSize: 12
    }).then(function(payload1){
        return Promise.all([
            Promise.resolve(payload1),
            runScopedPlaceSearch('绿道', {
                useNearby: true,
                radius: nearbyLoopMode === 'walking' ? 3500 : (nearbyLoopMode === 'riding' ? 7000 : 12000),
                pageSize: 12
            }),
            runScopedPlaceSearch('广场', {
                useNearby: true,
                radius: nearbyLoopMode === 'walking' ? 3500 : (nearbyLoopMode === 'riding' ? 7000 : 12000),
                pageSize: 12
            }),
            runScopedPlaceSearch('湖', {
                useNearby: true,
                radius: nearbyLoopMode === 'walking' ? 3500 : (nearbyLoopMode === 'riding' ? 7000 : 12000),
                pageSize: 12
            })
        ]);
    }).then(async function(payloads){
        if(currentRequestId !== searchRequestId || loadingToken !== nearbyLoopLoadingToken){
            return;
        }

        var merged = [];
        var seen = {};
        var scope = payloads[0] ? payloads[0].scope : null;

        payloads.forEach(function(payload){
            (payload.list || []).forEach(function(item){
                if(!item || !item.position){
                    return;
                }

                var key = item.name + '|' + item.position[0] + ',' + item.position[1];
                if(seen[key]){
                    return;
                }
                seen[key] = true;
                merged.push(item);
            });
        });

var rawCenter = scope && scope.center ? scope.center : getCurrentDistanceReferencePoint();
var center = rawCenter;

if(typeof resolveNearbyLoopStartPoint === 'function' && rawCenter){
    center = await resolveNearbyLoopStartPoint(rawCenter, nearbyLoopMode);
}

if(center){
    distanceReferenceMode = 'map';
    distanceReferencePoint = center;
    distanceReferenceLabel = samePoint(center, rawCenter) ? '当前地图中心' : '附近可出发点';
}

var routes = await buildNearbyLoopPlans(center, nearbyLoopMode, merged);

        if(currentRequestId !== searchRequestId || loadingToken !== nearbyLoopLoadingToken){
            return;
        }

        setSearchResults(
            'route',
            '附近逛逛',
            routes,
            routes.length ? '' : '当前区域暂时没生成出合适的附近逛逛路线'
        );
    });
}

function buildTravelRouteResults(placeList, scopeText, days){
    var dayLabel = days === 1 ? '一日游' : (days === 2 ? '两日游' : '多日游');
    var targetCount = days === 1 ? 4 : (days === 2 ? 6 : 8);
    var sourceList = (placeList || []).slice(0, Math.max(targetCount + 3, 8));

    if(sourceList.length < 3){
        return [];
    }

    var resultRoutes = [];

    var planDefs = days === 1
        ? [
            { name: '经典一日游', count: 4 },
            { name: '轻松一日游', count: 3 },
            { name: '城市打卡一日游', count: 4 }
        ]
        : days === 2
            ? [
                { name: '经典两日游', count: 6 },
                { name: '人文两日游', count: 5 },
                { name: '轻松两日游', count: 5 }
            ]
            : [
                { name: '经典多日游', count: 8 },
                { name: '深度多日游', count: 7 },
                { name: '轻松多日游', count: 6 }
            ];

    planDefs.forEach(function(plan, idx){
        var chosen = sourceList.slice(idx, idx + plan.count);

        if(chosen.length < 3){
            return;
        }

        var totalDistance = 0;
        for(var i = 0; i < chosen.length - 1; i++){
            totalDistance += Number(getDistanceBetweenPoints(chosen[i].position, chosen[i + 1].position)) || 0;
        }

        var totalMinutes = Math.max(
            days === 1 ? 300 : (days === 2 ? 600 : 900),
            Math.round(totalDistance / 220) + chosen.length * 60
        );

        resultRoutes.push({
            cardType: 'route',
            routeMode: 'driving',
            routeKind: 'travel-city',
            days: days,
            name: scopeText + ' · ' + plan.name,
            address: chosen.map(function(item){
                return item.name;
            }).join(' → '),
            spots: chosen.map(function(item){
                return {
                    name: item.name,
                    position: item.position
                };
            }),
            totalDistance: totalDistance,
            totalDistanceText: typeof formatDistanceText === 'function' ? formatDistanceText(totalDistance) : '',
            totalDurationMinutes: totalMinutes,
            totalDurationText: days === 1
                ? '约1天'
                : (days === 2 ? '约2天' : '约3天+')
        });
    });

    return resultRoutes;
}
function runTravelRoutesGuideSearch(){
    searchGuideMode = 'travel-routes';
    searchKeyword = '';
    clearSearchDebounce();
    setSearchLoading('route', '旅游路线');

    var currentRequestId = ++searchRequestId;

    getMapCenterSearchScope(function(scope){
        var scopeText = getSearchScopeText(scope);
        var keywords = [
            '景点',
            '公园',
            '博物馆',
            '历史古迹',
            '风景名胜'
        ];

        Promise.all(
            keywords.map(function(keyword){
                return runScopedPlaceSearch(keyword, {
                    useNearby: false,
                    pageSize: 10
                });
            })
        ).then(function(results){
            if(currentRequestId !== searchRequestId){
                return;
            }

            var merged = [];
            var seen = {};

            results.forEach(function(payload){
                (payload.list || []).forEach(function(item){
                    if(!item || !item.position){
                        return;
                    }

                    var key = item.name + '|' + item.position[0] + ',' + item.position[1];
                    if(seen[key]){
                        return;
                    }
                    seen[key] = true;
                    merged.push(item);
                });
            });

            // 按“更像旅游点”的优先级做一个粗排序
            merged.sort(function(a, b){
                var aScore = 0;
                var bScore = 0;

                var aText = (a.name || '') + ' ' + (a.type || '');
                var bText = (b.name || '') + ' ' + (b.type || '');

                ['风景', '名胜', '公园', '博物馆', '古迹', '湖', '寺', '街区'].forEach(function(token){
                    if(aText.indexOf(token) !== -1) aScore += 2;
                    if(bText.indexOf(token) !== -1) bScore += 2;
                });

                return bScore - aScore;
            });

            var routeResults = buildTravelRouteResults(merged, scopeText, travelRouteDays);

            setSearchResults(
                'route',
                scopeText + ' · 旅游路线',
                routeResults,
                routeResults.length ? '' : ('在' + scopeText + '暂时没生成出合适的旅游路线')
            );
        });
    });
}

function handleSearchGuideAction(action){
    clearSearchPreviewMarker();

    if(action === 'nearby-spots'){
        runNearbySpotsGuideSearch(false);
        return;
    }

    if(action === 'nearby-loop'){
        runNearbyLoopGuideSearch();
        return;
    }

    if(action === 'travel-routes'){
        runTravelRoutesGuideSearch();
    }
}

function buildGuideActionsHtml(){
    return (
        '<div class="search-guide-section">' +
            '<div class="search-guide-title">试试这些入口</div>' +
            '<div class="search-guide-list">' +
                '<button class="search-guide-card" type="button" data-guide-action="nearby-spots">' +
                    '<span class="search-guide-card-title">附近看点</span>' +
                    '<span class="search-guide-card-desc">跟着当前地图区域动态刷新，适合一边看地图，一边挑附近可去的点</span>' +
                '</button>' +
                '<button class="search-guide-card" type="button" data-guide-action="nearby-loop">' +
                    '<span class="search-guide-card-title">附近逛逛</span>' +
                    '<span class="search-guide-card-desc">生成一条附近可玩的环形路线，适合散步、骑车、开车兜风</span>' +
                '</button>' +
                '<button class="search-guide-card" type="button" data-guide-action="travel-routes">' +
                    '<span class="search-guide-card-title">旅游路线</span>' +
                    '<span class="search-guide-card-desc">按当前城市生成一日游、两日游、多日游方案</span>' +
                '</button>' +
            '</div>' +
        '</div>'
    );
}

function buildDistanceMetaHtml(item){
    var pieces = [];

    if(item.distanceText){
        pieces.push('距' + distanceReferenceLabel + ' ' + item.distanceText);
    }

    return pieces.length
        ? '<div class="search-result-meta">' + pieces.join(' · ') + '</div>'
        : '';
}

function buildPlaceResultCardHtml(item, index){
    var typeHtml = item.type
        ? '<span class="search-result-type">' + escapeHtml(item.type.split(';')[0]) + '</span>'
        : '';

    return (
        '<div class="search-result-card">' +
            '<div class="search-result-top">' +
                '<div class="search-result-main">' +
                    '<div class="search-result-name">' + escapeHtml(item.name) + '</div>' +
                    '<div class="search-result-address">' + escapeHtml(item.address) + '</div>' +
                    buildDistanceMetaHtml(item) +
                '</div>' +
                typeHtml +
            '</div>' +
            '<div class="search-result-actions">' +
                '<button class="search-result-btn search-locate-btn" data-action="locate" data-index="' + index + '" type="button">定位</button>' +
                '<button class="search-result-btn search-add-btn" data-action="add" data-index="' + index + '" type="button">加入行程</button>' +
            '</div>' +
        '</div>'
    );
}

function buildRouteSummaryHtml(item){
    var parts = [];

    if(item.totalDurationText){
        parts.push('预计 ' + item.totalDurationText);
    }

    if(item.totalDistanceText){
        parts.push(item.totalDistanceText);
    }

    if(item.routeMode === 'walking'){
        parts.push('步行');
    }else if(item.routeMode === 'riding'){
        parts.push('骑行');
    }else if(item.routeMode === 'driving'){
        parts.push('驾车');
    }

    return parts.length
        ? '<div class="search-result-meta">' + parts.join(' · ') + '</div>'
        : '';
}

function buildSearchRouteItemKey(item){
    if(!item || !Array.isArray(item.spots)){
        return '';
    }

    return [
        item.routeKind || '',
        item.routeMode || '',
        item.days || '',
        item.spots.map(function(spot){
            if(!spot || !spot.position){
                return '';
            }
            return (spot.name || '') + '@' + spot.position[0] + ',' + spot.position[1];
        }).join('|')
    ].join('||');
}

function getRealSpotsFromRouteItem(item){
    if(!item || !Array.isArray(item.spots)){
        return [];
    }

    return item.spots.filter(function(spot){
        if(!spot || !spot.position){
            return false;
        }

        var rawName = String(spot.name || '').trim();
        return rawName !== '出发点' &&
               rawName !== '回到出发点' &&
               rawName !== '回到起点';
    }).map(function(spot){
        return {
            name: String(spot.name || '').trim(),
            position: spot.position
        };
    });
}

function buildSpotSignature(spot){
    if(!spot || !spot.position){
        return '';
    }

    return (spot.name || '') + '@' + spot.position[0] + ',' + spot.position[1];
}

function canUndoAddedSearchRoute(item){
    var itemKey = buildSearchRouteItemKey(item);
    var batch = addedSearchRouteBatchMap[itemKey];
    var route = routes[currentRouteKey];

    if(!itemKey || !batch || !route || !Array.isArray(route.spots)){
        return false;
    }

    var expected = batch.signatures || [];
    if(!expected.length){
        return false;
    }

    var currentSignatures = route.spots.map(buildSpotSignature);

    return expected.every(function(signature){
        return currentSignatures.indexOf(signature) !== -1;
    });
}

function removeAddedSearchRouteBatch(item){
    var itemKey = buildSearchRouteItemKey(item);
    var batch = addedSearchRouteBatchMap[itemKey];
    var route = routes[currentRouteKey];

    if(!itemKey || !batch || !route || !Array.isArray(route.spots)){
        return;
    }

    var signatures = batch.signatures || [];
    if(!signatures.length){
        delete addedSearchRouteBatchMap[itemKey];
        renderRoute();
        return;
    }

    var currentSignatures = route.spots.map(buildSpotSignature);
    var canRemove = signatures.every(function(signature){
        return currentSignatures.indexOf(signature) !== -1;
    });

    if(!canRemove){
        delete addedSearchRouteBatchMap[itemKey];
        renderSearchPanel();
        return;
    }

    route.spots = route.spots.filter(function(spot){
        return signatures.indexOf(buildSpotSignature(spot)) === -1;
    });

    normalizeEdgeLocks(route);
    rebuildSegmentModes(currentRouteKey);
    clearRouteSegmentInfos(currentRouteKey);

    delete addedSearchRouteBatchMap[itemKey];

    clearPendingAddMarker();
    clearSegmentOverlays();
    renderRouteSegmentInfosOnly();
    renderRoute();
}

function markAddedSearchRouteBatch(item){
    var itemKey = buildSearchRouteItemKey(item);
    var realSpots = getRealSpotsFromRouteItem(item);

    if(!itemKey || !realSpots.length){
        return;
    }

    addedSearchRouteBatchMap[itemKey] = {
        signatures: realSpots.map(buildSpotSignature)
    };
}

function buildRouteResultCardHtml(item, index){
    var routeLine = Array.isArray(item.spots) && item.spots.length
        ? item.spots.map(function(spot){
            return '<span class="search-route-spot">' + escapeHtml(spot.name) + '</span>';
        }).join('<span class="search-route-arrow">→</span>')
        : '<span class="search-route-empty">当前先作为预留入口</span>';

    var canUndo = canUndoAddedSearchRoute(item);
    var actionLabel = canUndo ? '撤回加入' : '加入行程';
    var actionType = canUndo ? 'undo-add' : 'add';

    return (
        '<div class="search-result-card search-route-card">' +
            '<div class="search-result-top">' +
                '<div class="search-result-main">' +
                    '<div class="search-result-name">' + escapeHtml(item.name) + '</div>' +
                    '<div class="search-result-address">' + escapeHtml(item.address || '') + '</div>' +
                    buildRouteSummaryHtml(item) +
                '</div>' +
                '<span class="search-result-type">路线</span>' +
            '</div>' +
            '<div class="search-route-line">' + routeLine + '</div>' +
            '<div class="search-result-actions">' +
                '<button class="search-result-btn search-locate-btn" data-action="preview-route" data-index="' + index + '" type="button">查看路线</button>' +
                '<button class="search-result-btn search-add-btn" data-action="' + actionType + '" data-index="' + index + '" type="button">' + actionLabel + '</button>' +
            '</div>' +
        '</div>'
    );
}

function addMultipleSpotsToCurrentRoute(spotsToAdd){
    if(!Array.isArray(spotsToAdd) || spotsToAdd.length === 0){
        return;
    }

    var route = routes[currentRouteKey];
    if(!route){
        return;
    }

    var cleanList = [];
    var seen = {};

    spotsToAdd.forEach(function(spot, index){
        if(!spot || !spot.position){
            return;
        }

        var rawName = String(spot.name || '').trim();

        // 过滤虚拟点：出发点 / 回到出发点 / 回到起点
        if(
            rawName === '出发点' ||
            rawName === '回到出发点' ||
            rawName === '回到起点'
        ){
            return;
        }

        var key = spot.position[0] + ',' + spot.position[1];

        if(seen[key]){
            return;
        }
        seen[key] = true;

        cleanList.push({
            name: rawName || ('地点' + (index + 1)),
            position: spot.position
        });
    });

    if(!cleanList.length){
        alert('这条推荐路线里暂时没有可加入行程的实际景点');
        return;
    }

    var lastIndex = route.spots.length - 1;
    var endLocked = lastIndex >= 0 && !!route.spots[lastIndex].isLocked;

    cleanList.forEach(function(spot){
        if(endLocked){
            route.spots.splice(route.spots.length - 1, 0, {
                name: spot.name,
                position: spot.position
            });
        }else{
            route.spots.push({
                name: spot.name,
                position: spot.position
            });
        }
    });

    normalizeEdgeLocks(route);
    rebuildSegmentModes(currentRouteKey);
    clearRouteSegmentInfos(currentRouteKey);

    clearPendingAddMarker();
    clearSegmentOverlays();
    renderRouteSegmentInfosOnly();
    renderRoute();
}

function addSearchResultToRoute(resultIndex){
    var item = searchResults[resultIndex];
    if(!item){
        return;
    }

    if(item.cardType === 'route'){
        addMultipleSpotsToCurrentRoute(item.spots || []);
        markAddedSearchRouteBatch(item);
        clearSearchPreviewMarker();

        if(item.spots && item.spots[0]){
            map.setCenter(item.spots[0].position);
        }

        renderSearchPanel();
        return;
    }

    if(!item.position){
        return;
    }

    addSpotToCurrentRoute({
        name: item.name,
        position: item.position
    });

    clearSearchPreviewMarker();
    map.setCenter(item.position);
}

function focusSearchResult(resultIndex){
    var item = searchResults[resultIndex];
    if(!item){
        return;
    }

    if(item.cardType === 'route'){
        previewSearchRouteOnMap(item);
        return;
    }

    if(!item.position){
        return;
    }

    clearSearchPreviewMarker();

    searchPreviewMarker = new AMap.Marker({
        position: item.position,
        map: map,
        offset: new AMap.Pixel(-12, -16),
        content:
            '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' +
                '<div style="background:#f97316;color:white;padding:4px 8px;border-radius:14px;font-size:12px;font-weight:bold;line-height:1;">搜</div>' +
                '<div style="background:rgba(255,255,255,0.96);color:#1e293b;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.12);line-height:1.2;">' + escapeHtml(item.name) + '</div>' +
            '</div>'
    });

    map.setCenter(item.position);
    map.setZoom(15);
}

function getNearbyLoopDurationOptions(mode){
    if(mode === 'walking'){
        return [15, 30, 60];
    }

    if(mode === 'riding'){
        return [30, 60];
    }

    return [30, 45, 60];
}

function getNearbyLoopConfig(mode, minutes){
    var key = mode + '-' + minutes;

    var configMap = {
        'walking-15': { maxDistance: 1400, pointCount: 2 },
        'walking-30': { maxDistance: 2600, pointCount: 3 },
        'walking-45': { maxDistance: 3600, pointCount: 3 },
        'walking-60': { maxDistance: 4600, pointCount: 4 },

        'riding-30': { maxDistance: 7000, pointCount: 3 },
        'riding-60': { maxDistance: 12000, pointCount: 4 },

        'driving-30': { maxDistance: 12000, pointCount: 3 },
        'driving-45': { maxDistance: 18000, pointCount: 4 },
        'driving-60': { maxDistance: 24000, pointCount: 4 }
    };

    return configMap[key] || { maxDistance: 3000, pointCount: 3 };
}

function getNearbyLoopTimeRange(mode, minutes){
    if(mode === 'walking'){
        if(minutes === 15) return { min: 10, max: 20 };
        if(minutes === 30) return { min: 25, max: 40 };
        return { min: 50, max: 75 };
    }

    if(mode === 'riding'){
        if(minutes === 30) return { min: 25, max: 40 };
        return { min: 50, max: 75 };
    }

    if(mode === 'driving'){
        if(minutes === 30) return { min: 20, max: 40 };
        if(minutes === 45) return { min: 35, max: 55 };
        return { min: 50, max: 75 };
    }

    return { min: Math.max(10, minutes - 10), max: minutes + 15 };
}

function buildLoopCandidateSets(candidates, pointCount){
    var sets = [];
    if(!Array.isArray(candidates) || candidates.length < pointCount){
        return sets;
    }

    for(var offset = 0; offset < Math.min(6, candidates.length); offset++){
        var chosen = [];
        for(var i = 0; i < pointCount; i++){
            var index = Math.floor((i + offset * 0.28) * candidates.length / pointCount) % candidates.length;
            if(candidates[index]){
                chosen.push(candidates[index].raw);
            }
        }

        var deduped = [];
        var seen = {};
        chosen.forEach(function(item){
            var key = item.position[0] + ',' + item.position[1];
            if(!seen[key]){
                seen[key] = true;
                deduped.push(item);
            }
        });

        if(deduped.length >= Math.max(2, pointCount - 1)){
            sets.push(deduped);
        }
    }

    return sets;
}

async function evaluateNearbyLoopCandidate(center, chosenPoints, mode, title){
    var spots = [{
        name: '出发点',
        position: center
    }];

    chosenPoints.forEach(function(item){
        spots.push({
            name: item.name,
            position: item.position
        });
    });

    spots.push({
        name: '回到出发点',
        position: center
    });

    var totalDistance = 0;
    var totalDuration = 0;

    for(var i = 0; i < spots.length - 1; i++){
        var result = await searchSegmentRoute(spots[i].position, spots[i + 1].position, mode);

        if(!result.success){
            return null;
        }

        totalDistance += Number(result.distance) || 0;
        totalDuration += Number(result.duration) || 0;
    }

    return {
        cardType: 'route',
        routeMode: mode,
        routeKind: 'nearby-loop',
        name: title,
        address: chosenPoints.map(function(item){
            return item.name;
        }).join(' · '),
        spots: spots,
        totalDistance: totalDistance,
        totalDistanceText: typeof formatDistanceText === 'function' ? formatDistanceText(totalDistance) : '',
        totalDurationMinutes: Math.round(totalDuration / 60),
        totalDurationText: formatSegmentDuration(totalDuration)
    };
}

function sortNearbyLoopCandidates(placeList, center, maxDistance){
    function getAngle(point){
        var dx = point.position[0] - center[0];
        var dy = point.position[1] - center[1];
        return Math.atan2(dy, dx);
    }

    function getDistance(point){
        return Number(getDistanceBetweenPoints(center, point.position)) || 0;
    }

    function isGoodNearbyLoopCandidate(item){
        var text = ((item.name || '') + ' ' + (item.type || '') + ' ' + (item.address || '')).toLowerCase();

        var blockedWords = [
            '收费', '门票', '景区', '乐园', '动物园', '游乐园',
            '博物馆', '展览馆', '酒店', '宾馆', '机场', '火车站',
            '商场', '购物', '小区', '住宅', '写字楼'
        ];

        for(var i = 0; i < blockedWords.length; i++){
            if(text.indexOf(blockedWords[i]) !== -1){
                return false;
            }
        }

        return true;
    }

    return placeList
        .filter(function(item){
            return item && item.position && isGoodNearbyLoopCandidate(item);
        })
        .map(function(item){
            return {
                raw: item,
                angle: getAngle(item),
                distance: getDistance(item)
            };
        })
        .filter(function(item){
            return item.distance > maxDistance * 0.15 && item.distance < maxDistance * 0.55;
        })
        .sort(function(a, b){
            return a.angle - b.angle;
        });
}

function buildNearbyLoopToolbarHtml(){
    if(searchGuideMode !== 'nearby-loop'){
        return '';
    }

    return (
        '<div class="search-toolbar search-toolbar-nearby-loop">' +
            '<div class="search-mode-switch">' +
                '<button class="search-mode-chip ' + (nearbyLoopMode === 'walking' ? 'active' : '') + '" data-nearby-mode="walking" type="button">🚶 步行</button>' +
                '<button class="search-mode-chip ' + (nearbyLoopMode === 'riding' ? 'active' : '') + '" data-nearby-mode="riding" type="button">🚴 骑行</button>' +
                '<button class="search-mode-chip ' + (nearbyLoopMode === 'driving' ? 'active' : '') + '" data-nearby-mode="driving" type="button">🚗 驾车</button>' +
                '<button class="search-refresh-btn search-refresh-btn-small" id="nearby-loop-refresh-btn" type="button">刷新</button>' +
            '</div>' +
        '</div>'
    );
}

function buildTravelRouteTabsHtml(){
    if(searchGuideMode !== 'travel-routes'){
        return '';
    }

    return (
        '<div class="search-toolbar">' +
            '<div class="search-mode-switch">' +
                '<button class="search-mode-chip ' + (travelRouteDays === 1 ? 'active' : '') + '" data-travel-days="1" type="button">一日游</button>' +
                '<button class="search-mode-chip ' + (travelRouteDays === 2 ? 'active' : '') + '" data-travel-days="2" type="button">两日游</button>' +
                '<button class="search-mode-chip ' + (travelRouteDays === 3 ? 'active' : '') + '" data-travel-days="3" type="button">多日游</button>' +
            '</div>' +
        '</div>'
    );
}

function renderSearchPanel(){
    var panel = ensureSearchPanel();
    if(!panel){
        return;
    }

    var shouldRefocusInput = document.activeElement && document.activeElement.id === 'search-input';
    var bodyHtml = '';

    if(searchPanelMode === 'guide' && !String(searchKeyword || '').trim()){
        bodyHtml = buildGuideActionsHtml();
    }else if(searchLoading){
        bodyHtml = '<div class="search-empty">正在加载结果…</div>';
    }else if(searchErrorText){
        bodyHtml =
            buildNearbyLoopToolbarHtml() +
            buildTravelRouteTabsHtml() +
            '<div class="search-result-section-title">' + escapeHtml(searchResultTitle || '结果') + '</div>' +
            '<div class="search-empty">' + escapeHtml(searchErrorText) + '</div>';
    }else if(searchResults.length === 0){
        bodyHtml =
            buildNearbyLoopToolbarHtml() +
            buildTravelRouteTabsHtml() +
            '<div class="search-result-section-title">' + escapeHtml(searchResultTitle || '结果') + '</div>' +
            '<div class="search-empty">暂时没有结果，你可以换个关键词，或者试试“附近看点”。</div>';
    }else{
        bodyHtml =
            buildNearbyLoopToolbarHtml() +
            buildTravelRouteTabsHtml() +
            '<div class="search-result-section-title">' + escapeHtml(searchResultTitle || '结果') + '</div>' +
            searchResults.map(function(item, index){
                if(item.cardType === 'route'){
                    return buildRouteResultCardHtml(item, index);
                }
                return buildPlaceResultCardHtml(item, index);
            }).join('');
    }

    var activeEl = document.activeElement;
var shouldRestoreSearchFocus = activeEl && activeEl.id === 'search-input';
var searchSelectionStart = null;
var searchSelectionEnd = null;

if(shouldRestoreSearchFocus){
    searchSelectionStart = activeEl.selectionStart;
    searchSelectionEnd = activeEl.selectionEnd;
}

panel.innerHTML =
    '<div class="search-panel-header">' +
        '<div class="search-panel-topline">' +
            '<button id="location-entry-btn" class="location-entry-btn" type="button">' +
                '<span class="location-entry-icon">📍</span>' +
                '<span class="location-entry-text">' + escapeHtml(locationContext.cityName || getLocationDisplayText()) + '</span>' +
            '</button>' +
            '<div class="search-panel-title">搜索地点</div>' +
        '</div>' +
        '<div class="search-box search-box-full">' +
            '<input id="search-input" class="search-input" type="text" placeholder="搜索景点、商圈、酒店、地标" value="' + escapeHtml(searchKeyword) + '">' +
            '<button id="search-btn" class="search-btn" type="button">搜索</button>' +
        '</div>' +
    '</div>' +
    bodyHtml;

    var searchInput = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var locationEntryBtn = document.getElementById('location-entry-btn');
if(locationEntryBtn){
    locationEntryBtn.onclick = function(){
        openLocationPicker();
    };
}

    if(searchInput && shouldRestoreSearchFocus){
    searchInput.focus();

    if(
        typeof searchSelectionStart === 'number' &&
        typeof searchSelectionEnd === 'number'
    ){
        try{
            searchInput.setSelectionRange(searchSelectionStart, searchSelectionEnd);
        }catch(error){}
    }
}

    if(searchBtn){
        searchBtn.onclick = function(){
            runPlaceSearch(searchInput ? searchInput.value : '');
        };
    }

if(searchInput){
    searchInput.oncompositionstart = function(){
        isSearchComposing = true;
    };

    searchInput.oncompositionend = function(){
        isSearchComposing = false;
        searchKeyword = this.value;

        if(!String(this.value || '').trim()){
            resetSearchToGuideMode();
            return;
        }

        scheduleAutoPlaceSearch(this.value);
    };

    searchInput.oninput = function(){
        lastSearchInputAt = Date.now();
        searchKeyword = this.value;

        if(isSearchComposing){
            return;
        }

        if(!String(this.value || '').trim()){
            resetSearchToGuideMode();
            return;
        }

        scheduleAutoPlaceSearch(this.value);
    };

    searchInput.onkeydown = function(event){
        if(event.key === 'Enter'){
            runPlaceSearch(searchInput.value);
        }
    };
}

    panel.querySelectorAll('[data-guide-action]').forEach(function(btn){
        btn.onclick = function(){
            handleSearchGuideAction(btn.dataset.guideAction);
        };
    });

    panel.querySelectorAll('[data-nearby-mode]').forEach(function(btn){
        btn.onclick = function(){
            nearbyLoopMode = btn.dataset.nearbyMode;
            runNearbyLoopGuideSearch();
        };
    });

    panel.querySelectorAll('[data-nearby-duration]').forEach(function(btn){
    btn.onclick = function(){
        nearbyLoopDurationMinutes = Number(btn.dataset.nearbyDuration) || 30;
        runNearbyLoopGuideSearch();
    };
});

    var nearbyLoopRefreshBtn = document.getElementById('nearby-loop-refresh-btn');
    if(nearbyLoopRefreshBtn){
        nearbyLoopRefreshBtn.onclick = function(){
            runNearbyLoopGuideSearch();
        };
    }

    panel.querySelectorAll('[data-travel-days]').forEach(function(btn){
        btn.onclick = function(){
            travelRouteDays = Number(btn.dataset.travelDays) || 1;
            runTravelRoutesGuideSearch();
        };
    });

    panel.querySelectorAll('[data-action="locate"]').forEach(function(btn){
        btn.onclick = function(){
            focusSearchResult(Number(btn.dataset.index));
        };
    });

    panel.querySelectorAll('[data-action="preview-route"]').forEach(function(btn){
        btn.onclick = function(){
            focusSearchResult(Number(btn.dataset.index));
        };
    });

    panel.querySelectorAll('[data-action="add"]').forEach(function(btn){
        btn.onclick = function(){
            addSearchResultToRoute(Number(btn.dataset.index));
        };
    });

    panel.querySelectorAll('[data-action="undo-add"]').forEach(function(btn){
    btn.onclick = function(){
        var item = searchResults[Number(btn.dataset.index)];
        if(item){
            removeAddedSearchRouteBatch(item);
        }
    };
});

    if(searchInput && shouldRefocusInput){
        searchInput.focus();
        var end = searchInput.value.length;
        searchInput.setSelectionRange(end, end);
    }
}

function buildRouteTimelineData(route){
    if(!route || !Array.isArray(route.spots) || route.spots.length === 0){
        return { state: 'empty' };
    }

    if(route.spots.length < 2){
        return { state: 'too-short' };
    }

    for(var i = 0; i < route.spots.length - 1; i++){
        var segmentMinutes = getTimelineSegmentDurationMinutes(route, i);

        if(segmentMinutes === 'impossible'){
            return { state: 'impossible' };
        }

        if(segmentMinutes === null){
            return { state: 'loading' };
        }
    }

    var hasStartTime = !!route.startTime;
    var startMinutes = hasStartTime ? parseClockToMinutes(route.startTime) : null;
    var cursorMinutes = startMinutes;
    var items = [];
    var weakConflictCount = 0;
    var strongConflictCount = 0;
    var endMinutes = null;

    route.spots.forEach(function(spot, index){
        var stayMinutes = getEffectiveSpotStayMinutes(spot);
        var userArrivalMinutes = parseClockToMinutes(spot.arrivalTime);
        var hasUserArrival = userArrivalMinutes !== null;
        var estimatedArrivalMinutes = cursorMinutes;

        var conflictMeta = {
            level: 'none',
            text: ''
        };

        if(hasStartTime && hasUserArrival && estimatedArrivalMinutes !== null){
            conflictMeta = getTimelineConflictMeta(estimatedArrivalMinutes, userArrivalMinutes);

            if(conflictMeta.level === 'weak'){
                weakConflictCount += 1;
            }else if(conflictMeta.level === 'strong'){
                strongConflictCount += 1;
            }
        }

        items.push({
            type: 'spot',
            width: getTimelineSpotWidth(stayMinutes),
            name: getSpotDisplayName(spot),
            fullName: spot.customName ? String(spot.customName) : String(spot.name || ''),
            stayMinutes: stayMinutes,
            stayText: getTimelineSpotStayText(spot),
            estimatedArrivalMinutes: estimatedArrivalMinutes,
            hasUserArrival: hasUserArrival,
            userArrivalMinutes: userArrivalMinutes,
            conflictLevel: conflictMeta.level,
            conflictText: conflictMeta.text,
            hasAbsoluteTime: hasStartTime
        });

        if(hasStartTime && estimatedArrivalMinutes !== null){
            endMinutes = estimatedArrivalMinutes + stayMinutes;
        }

        if(index < route.spots.length - 1){
            var segmentDurationMinutes = getTimelineSegmentDurationMinutes(route, index);
            var segmentMode = route.segmentModes[index] || 'walking';

            items.push({
                type: 'segment',
                width: getTimelineSegmentWidth(segmentDurationMinutes),
                mode: segmentMode,
                durationMinutes: segmentDurationMinutes,
                hasAbsoluteTime: hasStartTime
            });

            if(hasStartTime && estimatedArrivalMinutes !== null){
                cursorMinutes = estimatedArrivalMinutes + stayMinutes + segmentDurationMinutes;
            }
        }
    });
var travelMinutes = getTimelineTravelMinutes(route);
var visitMinutes = getTimelineVisitMinutes(route);
var totalMinutes = travelMinutes + visitMinutes;
return {
    state: 'ready',
    mode: hasStartTime ? 'full' : 'simple',
    items: items,
    spotCount: route.spots.length,
    startMinutes: startMinutes,
    endMinutes: endMinutes,
    travelMinutes: travelMinutes,
    visitMinutes: visitMinutes,
    totalMinutes: totalMinutes,
    weakConflictCount: weakConflictCount,
    strongConflictCount: strongConflictCount
};
}

function renderRouteTimeline(){
    var panel = ensureTimelinePanel();
    if(!panel){
        return;
    }

    var timelineData = buildRouteTimelineData(currentRoute);

    var summaryChipsHtml = getTimelineSummaryChips(timelineData);
    var toggleText = isTimelineExpanded ? '收起时间轴' : '展开时间轴';

    var summaryHint = '';
    if(timelineData.state === 'ready'){
        if(timelineData.mode === 'simple'){
            summaryHint = '未设置行程开始时间，当前默认显示缩略摘要。展开后可看完整版时间轴。';
        }else{
            summaryHint = '默认先显示轻量摘要，展开后查看完整时间轴。';
        }
    }

    var expandedHtml = '';

    if(isTimelineExpanded){
        if(timelineData.state === 'loading'){
            expandedHtml =
                '<div class="route-timeline-expanded">' +
                    '<div class="route-timeline-hint">正在等待路线时间查询完成…</div>' +
                '</div>';
        }else if(timelineData.state === 'impossible'){
            expandedHtml =
                '<div class="route-timeline-expanded">' +
                    '<div class="route-timeline-hint">当前路线里存在“暂无可用路线”的路段，暂时无法生成时间轴。</div>' +
                '</div>';
        }else if(timelineData.state === 'ready'){
            var spotOrder = 0;

            var itemsHtml = timelineData.items.map(function(item){
                if(item.type === 'spot'){
                    spotOrder += 1;

                    var topHtml = '';

                    if(item.hasAbsoluteTime && item.estimatedArrivalMinutes !== null){
                        var tagHtml = '';

                        if(item.hasUserArrival){
                            tagHtml +=
                                '<span class="timeline-time-tag timeline-time-tag-user">' +
                                    '设 ' + formatMinutesToClock(item.userArrivalMinutes) +
                                '</span>';
                        }

                        if(item.conflictLevel === 'weak'){
                            tagHtml +=
                                '<span class="timeline-time-tag timeline-time-tag-weak">' +
                                    item.conflictText +
                                '</span>';
                        }else if(item.conflictLevel === 'strong'){
                            tagHtml +=
                                '<span class="timeline-time-tag timeline-time-tag-strong">' +
                                    item.conflictText +
                                '</span>';
                        }

                        topHtml =
                            '<div class="timeline-top">' +
                                '<span class="timeline-time-main">' + formatMinutesToClock(item.estimatedArrivalMinutes) + '</span>' +
                                tagHtml +
                            '</div>';
                    }else{
                        topHtml =
                            '<div class="timeline-top timeline-top-simple">' +
                                '<span class="timeline-order-tag">第' + spotOrder + '站</span>' +
                            '</div>';
                    }

                    var blockClass = 'timeline-block timeline-block-spot';

                    if(item.hasUserArrival){
                        blockClass += ' timeline-block-user';
                    }

                    if(item.conflictLevel === 'weak'){
                        blockClass += ' timeline-block-weak';
                    }else if(item.conflictLevel === 'strong'){
                        blockClass += ' timeline-block-strong';
                    }

                    return (
                        '<div class="timeline-item timeline-item-spot" style="width:' + item.width + 'px">' +
                            topHtml +
                            '<div class="' + blockClass + '"></div>' +
                            '<div class="timeline-bottom" title="' + escapeHtml(item.fullName) + '">' +
                                '<div class="timeline-name">' + escapeHtml(item.name) + '</div>' +
                                '<div class="timeline-sub">' + item.stayText + '</div>' +
                            '</div>' +
                        '</div>'
                    );
                }

                var segmentTopHtml = item.hasAbsoluteTime
                    ? '<div class="timeline-top timeline-top-empty"></div>'
                    : '<div class="timeline-top timeline-top-simple timeline-top-empty"></div>';

                return (
                    '<div class="timeline-item timeline-item-segment" style="width:' + item.width + 'px">' +
                        segmentTopHtml +
                        '<div class="timeline-block timeline-block-segment"></div>' +
                        '<div class="timeline-bottom">' +
                            '<div class="timeline-sub timeline-segment-sub">' +
                                '<span class="timeline-mode-icon">' + getTimelineModeIcon(item.mode) + '</span>' +
                                '<span>' + formatSegmentDuration(item.durationMinutes * 60) + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
            }).join('');

            expandedHtml =
                '<div class="route-timeline-expanded">' +
                    '<div class="route-timeline-header">' +
                        '<div class="route-timeline-title">完整时间轴</div>' +
                        '<div class="route-timeline-legend">' +
                            '<span class="timeline-legend-item"><span class="timeline-legend-dot timeline-legend-dot-estimated"></span>系统预计</span>' +
                            '<span class="timeline-legend-item"><span class="timeline-legend-dot timeline-legend-dot-user"></span>用户设定</span>' +
                            '<span class="timeline-legend-item"><span class="timeline-legend-dot timeline-legend-dot-segment"></span>路途中</span>' +
                            '<span class="timeline-legend-item"><span class="timeline-legend-dot timeline-legend-dot-weak"></span>弱提醒</span>' +
                            '<span class="timeline-legend-item"><span class="timeline-legend-dot timeline-legend-dot-strong"></span>强冲突</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="route-timeline-scroll">' +
                        '<div class="route-timeline-track">' +
                            itemsHtml +
                        '</div>' +
                    '</div>' +
                '</div>';
        }
    }

    panel.innerHTML =
        '<div class="route-timeline-card route-timeline-card-mini">' +
            '<div class="route-timeline-mini-header">' +
                '<div class="route-timeline-mini-main">' +
                    '<div class="route-timeline-mini-title">时间轴</div>' +
                    '<div class="route-timeline-mini-chips">' +
                        summaryChipsHtml +
                    '</div>' +
                '</div>' +
                '<button id="timeline-toggle-btn" class="route-timeline-toggle" type="button">' + toggleText + '</button>' +
            '</div>' +
            (!isTimelineExpanded && summaryHint
    ? '<div class="route-timeline-caption">' + summaryHint + '</div>'
    : '') +
            expandedHtml +
        '</div>';

    var toggleBtn = document.getElementById('timeline-toggle-btn');
    if(toggleBtn){
        toggleBtn.onclick = function(){
            isTimelineExpanded = !isTimelineExpanded;
            renderRouteTimeline();

            setTimeout(function(){
                if(typeof map.resize === 'function'){
                    map.resize();
                }
            }, 0);
        };
    }
}

function saveSpotSettings(routeKey, index, formData){
    var route = routes[routeKey];
    var spot = route && route.spots[index];

    if(!spot){
        closeSpotSettings();
        return;
    }

    var nameValue = (formData.name || '').trim();
    var arrivalValue = (formData.arrivalTime || '').trim();
    var stayHoursValue = (formData.stayHours || '').trim();
    var stayMinutesValue = (formData.stayMinutes || '').trim();

    if(nameValue){
        spot.customName = nameValue;
    }else{
        delete spot.customName;
    }

    if(arrivalValue){
        spot.arrivalTime = arrivalValue;
    }else{
        delete spot.arrivalTime;
    }

    var parsedHours = stayHoursValue === '' ? 0 : Number(stayHoursValue);
    var parsedMinutes = stayMinutesValue === '' ? 0 : Number(stayMinutesValue);

    if(
        !isFinite(parsedHours) || parsedHours < 0 || parsedHours !== Math.floor(parsedHours) ||
        !isFinite(parsedMinutes) || parsedMinutes < 0 || parsedMinutes > 59 || parsedMinutes !== Math.floor(parsedMinutes)
    ){
        alert('停留时间请输入正确的小时和分钟');
        return;
    }

    var totalStayMinutes = parsedHours * 60 + parsedMinutes;

    if(totalStayMinutes > 0){
        spot.stayMinutes = totalStayMinutes;
    }else{
        delete spot.stayMinutes;
    }

    closeSpotSettings();
}

function renderRoute(){
    currentRoute = routes[currentRouteKey];
    spots = currentRoute.spots;
saveRouteState();
    ensureTimelinePanel();
ensureSearchPanel();
renderTabs();
renderSearchPanel();
    clearPendingAddMarker();

    var pageTitleEl = document.getElementById('page-title');
if(pageTitleEl){
    pageTitleEl.textContent = currentRoute.title + ' Demo';
}
    var sidebarTitle = document.getElementById('sidebar-title');
sidebarTitle.innerHTML =
    '<div class="sidebar-title-row">' +
        '<span class="sidebar-title-text">我的行程</span>' +
        '<button id="route-start-time-btn" class="route-start-time-btn" type="button">' +
            getRouteStartTimeText(currentRoute) +
        '</button>' +
    '</div>';

    var routeStartTimeBtn = document.getElementById('route-start-time-btn');
if(routeStartTimeBtn){
    routeStartTimeBtn.onclick = function(event){
        event.stopPropagation();
        openRouteStartTimeSettings();
    };
}

    var routeList = document.getElementById('route-list');
    routeList.innerHTML = '';

    currentMarkers.forEach(function(marker){
        map.remove(marker);
    });
    currentMarkers = [];


  spots.forEach(function(spot, index){
    var li = document.createElement('li');
li.draggable = false;
li.dataset.index = index;

var circleText = getSpotCircleText(index);
var showLockButton = canShowLockButton(index);
var isLocked = !!spot.isLocked;

if(isLocked){
    li.classList.add('locked-spot');
}

   var modesRowHtml = '';
var segmentInfoHtml = '';

if(index < spots.length - 1){
    var currentMode = currentRoute.segmentModes[index];
    var segmentInfoText = getSegmentInfoText(currentRoute, index);

modesRowHtml =
    '<div class="route-modes-row">' +
        '<button class="mode-btn ' + (currentMode === 'walking' ? 'active-mode' : '') + '" data-mode="walking">步行</button>' +
        '<button class="mode-btn ' + (currentMode === 'driving' ? 'active-mode' : '') + '" data-mode="driving">驾车</button>' +
        '<button class="mode-btn ' + (currentMode === 'riding' ? 'active-mode' : '') + '" data-mode="riding">骑行</button>' +
        '<button class="mode-btn disabled-mode" data-mode="transit">公交</button>' +
    '</div>';

    segmentInfoHtml =
        '<div class="segment-info-row">' +
            (segmentInfoText || '路线查询中...') +
        '</div>';
}else{
    modesRowHtml = '';
    segmentInfoHtml = '';
}

var displayName = getSpotDisplayName(spot);

var isEditingThisSpot =
    editingSpotRouteKey === currentRouteKey &&
    editingSpotIndex === index;

var editInputValue = spot.customName ? spot.customName : getDisplaySpotName(spot.name);
var routeNameHtml = isEditingThisSpot
    ? '<input class="route-name-input route-name-input-short" type="text" value="' + editInputValue.replace(/"/g, '&quot;') + '" placeholder="请输入地点名">'
    : '<span class="route-name" title="' + spot.name + '">' + displayName + '</span>';

var spotTimeMetaRows = [];

if(spot.arrivalTime){
    spotTimeMetaRows.push('<div class="spot-time-meta-row">到达 ' + spot.arrivalTime + '</div>');
}

if(typeof spot.stayMinutes === 'number' && isFinite(spot.stayMinutes) && spot.stayMinutes > 0){
    spotTimeMetaRows.push('<div class="spot-time-meta-row">停留 ' + formatStayMinutesText(spot.stayMinutes) + '</div>');
}

var spotTimeMetaHtml = spotTimeMetaRows.length
    ? '<div class="spot-time-meta">' + spotTimeMetaRows.join('') + '</div>'
    : '';

li.innerHTML =
    '<div class="route-left">' +
        '<div class="route-left-stack">' +
            '<span class="route-circle">' + circleText + '</span>' +
            (showLockButton
                ? '<button class="lock-btn ' + (isLocked ? 'lock-btn-active' : '') + '" title="' + (isLocked ? '取消固定' : '固定当前位置') + '">🔒</button>'
                : ''
            ) +
        '</div>' +
    '</div>' +
    '<div class="route-right">' +
        '<div class="route-top">' +
            routeNameHtml +
            '<div class="spot-actions">' +
                '<button class="action-btn settings-btn" title="景点设置">⚙</button>' +
                '<button class="action-btn drag-handle ' + (isLocked ? 'drag-disabled' : '') + '" title="' + (isLocked ? '已固定，不能拖动' : '拖动排序') + '">≡</button>' +
                '<button class="action-btn delete-btn" title="删除">×</button>' +
            '</div>' +
        '</div>' +
        spotTimeMetaHtml +
        modesRowHtml +
        segmentInfoHtml +
    '</div>';

    li.onclick = function(){
        var allItems = document.querySelectorAll('#route-list li');
        allItems.forEach(function(item){
            item.classList.remove('active-route');
        });

        li.classList.add('active-route');

        map.setCenter(spot.position);
        map.setZoom(14);
    };

    li.addEventListener('dragstart', function(event){
    if(dragEnabledIndex !== index){
        event.preventDefault();
        return;
    }

    draggedIndex = index;
    li.classList.add('dragging');

    if(event.dataTransfer){
        event.dataTransfer.effectAllowed = 'move';
    }
});

    li.addEventListener('dragend', function(){
    li.classList.remove('dragging');
    dragEnabledIndex = null;
    li.draggable = false;

    var allItems = document.querySelectorAll('#route-list li');
    allItems.forEach(function(item){
        item.classList.remove('drag-over');
    });

    if(
    draggedIndex !== null &&
    dragTargetIndex !== null &&
    canDropToIndex(currentRoute, draggedIndex, dragTargetIndex)
){
    reorderSpot(currentRouteKey, draggedIndex, dragTargetIndex);
    draggedIndex = null;
    dragTargetIndex = null;
    renderRoute();
}else{
    draggedIndex = null;
    dragTargetIndex = null;
}
});

li.addEventListener('dragover', function(event){
    if(draggedIndex === null){
        return;
    }

    var canDropHere = canDropToIndex(currentRoute, draggedIndex, index);

    if(!canDropHere){
        dragTargetIndex = null;
        return;
    }

    event.preventDefault();
    dragTargetIndex = index;

    var allItems = document.querySelectorAll('#route-list li');
    allItems.forEach(function(item){
        item.classList.remove('drag-over');
    });

    if(index !== draggedIndex){
        li.classList.add('drag-over');
    }
});

    li.addEventListener('dragleave', function(){
        li.classList.remove('drag-over');
    });

li.addEventListener('drop', function(event){
    if(draggedIndex === null){
        return;
    }

    if(!canDropToIndex(currentRoute, draggedIndex, index)){
        dragTargetIndex = null;
        return;
    }

    event.preventDefault();
    dragTargetIndex = index;
});

    routeList.appendChild(li);
var lockBtn = li.querySelector('.lock-btn');

if(lockBtn){
    lockBtn.onclick = function(event){
        event.stopPropagation();
        spot.isLocked = !spot.isLocked;
        renderRoute();
    };
}

    var modeButtons = li.querySelectorAll('.mode-btn');
    modeButtons.forEach(function(btn){
    btn.onclick = function(event){
        event.stopPropagation();

        if(btn.classList.contains('disabled-mode')){
            return;
        }

        var selectedMode = btn.dataset.mode;
        currentRoute.segmentModes[index] = selectedMode;
        setSegmentInfo(currentRouteKey, index, null);
        renderRoute();
    };
});

var settingsBtn = li.querySelector('.settings-btn');
var dragHandle = li.querySelector('.drag-handle');
var deleteBtn = li.querySelector('.delete-btn');
var routeNameInput = li.querySelector('.route-name-input');

if(settingsBtn){
    settingsBtn.onclick = function(event){
        event.stopPropagation();
        openSpotSettings(currentRouteKey, index);
    };
}

if(routeNameInput){
    setTimeout(function(){
        routeNameInput.focus();
        routeNameInput.select();
    }, 0);

    routeNameInput.onclick = function(event){
        event.stopPropagation();
    };

    routeNameInput.addEventListener('mousedown', function(event){
        event.stopPropagation();
    });

    routeNameInput.addEventListener('keydown', function(event){
        event.stopPropagation();

        if(event.key === 'Enter'){
            saveSpotNameEdit(currentRouteKey, index, routeNameInput.value);
            return;
        }

        if(event.key === 'Escape'){
            cancelSpotNameEdit();
        }
    });

    routeNameInput.addEventListener('blur', function(){
        saveSpotNameEdit(currentRouteKey, index, routeNameInput.value);
    });
}

dragHandle.addEventListener('mousedown', function(event){
    event.stopPropagation();

    if(spot.isLocked){
        dragEnabledIndex = null;
        li.draggable = false;
        return;
    }

    dragEnabledIndex = index;
    li.draggable = true;
});

dragHandle.addEventListener('mouseup', function(){
    dragEnabledIndex = null;
    li.draggable = false;
});

dragHandle.addEventListener('mouseleave', function(){
    if(draggedIndex === null){
        dragEnabledIndex = null;
        li.draggable = false;
    }
});

deleteBtn.onclick = function(event){
    event.stopPropagation();
    deleteSpot(currentRouteKey, index);
    renderRoute();
};

});

    spots.forEach(function(spot, index){
    var label = '';
    if(index === 0){
        label = '起点';
    }else if(index === spots.length - 1){
        label = '终点';
    }else{
        label = index + 1;
    }

var marker = new AMap.Marker({
    position: spot.position,
    map: map,
    offset: new AMap.Pixel(-12, -16),
    content:
        '<div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">' +
            '<div style="background:#1677ff;color:white;padding:4px 8px;border-radius:14px;font-size:12px;font-weight:bold;line-height:1;">' + label + '</div>' +
            '<div style="background:rgba(255,255,255,0.95);color:#1e293b;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,0.12);line-height:1.2;">' + getSpotDisplayName(spot) + '</div>' +
        '</div>'
});

    marker.on('click', function(){
        var allItems = document.querySelectorAll('#route-list li');
        allItems.forEach(function(item){
            item.classList.remove('active-route');
        });

        var currentItem = allItems[index];
        if(currentItem){
            currentItem.classList.add('active-route');
        }

        map.setCenter(spot.position);
    });

    currentMarkers.push(marker);
});

    renderToken += 1;
    renderSegmentRoutes(renderToken);
    renderSpotSettingsModal();
    renderRouteTimeline();

    setTimeout(function(){
        if(typeof map.resize === 'function'){
            map.resize();
        }
    }, 0);
}

function renderSpotSettingsModal(){
    var oldModal = document.getElementById('spot-settings-modal');
    if(oldModal){
        oldModal.remove();
    }

    if(settingsSpotRouteKey === null || settingsSpotIndex === null){
        return;
    }

    var route = routes[settingsSpotRouteKey];
    var spot = route && route.spots[settingsSpotIndex];

    if(!spot){
        return;
    }

    var modal = document.createElement('div');
    modal.id = 'spot-settings-modal';
    modal.className = 'spot-settings-mask';

    var nameValue = spot.customName ? String(spot.customName) : getDisplaySpotName(spot.name);
    nameValue = nameValue.replace(/"/g, '&quot;');

    modal.innerHTML =
        '<div class="spot-settings-dialog">' +
            '<div class="spot-settings-header">' +
                '<div class="spot-settings-title">景点设置</div>' +
                '<button class="spot-settings-close">×</button>' +
            '</div>' +
            '<div class="spot-settings-body">' +
                '<label class="spot-settings-label">地点名称</label>' +
                '<input id="spot-settings-name" class="spot-settings-input" type="text" value="' + nameValue + '" placeholder="请输入地点名">' +
                '<label class="spot-settings-label">到达时间</label>' +
                '<input id="spot-settings-arrival" class="spot-settings-input" type="time" value="' + getSpotArrivalTimeValue(spot) + '">' +
                   '<label class="spot-settings-label">停留时间</label>' +
                '<div class="spot-stay-row">' +
                    '<input id="spot-settings-stay-hours" class="spot-settings-input spot-settings-time-part" type="number" min="0" step="1" value="' + getSpotStayHoursValue(spot) + '" placeholder="小时">' +
                    '<span class="spot-stay-sep">小时</span>' +
                    '<input id="spot-settings-stay-minutes" class="spot-settings-input spot-settings-time-part" type="number" min="0" max="59" step="1" value="' + getSpotStayRemainMinutesValue(spot) + '" placeholder="分钟">' +
                    '<span class="spot-stay-sep">分钟</span>' +
                '</div>' +
            '</div>' +
'<div class="spot-settings-footer spot-settings-footer-split">' +
    '<button class="spot-settings-btn spot-settings-clear">清除</button>' +
    '<div class="spot-settings-footer-right">' +
        '<button class="spot-settings-btn spot-settings-cancel">取消</button>' +
        '<button class="spot-settings-btn spot-settings-save">保存</button>' +
    '</div>' +
'</div>' +
        '</div>';

    document.body.appendChild(modal);

    modal.onclick = function(event){
        if(event.target === modal){
            closeSpotSettings();
        }
    };

    modal.querySelector('.spot-settings-close').onclick = function(){
        closeSpotSettings();
    };

    modal.querySelector('.spot-settings-cancel').onclick = function(){
        closeSpotSettings();
    };

    modal.querySelector('.spot-settings-clear').onclick = function(){
    document.getElementById('spot-settings-arrival').value = '';
    document.getElementById('spot-settings-stay-hours').value = '0';
    document.getElementById('spot-settings-stay-minutes').value = '0';

    saveSpotSettings(settingsSpotRouteKey, settingsSpotIndex, {
        name: document.getElementById('spot-settings-name').value,
        arrivalTime: '',
        stayHours: '0',
        stayMinutes: '0'
    });
};

        modal.querySelector('.spot-settings-save').onclick = function(){
        saveSpotSettings(settingsSpotRouteKey, settingsSpotIndex, {
            name: document.getElementById('spot-settings-name').value,
            arrivalTime: document.getElementById('spot-settings-arrival').value,
            stayHours: document.getElementById('spot-settings-stay-hours').value,
            stayMinutes: document.getElementById('spot-settings-stay-minutes').value
        });
    };
}

function renderRouteStartTimeModal(){
    var oldModal = document.getElementById('route-start-time-modal');
    if(oldModal){
        oldModal.remove();
    }

    var route = routes[currentRouteKey];
    if(!route){
        return;
    }

    var mask = document.createElement('div');
    mask.id = 'route-start-time-modal';
    mask.className = 'spot-settings-mask';

    mask.innerHTML =
        '<div class="spot-settings-dialog route-start-time-dialog">' +
            '<div class="spot-settings-header">' +
                '<div class="spot-settings-title">行程开始时间</div>' +
                '<button class="spot-settings-close" type="button">×</button>' +
            '</div>' +
            '<div class="spot-settings-body">' +
    '<label class="spot-settings-label">行程日期</label>' +
    '<input id="route-start-date-input" class="spot-settings-input" type="date" value="' + (route.startDate || '') + '">' +
    '<label class="spot-settings-label">开始时间</label>' +
    '<input id="route-start-time-input" class="spot-settings-input" type="time" value="' + getRouteStartTimeValue(route) + '">' +
    '<div class="route-start-time-tip">这是整条路线的时间基准，后面可以用于推算每站时间。</div>' +
'</div>' +

            '<div class="spot-settings-footer spot-settings-footer-split">' +
    '<button class="spot-settings-btn spot-settings-clear" type="button">清除</button>' +
    '<div class="spot-settings-footer-right">' +
        '<button class="spot-settings-btn spot-settings-cancel" type="button">取消</button>' +
        '<button class="spot-settings-btn spot-settings-save" type="button">保存</button>' +
    '</div>' +
'</div>' +
        '</div>';

    document.body.appendChild(mask);

    function closeModal(){
        mask.remove();
    }

    mask.addEventListener('click', function(event){
        if(event.target === mask){
            closeModal();
        }
    });

    mask.querySelector('.spot-settings-close').onclick = function(){
        closeModal();
    };

    mask.querySelector('.spot-settings-cancel').onclick = function(){
        closeModal();
    };

    mask.querySelector('.spot-settings-clear').onclick = function(){
    document.getElementById('route-start-date-input').value = '';
    document.getElementById('route-start-time-input').value = '';
    saveRouteStartTime(currentRouteKey, '', '');
    closeModal();
};

    mask.querySelector('.spot-settings-save').onclick = function(){
    saveRouteStartTime(
        currentRouteKey,
        document.getElementById('route-start-date-input').value,
        document.getElementById('route-start-time-input').value
    );
    closeModal();
};

}

function renderRouteSegmentInfosOnly(){
    var routeList = document.getElementById('route-list');
    if(!routeList || !currentRoute){
        renderRouteTimeline();
        return;
    }

    var items = routeList.querySelectorAll('li');

    items.forEach(function(li, index){
        var infoBox = li.querySelector('.segment-info-row');
        if(!infoBox){
            return;
        }

        var text = getSegmentInfoText(currentRoute, index);
        infoBox.textContent = text || '路线查询中...';
    });

    renderRouteTimeline();
}

renderRoute();

document.getElementById('plan-route-btn').onclick = function(){
    planCurrentRoute();
};

document.getElementById('fit-view-btn').onclick = function(){
    var fitTargets = currentMarkers.concat(segmentOverlays);
    if(fitTargets.length > 0){
        map.setFitView(fitTargets, false, [60, 60, 60, 60]);
    }
};

document.getElementById('edit-routes-btn').onclick = function(){
    isEditingRoutes = !isEditingRoutes;

    if(isEditingRoutes){
        this.textContent = '完成';
    }else{
        this.textContent = '编辑';
    }

    renderRoute();
};

function deleteSpot(routeKey, index){
    var route = routes[routeKey];

    if(!route || !Array.isArray(route.spots)){
        return;
    }

    if(index < 0 || index >= route.spots.length){
        return;
    }

    // ✅ 删除点
    route.spots.splice(index, 1);

    // ✅ 修正 segmentModes（关键）
    if(Array.isArray(route.segmentModes)){
        var expectedLength = Math.max(0, route.spots.length - 1);
        route.segmentModes = route.segmentModes.slice(0, expectedLength);
    }

    // ✅ 清掉路线绘制（避免残影）
    if(typeof clearSegmentOverlays === 'function'){
        clearSegmentOverlays();
    }
}
