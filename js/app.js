// --- Toast System ---
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
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Card Engine ---
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
        // Evitar arrastrar si tocamos mapa o botones
        if (e.target.closest('.leaflet-container, button, input, textarea, .checkin-item, dialog')) return;
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
        if (type === 'checkin' && !window.editingId) resetCheckin();
        if (type === 'history') loadHistory();
        if (type === 'stats') loadStats();
    }
};

// --- App Globals & Init ---
let mainMap, checkinMap, detailsMap, heatMapInstance, currentPos, editingId = null, watchId = null, marker = null;
document.addEventListener('DOMContentLoaded', () => CardStack.init());

// --- Maps & Location ---
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
function resetCheckin() {
    editingId = null;
    document.getElementById('cardTitleCheckin').textContent = 'Nuevo Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Guardar Yeah¡';
    document.getElementById('placeNote').value = '';
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
            if (watchId) navigator.geolocation.clearWatch(watchId);
            watchId = null;
            updateLoc(e.latlng.lat, e.latlng.lng, '📍 Ubicación manual fijada');
        });
    }
    checkinMap.setView([lat, lng], 16);
    if (marker) marker.remove();
    marker = Maps.addMarker(checkinMap, lat, lng);
}

// --- Actions ---
document.getElementById('saveCheckin').onclick = () => {
    if (!currentPos) return showToast('Falta ubicación', 'error');
    const checkin = {
        id: editingId || Date.now(),
        timestamp: editingId ? Storage.getCheckin(editingId).timestamp : new Date().toISOString(),
        location: currentPos,
        note: document.getElementById('placeNote').value.trim()
    };
    editingId ? Storage.updateCheckin(editingId, checkin) : Storage.saveCheckin(checkin);
    showToast(editingId ? '¡Yeah actualizado!' : '¡Yeah¡ guardado!', 'success');
    resetCheckin();
    CardStack.currentIndex = 0; CardStack.updatePositions();
    if (mainMap) { Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins()); mainMap.setView([checkin.location.lat, checkin.location.lng], 16); }
    CardStack.loadCardContent(0);
};

window.editCheckin = (id) => {
    const c = Storage.getCheckin(id); if (!c) return;
    editingId = id; currentPos = c.location;
    document.getElementById('cardTitleCheckin').textContent = 'Editando Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Actualizar Yeah¡';
    document.getElementById('placeNote').value = c.note || '';
    CardStack.currentIndex = 1; CardStack.updatePositions();
    setTimeout(() => {
        if (!checkinMap) checkinMap = Maps.createMap('mapPreview', 0, 0, 16);
        if (watchId) navigator.geolocation.clearWatch(watchId); watchId = null;
        updateLoc(c.location.lat, c.location.lng, 'Editando ubicación original');
    }, 300);
};

window.deleteCheckin = (id) => {
    if (confirm('¿Eliminar este Yeah para siempre?')) {
        Storage.deleteCheckin(id); loadHistory();
        if (mainMap) Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
        showToast('Yeah eliminado 🗑️');
    }
};

// --- History & Details Modal ---
function loadHistory() {
    const list = document.getElementById('checkinsList');
    const all = Storage.getAllCheckins().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    document.getElementById('emptyState').style.display = all.length ? 'none' : 'block';
    list.style.display = all.length ? 'block' : 'none';
    const dF = new Intl.DateTimeFormat('es-ES', {day:'numeric', month:'short', year:'numeric'});
    const tF = new Intl.DateTimeFormat('es-ES', {hour:'2-digit', minute:'2-digit'});
    
    list.innerHTML = all.map(c => `
        <div class="checkin-item" onclick="showDetails(${c.id})">
            <span class="date-time">${dF.format(new Date(c.timestamp))} • ${tF.format(new Date(c.timestamp))}</span>
            ${c.note ? `<p class="note-text">${c.note}</p>` : '<p class="note-text" style="opacity:0.5">Sin nota</p>'}
        </div>
    `).join('');
}

window.showDetails = (id) => {
    const c = Storage.getCheckin(id); if(!c) return;
    const dF = new Intl.DateTimeFormat('es-ES', {dateStyle:'full', timeStyle:'short'});
    
    document.getElementById('detailsInfo').innerHTML = `
        <p style="font-size:0.9rem; color:#90A4AE; font-weight:600; margin-bottom:0.5rem">${dF.format(new Date(c.timestamp))}</p>
        <p style="font-size:1.2rem; color:#37474F; margin-bottom:1rem">${c.note || '<i style="opacity:0.6">Sin nota</i>'}</p>
        <p style="font-family:monospace; color:#B0BEC5">${c.location.lat.toFixed(6)}, ${c.location.lng.toFixed(6)}</p>
    `;

    document.getElementById('btnEdit').onclick = () => { closeDetails(); editCheckin(id); };
    document.getElementById('btnDelete').onclick = () => { 
        if(confirm('¿Eliminar definitivamente?')) {
            Storage.deleteCheckin(id);
            closeDetails();
            loadHistory();
            if(mainMap) Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
            showToast('Yeah eliminado 🗑️');
        }
    };

    document.getElementById('detailsModal').showModal();
    
    setTimeout(() => {
        if(!detailsMap) detailsMap = Maps.createMap('detailsMap', c.location.lat, c.location.lng, 15);
        else { detailsMap.invalidateSize(); detailsMap.setView([c.location.lat, c.location.lng], 15); }
        
        // Limpiar marcadores anteriores del mapa de detalles si los hubiera
        detailsMap.eachLayer(layer => { if(layer instanceof L.Marker) detailsMap.removeLayer(layer); });
        Maps.addMarker(detailsMap, c.location.lat, c.location.lng);
    }, 100);
};

window.closeDetails = () => document.getElementById('detailsModal').close();

// --- Stats ---
function loadStats() {
    const checkins = Storage.getAllCheckins();
    document.getElementById('statTotal').textContent = checkins.length;
    document.getElementById('statPlaces').textContent = new Set(checkins.map(c => `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`)).size;
    document.getElementById('statNotes').textContent = checkins.filter(c => c.note && c.note.trim()).length;
    
    const places = {}; checkins.forEach(c => { const k = `${c.location.lat.toFixed(3)}, ${c.location.lng.toFixed(3)}`; places[k] = (places[k]||0)+1; });
    const sortedPlaces = Object.entries(places).sort((a,b) => b[1]-a[1]).slice(0,5);
    document.getElementById('topPlaces').innerHTML = sortedPlaces.length ? sortedPlaces.map(([k,v]) => 
        `<div class="top-item"><span>📍 ${k}</span><span class="place-count">${v}</span></div>`).join('') : '<p style="opacity:0.6;text-align:center">Sin datos</p>';

    loadChart(checkins, 'monthlyChart', c => new Date(c.timestamp).toISOString().slice(0,7), (k) => {
        const [y, m] = k.split('-'); return new Date(y, m-1).toLocaleDateString('es-ES',{month:'short'});
    });
    loadChart(checkins, 'weekdayChart', c => new Date(c.timestamp).getDay(), k => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][k]);
    
    if (heatMapInstance) { heatMapInstance.remove(); heatMapInstance = null; }
    if (checkins.length > 0) {
         heatMapInstance = Maps.createMap('heatMap', 40.4168, -3.7038, 5);
         const bounds = [];
         checkins.forEach(c => {
             const lat = c.location.lat, lng = c.location.lng;
             bounds.push([lat, lng]);
             L.circleMarker([lat, lng], { radius: 15, fillColor: '#FF5722', color: false, fillOpacity: 0.3 }).addTo(heatMapInstance);
         });
         heatMapInstance.fitBounds(bounds, {padding:[20,20]});
    } else {
        document.getElementById('heatMap').innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;opacity:0.5">Sin datos de ubicación</div>';
    }
}

function loadChart(data, id, keyFn, labelFn) {
    const counts = {}; data.forEach(d => { const k = keyFn(d); counts[k] = (counts[k]||0)+1; });
    const sorted = Object.entries(counts).sort();
    const max = Math.max(...Object.values(counts), 1);
    document.getElementById(id).innerHTML = sorted.length ? sorted.map(([k,v]) => `
        <div class="chart-bar"><span class="bar-label">${labelFn(k)}</span>
        <div class="bar-container"><div class="bar-fill" style="width:${(v/max)*100}%"></div></div>
        <span class="bar-value">${v}</span></div>`).join('') : '<p style="opacity:0.6;text-align:center">Sin datos</p>';
}
