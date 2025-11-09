// Toast System
function showToast(msg, type = 'normal') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Card Engine
const CardStack = {
    currentIndex: 0,
    cards: [],
    startX: 0, currentX: 0,
    isDragging: false, hasMoved: false,
    dragThreshold: 80,

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
        if (e.target.closest('.leaflet-container, button, input, textarea, .checkin-actions')) return;
        this.isDragging = true; this.hasMoved = false;
        this.startX = e.clientX;
        this.cards[this.currentIndex].classList.add('dragging');
    },

    dragMove(e) {
        if (!this.isDragging) return;
        this.currentX = e.clientX;
        const diff = this.currentX - this.startX;
        if (Math.abs(diff) > 5) this.hasMoved = true;
        
        const active = this.cards[this.currentIndex];
        active.style.transform = `translateX(${diff * 0.7}px) rotate(${diff * 0.03}deg)`;
        active.style.opacity = Math.max(0.5, 1 - Math.abs(diff)/800);
    },

    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.cards[this.currentIndex].classList.remove('dragging');
        this.cards[this.currentIndex].style.transform = '';
        this.cards[this.currentIndex].style.opacity = '';
        
        if (this.hasMoved && Math.abs(this.currentX - this.startX) > this.dragThreshold) {
            (this.currentX - this.startX) > 0 ? this.prev() : this.next();
        }
    },

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.totalCards;
        this.updatePositions();
        this.loadCardContent(this.currentIndex);
    },
    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.totalCards) % this.totalCards;
        this.updatePositions();
        this.loadCardContent(this.currentIndex);
    },
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

// App Logic
let mainMap, checkinMap, currentPos, editingId = null, watchId = null, marker = null;

document.addEventListener('DOMContentLoaded', () => CardStack.init());

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
    startWatch();
}

function startWatch() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
        p => updateLoc(p.coords.latitude, p.coords.longitude, 'Ubicación actualizada'),
        e => showToast('Buscando GPS...', 'error'),
        {enableHighAccuracy:true}
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
            updateLoc(e.latlng.lat, e.latlng.lng, '📍 Ubicación manual');
        });
    }
    checkinMap.setView([lat, lng], 16);
    if (marker) marker.remove();
    marker = Maps.addMarker(checkinMap, lat, lng);
}

document.getElementById('saveCheckin').onclick = () => {
    if (!currentPos) return showToast('Falta ubicación', 'error');
    const checkin = {
        id: editingId || Date.now(),
        timestamp: editingId ? Storage.getCheckin(editingId).timestamp : new Date().toISOString(),
        location: currentPos,
        note: document.getElementById('placeNote').value.trim()
    };
    editingId ? Storage.updateCheckin(editingId, checkin) : Storage.saveCheckin(checkin);
    showToast(editingId ? 'Actualizado' : 'Guardado', 'success');
    resetCheckin();
    CardStack.currentIndex = 0;
    CardStack.updatePositions();
    if (mainMap) {
        Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
        mainMap.setView([checkin.location.lat, checkin.location.lng], 15);
    }
};

window.editCheckin = (id) => {
    const c = Storage.getCheckin(id);
    if (!c) return;
    editingId = id;
    currentPos = c.location;
    document.getElementById('cardTitleCheckin').textContent = 'Editando Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Actualizar';
    document.getElementById('placeNote').value = c.note || '';
    CardStack.currentIndex = 1;
    CardStack.updatePositions();
    setTimeout(() => {
        if (!checkinMap) {
             checkinMap = Maps.createMap('mapPreview', 0, 0, 16);
             checkinMap.on('click', e => updateLoc(e.latlng.lat, e.latlng.lng, '📍 Ubicación manual'));
        }
        if (watchId) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        updateLoc(c.location.lat, c.location.lng, 'Editando ubicación original');
    }, 300);
};

window.deleteCheckin = (id) => {
    if (confirm('¿Borrar?')) {
        Storage.deleteCheckin(id);
        loadHistory();
        if (mainMap) Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
        showToast('Eliminado');
    }
};

function loadHistory() {
    const list = document.getElementById('checkinsList');
    const all = Storage.getAllCheckins().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    document.getElementById('emptyState').style.display = all.length ? 'none' : 'block';
    list.style.display = all.length ? 'block' : 'none';
    list.innerHTML = all.map(c => `
        <div class="checkin-item">
            <div style="display:flex;justify-content:space-between">
                <strong>${new Date(c.timestamp).toLocaleDateString()}</strong>
                <small>${new Date(c.timestamp).toLocaleTimeString().slice(0,5)}</small>
            </div>
            ${c.note ? `<p style="margin:0.5rem 0;font-style:italic">"${c.note}"</p>` : ''}
            <div class="checkin-actions">
                <button class="btn-icon" onclick="editCheckin(${c.id})">✏️</button>
                <button class="btn-icon" onclick="deleteCheckin(${c.id})" style="color:var(--danger-color)">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ESTADÍSTICAS RESTAURADAS
function loadStats() {
    const all = Storage.getAllCheckins();
    // Aseguramos que los elementos existen antes de escribir en ellos
    const elTotal = document.getElementById('statTotal');
    const elPlaces = document.getElementById('statPlaces');
    const elNotes = document.getElementById('statNotes');
    // Placeholder para fotos si lo volvemos a activar
    const elPhotos = document.getElementById('statPhotos'); 

    if (elTotal) elTotal.textContent = all.length;
    if (elPlaces) {
        const unique = new Set(all.map(c => `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`));
        elPlaces.textContent = unique.size;
    }
    if (elNotes) elNotes.textContent = all.filter(c => c.note && c.note.trim().length > 0).length;
    if (elPhotos) elPhotos.textContent = all.filter(c => c.photo).length;
}
