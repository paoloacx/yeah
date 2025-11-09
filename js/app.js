// --- Toast Notification System ---
function showToast(msg, type = 'normal') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px) scale(0.9)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Card Stack Engine ---
const CardStack = {
    currentIndex: 0, cards: [],
    startX: 0, currentX: 0, isDragging: false, hasMoved: false,
    init() {
        this.cards = Array.from(document.querySelectorAll('.card'));
        this.totalCards = this.cards.length;
        this.updatePositions();
        this.initListeners();
        setTimeout(() => this.loadCardContent(0), 100);
    },
    initListeners() {
        const s = document.getElementById('cardStack');
        s.addEventListener('touchstart', e => this.dragStart(e.touches[0]), {passive:true});
        s.addEventListener('touchmove', e => this.dragMove(e.touches[0]), {passive:false});
        s.addEventListener('touchend', () => this.dragEnd());
        s.addEventListener('mousedown', e => this.dragStart(e));
        s.addEventListener('mousemove', e => this.dragMove(e));
        s.addEventListener('mouseup', () => this.dragEnd());
    },
    dragStart(e) {
        if (e.target.closest('.leaflet-container, button, input, textarea, select, .checkin-actions, .place-results')) return;
        this.isDragging = true; this.hasMoved = false;
        this.startX = e.clientX;
        this.cards[this.currentIndex].classList.add('dragging');
    },
    dragMove(e) {
        if (!this.isDragging) return;
        this.currentX = e.clientX;
        if (Math.abs(this.currentX - this.startX) > 5) this.hasMoved = true;
        const diff = this.currentX - this.startX;
        this.cards[this.currentIndex].style.transform = `translateX(${diff * 0.7}px) rotate(${diff * 0.03}deg)`;
    },
    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.cards[this.currentIndex].classList.remove('dragging');
        this.cards[this.currentIndex].style.transform = '';
        if (this.hasMoved && Math.abs(this.currentX - this.startX) > 80) {
            (this.currentX - this.startX) > 0 ? this.prev() : this.next();
        }
    },
    next() { this.currentIndex = (this.currentIndex + 1) % this.totalCards; this.updatePositions(); this.loadCardContent(this.currentIndex); },
    prev() { this.currentIndex = (this.currentIndex - 1 + this.totalCards) % this.totalCards; this.updatePositions(); this.loadCardContent(this.currentIndex); },
    updatePositions() {
        this.cards.forEach((c, i) => {
            let pos = (i - this.currentIndex + this.totalCards) % this.totalCards;
            if (pos > this.totalCards/2) pos -= this.totalCards;
            c.setAttribute('data-position', pos);
            c.querySelectorAll('.dot').forEach((d, j) => d.classList.toggle('active', j === this.currentIndex));
        });
    },
    loadCardContent(i) {
        const type = this.cards[i].dataset.card;
        if (type === 'map') window.mainMap ? setTimeout(() => window.mainMap.invalidateSize(), 200) : initMainMap();
        if (type === 'checkin' && !window.editingId) resetCheckinForm();
        if (type === 'history') loadHistory();
        if (type === 'stats') loadStats();
        if (type === 'settings') initSettings();
    }
};

// --- Globals ---
let mainMap, checkinMap, heatMapInstance, currentPos, editingId = null, watchId = null, marker = null;
let selectedPlace = null;

document.addEventListener('DOMContentLoaded', () => CardStack.init());

// --- Maps ---
function initMainMap() {
    if (mainMap) return;
    navigator.geolocation.getCurrentPosition(
        p => createMain(p.coords.latitude, p.coords.longitude),
        () => createMain(40.4168, -3.7038)
    );
}
function createMain(lat, lng) {
    mainMap = Maps.createMap('map', lat, lng, 13);
    Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
}

// --- Check-in & Location ---
function resetCheckinForm() {
    editingId = null; selectedPlace = null;
    document.getElementById('cardTitleCheckin').textContent = 'Nuevo Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Guardar Yeah¡';
    document.getElementById('placeNote').value = '';
    document.getElementById('placeSearch').value = '';
    document.getElementById('placeResults').innerHTML = '';
    document.getElementById('dateTimeSection').style.display = 'none';
    document.getElementById('cancelEdit').style.display = 'none';
    startWatch();
}
function startWatch() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
        p => updateLoc(p.coords.latitude, p.coords.longitude, 'Ubicación GPS activa'),
        e => showToast('Buscando señal GPS...', 'error'), {enableHighAccuracy:true}
    );
}
function updateLoc(lat, lng, msg) {
    currentPos = {lat, lng};
    document.getElementById('locationStatus').textContent = msg;
    document.getElementById('currentLocation').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (!checkinMap) {
        checkinMap = Maps.createMap('mapPreview', lat, lng, 16);
        checkinMap.on('click', e => {
            if (watchId) navigator.geolocation.clearWatch(watchId); watchId = null;
            updateLoc(e.latlng.lat, e.latlng.lng, '📍 Ubicación manual fijada');
        });
    }
    checkinMap.setView([lat, lng], 16);
    if (marker) marker.remove();
    marker = Maps.addMarker(checkinMap, lat, lng);
}

// --- RESTORED: Place Search (Nominatim) ---
document.getElementById('searchBtn').onclick = async () => {
    const q = document.getElementById('placeSearch').value.trim();
    const resultsDiv = document.getElementById('placeResults');
    if (q.length < 3) return showToast('Escribe al menos 3 letras', 'error');
    resultsDiv.innerHTML = '<div style="padding:1rem;opacity:0.6">Buscando...</div>';
    
    try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
        if (currentPos) url += `&viewbox=${currentPos.lng-0.1},${currentPos.lat-0.1},${currentPos.lng+0.1},${currentPos.lat+0.1}`;
        
        const res = await fetch(url); const data = await res.json();
        resultsDiv.innerHTML = data.length ? data.map((p, i) => `
            <div class="place-item" data-idx="${i}">${p.display_name.split(',')[0]}</div>
        `).join('') : '<div style="padding:1rem;opacity:0.6">Sin resultados</div>';
        
        resultsDiv.querySelectorAll('.place-item').forEach(item => {
            item.onclick = () => {
                const p = data[item.dataset.idx];
                selectedPlace = { name: p.display_name.split(',')[0], lat: parseFloat(p.lat), lng: parseFloat(p.lon) };
                document.getElementById('placeSearch').value = selectedPlace.name;
                resultsDiv.innerHTML = '';
                if (watchId) navigator.geolocation.clearWatch(watchId); watchId = null;
                updateLoc(selectedPlace.lat, selectedPlace.lng, '📍 Ubicación de ' + selectedPlace.name);
            };
        });
    } catch (e) { resultsDiv.innerHTML = '<div style="padding:1rem;color:var(--danger-color)">Error al buscar</div>'; }
};

// --- Save & Edit ---
document.getElementById('saveCheckin').onclick = () => {
    if (!currentPos) return showToast('Falta ubicación', 'error');
    
    let timestamp = new Date().toISOString();
    if (editingId) {
        // Si estamos editando, usar los valores de los inputs de fecha/hora
        const dateVal = document.getElementById('editDate').value;
        const timeVal = document.getElementById('editTime').value;
        if (dateVal && timeVal) {
            timestamp = new Date(`${dateVal}T${timeVal}`).toISOString();
        }
    }

    const checkin = {
        id: editingId || Date.now(),
        timestamp: timestamp,
        location: currentPos,
        note: document.getElementById('placeNote').value.trim(),
        place: selectedPlace
    };
    
    editingId ? Storage.updateCheckin(editingId, checkin) : Storage.saveCheckin(checkin);
    showToast(editingId ? '¡Yeah actualizado!' : '¡Yeah guardado! 🎉', 'success');
    resetCheckinForm();
    CardStack.currentIndex = 0; CardStack.updatePositions();
    if (mainMap) { Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins()); mainMap.setView([currentPos.lat, currentPos.lng], 16); }
    CardStack.loadCardContent(0);
};

document.getElementById('cancelEdit').onclick = () => {
    resetCheckinForm();
    CardStack.currentIndex = 2; CardStack.updatePositions(); // Volver al historial
};

window.editCheckin = (id) => {
    const c = Storage.getCheckin(id); if (!c) return;
    editingId = id; currentPos = c.location; selectedPlace = c.place;
    
    document.getElementById('cardTitleCheckin').textContent = 'Editando Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Actualizar Yeah¡';
    document.getElementById('placeNote').value = c.note || '';
    document.getElementById('placeSearch').value = c.place ? c.place.name : '';
    document.getElementById('cancelEdit').style.display = 'block';
    
    // RESTORED: Date/Time Editing
    const dateObj = new Date(c.timestamp);
    document.getElementById('dateTimeSection').style.display = 'flex';
    // Ajustar a hora local para los inputs
    const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString();
    document.getElementById('editDate').value = localIso.slice(0, 10);
    document.getElementById('editTime').value = localIso.slice(11, 16);

    CardStack.currentIndex = 1; CardStack.updatePositions();
    setTimeout(() => {
        if (!checkinMap) checkinMap = Maps.createMap('mapPreview', 0, 0, 16);
        if (watchId) navigator.geolocation.clearWatch(watchId); watchId = null;
        updateLoc(c.location.lat, c.location.lng, 'Editando original');
    }, 300);
};

window.deleteCheckin = (id) => {
    if (confirm('¿Eliminar para siempre?')) {
        Storage.deleteCheckin(id); loadHistory();
        if (mainMap) Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
        showToast('Yeah eliminado');
    }
};

// --- History with RESTORED Filters ---
function loadHistory() {
    let checkins = Storage.getAllCheckins();
    const search = document.getElementById('searchFilter').value.toLowerCase();
    const sort = document.getElementById('sortFilter').value;

    if (search) checkins = checkins.filter(c => (c.note||'').toLowerCase().includes(search) || (c.place?.name||'').toLowerCase().includes(search));
    checkins.sort((a,b) => sort === 'newest' ? new Date(b.timestamp) - new Date(a.timestamp) : new Date(a.timestamp) - new Date(b.timestamp));

    const list = document.getElementById('checkinsList');
    document.getElementById('emptyState').style.display = checkins.length ? 'none' : 'block';
    list.style.display = checkins.length ? 'block' : 'none';
    
    const dF = new Intl.DateTimeFormat('es-ES', {day:'numeric', month:'short', year:'numeric'});
    const tF = new Intl.DateTimeFormat('es-ES', {hour:'2-digit', minute:'2-digit'});

    list.innerHTML = checkins.map(c => `
        <div class="checkin-item">
            <span class="date-time">${dF.format(new Date(c.timestamp))} • ${tF.format(new Date(c.timestamp))}</span>
            ${c.place ? `<strong style="display:block;margin-bottom:0.3rem;color:var(--primary-dark)">📍 ${c.place.name}</strong>` : ''}
            ${c.note ? `<p class="note-text">${c.note}</p>` : ''}
            <span class="location-coords">${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}</span>
            <div class="checkin-actions">
                <button class="btn-icon edit" onclick="editCheckin(${c.id})">✏️</button>
                <button class="btn-icon delete" onclick="deleteCheckin(${c.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}
// Listeners para filtros
document.getElementById('searchFilter').oninput = loadHistory;
document.getElementById('sortFilter').onchange = loadHistory;

// --- Stats ---
function loadStats() {
    const all = Storage.getAllCheckins();
    document.getElementById('statTotal').textContent = all.length;
    document.getElementById('statPlaces').textContent = new Set(all.map(c => `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`)).size;
    document.getElementById('statNotes').textContent = all.filter(c => c.note && c.note.trim()).length;

    const places = {}; all.forEach(c => { const k = c.place ? c.place.name : `${c.location.lat.toFixed(3)}, ${c.location.lng.toFixed(3)}`; places[k] = (places[k]||0)+1; });
    const sorted = Object.entries(places).sort((a,b) => b[1]-a[1]).slice(0,5);
    document.getElementById('topPlaces').innerHTML = sorted.length ? sorted.map(([k,v]) => 
        `<div class="top-item"><span>${k.includes(',')?'📍':'🏢'} ${k}</span><strong>${v}</strong></div>`).join('') : '<p style="opacity:0.6">Sin datos</p>';

    loadChart(all, 'monthlyChart', c => new Date(c.timestamp).toISOString().slice(0,7), k => {
        const [y,m] = k.split('-'); return new Date(y,m-1).toLocaleDateString('es-ES',{month:'short'});
    });
    loadChart(all, 'weekdayChart', c => new Date(c.timestamp).getDay(), k => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][k]);

    if (heatMapInstance) { heatMapInstance.remove(); heatMapInstance = null; }
    if (all.length) {
         heatMapInstance = Maps.createMap('heatMap', 40.4168, -3.7038, 5);
         const points = all.map(c => [c.location.lat, c.location.lng]);
         L.heatLayer(points, {radius: 25, blur: 15, maxZoom: 10}).addTo(heatMapInstance);
         heatMapInstance.fitBounds(points);
    } else {
        document.getElementById('heatMap').innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;opacity:0.5">Sin datos</div>';
    }
}
function loadChart(data, id, kFn, lFn) {
    const counts = {}; data.forEach(d => { const k = kFn(d); counts[k] = (counts[k]||0)+1; });
    const sorted = Object.entries(counts).sort(); const max = Math.max(...Object.values(counts), 1);
    document.getElementById(id).innerHTML = sorted.length ? sorted.map(([k,v]) => `
        <div class="chart-bar"><span style="width:40px;text-align:right">${lFn(k)}</span>
        <div class="bar-container"><div class="bar-fill" style="width:${(v/max)*100}%"></div></div>
        <span style="width:25px">${v}</span></div>`).join('') : '<p style="opacity:0.6">Sin datos</p>';
}

// --- RESTORED: Settings (Import/Export) ---
function initSettings() {
    document.getElementById('exportCSV').onclick = () => Export.toCSV();
    document.getElementById('exportICal').onclick = () => Export.toICal();
    document.getElementById('exportJSON').onclick = () => Export.toJSON();
    document.getElementById('importJSON').onclick = () => document.getElementById('importFile').click();
    document.getElementById('importFile').onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.checkins && Array.isArray(data.checkins)) {
                    if (confirm(`¿Importar ${data.checkins.length} Yeahs? Esto puede sobrescribir existentes.`)) {
                        data.checkins.forEach(c => Storage.saveCheckin(c));
                        showToast('¡Importación completada! 🎉', 'success');
                        if (mainMap) Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
                    }
                } else alert('Formato JSON inválido');
            } catch (ex) { alert('Error al leer el archivo'); }
        };
        reader.readAsText(file);
    };
}
