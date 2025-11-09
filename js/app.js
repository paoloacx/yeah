// Sistema de notificaciones Toast
function showToast(message, type = 'normal') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    // Auto-eliminar
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

const CardStack = {
    currentIndex: 0,
    cards: [],
    startX: 0,
    currentX: 0,
    isDragging: false,
    hasMoved: false, // NUEVO: Para diferenciar tap de swipe
    dragThreshold: 80,

    init() {
        this.cards = Array.from(document.querySelectorAll('.card'));
        this.totalCards = this.cards.length;
        this.updatePositions();
        this.initListeners();
        setTimeout(() => this.loadCardContent(0), 100);
    },

    initListeners() {
        const stack = document.getElementById('cardStack');
        
        // Usar passive: false para poder prevenir scroll si es necesario
        stack.addEventListener('touchstart', e => this.dragStart(e.touches[0]), { passive: true });
        stack.addEventListener('touchmove', e => this.dragMove(e.touches[0]), { passive: false });
        stack.addEventListener('touchend', () => this.dragEnd());
        
        stack.addEventListener('mousedown', e => this.dragStart(e));
        stack.addEventListener('mousemove', e => this.dragMove(e));
        stack.addEventListener('mouseup', () => this.dragEnd());
        stack.addEventListener('mouseleave', () => this.dragEnd());
    },

    dragStart(e) {
        // Ignorar interacciones en mapas y elementos de formulario
        if (e.target.closest('.leaflet-container') || 
            e.target.closest('button') || 
            e.target.closest('input, textarea')) return;
            
        this.isDragging = true;
        this.hasMoved = false; // Resetear bandera de movimiento
        this.startX = e.clientX;
        this.cards[this.currentIndex].classList.add('dragging');
    },

    dragMove(e) {
        if (!this.isDragging) return;
        
        this.currentX = e.clientX;
        const diff = this.currentX - this.startX;

        // Solo considerar que "se ha movido" si supera un pequeño umbral (evita micro-movimientos al hacer tap)
        if (Math.abs(diff) > 5) this.hasMoved = true;
        
        const resistance = 0.7;
        const translateX = diff * resistance;
        const rotate = diff * 0.04;
        
        const activeCard = this.cards[this.currentIndex];
        activeCard.style.transform = `translateX(${translateX}px) rotate(${rotate}deg)`;
        activeCard.style.opacity = Math.max(0.5, 1 - Math.abs(diff) / 800);
    },

    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        const activeCard = this.cards[this.currentIndex];
        activeCard.classList.remove('dragging');
        activeCard.style.transform = '';
        activeCard.style.opacity = '';
        
        const diff = this.currentX - this.startX;
        
        // SOLO cambiar si hubo movimiento real Y superó el umbral
        if (this.hasMoved && Math.abs(diff) > this.dragThreshold) {
            diff > 0 ? this.prev() : this.next();
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
        this.cards.forEach((card, index) => {
            let position = (index - this.currentIndex + this.totalCards) % this.totalCards;
            if (position > this.totalCards / 2) position -= this.totalCards;
            card.setAttribute('data-position', position);
            card.querySelectorAll('.dot').forEach((dot, i) => 
                dot.classList.toggle('active', i === this.currentIndex));
        });
    },

    loadCardContent(index) {
        const cardType = this.cards[index].dataset.card;
        switch(cardType) {
            case 'map': 
                if (window.mainMap) setTimeout(() => window.mainMap.invalidateSize(), 200);
                else initMainMap();
                break;
            case 'checkin':
                // Si volvemos a la tarjeta de checkin y NO estamos editando, asegurar que está limpia
                if (!window.editingCheckinId) resetCheckinForm();
                if (!window.checkinMap) initCheckinMap();
                break;
            case 'history': loadHistory(); break;
            case 'stats': loadStats(); break;
        }
    }
};

// Variables Globales
let mainMap, checkinMap, currentPos, editingCheckinId = null;
let checkinMarker = null;

document.addEventListener('DOMContentLoaded', () => CardStack.init());

// --- Funciones de Mapa ---
function initMainMap() {
    if (mainMap) return;
    // Intentar obtener posición inicial para centrar el mapa principal
    navigator.geolocation.getCurrentPosition(
        pos => createMainMap(pos.coords.latitude, pos.coords.longitude),
        err => createMainMap(40.4168, -3.7038) // Madrid por defecto
    );
}

function createMainMap(lat, lng) {
    mainMap = Maps.createMap('map', lat, lng, 13);
    Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
}

function initCheckinMap() {
    if (checkinMap) return;
    
    // Inicializar con una vista por defecto, luego el watchPosition lo actualizará
    checkinMap = Maps.createMap('mapPreview', 0, 0, 2);

    // *** NUEVO: Permitir toque en el mapa para reubicar ***
    checkinMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        updateCheckinLocation(lat, lng, '📍 Ubicación manual');
        // Detener el seguimiento automático si el usuario toca manualmente
        if (window.geoWatchId) {
            navigator.geolocation.clearWatch(window.geoWatchId);
            window.geoWatchId = null;
        }
    });

    startLocationWatch();
}

function startLocationWatch() {
    if (window.geoWatchId) navigator.geolocation.clearWatch(window.geoWatchId);
    
    window.geoWatchId = navigator.geolocation.watchPosition(
        pos => {
            // Solo actualizar si NO estamos editando un checkin existente (para no sobrescribir su ubicación original al abrirlo)
            if (!editingCheckinId) {
                updateCheckinLocation(pos.coords.latitude, pos.coords.longitude, 'Ubicación GPS actualizada');
            }
        },
        err => showToast('Buscando señal GPS...', 'error'),
        { enableHighAccuracy: true, maximumAge: 10000 }
    );
}

function updateCheckinLocation(lat, lng, statusMsg) {
    currentPos = { lat, lng };
    
    // Actualizar texto de estado y coordenadas
    document.getElementById('locationStatus').textContent = statusMsg || 'Ubicación fijada';
    document.getElementById('currentLocation').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    // Mover mapa y marcador
    checkinMap.setView([lat, lng], 16);
    if (checkinMarker) checkinMarker.remove();
    checkinMarker = Maps.addMarker(checkinMap, lat, lng);
}

// --- Funciones de Check-in ---
function resetCheckinForm() {
    editingCheckinId = null;
    document.getElementById('cardTitleCheckin').textContent = 'Nuevo Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Guardar Yeah¡';
    document.getElementById('placeNote').value = '';
    startLocationWatch(); // Volver a seguir al usuario
}

document.getElementById('saveCheckin').onclick = () => {
    if (!currentPos) return showToast('Espera, necesitamos ubicación', 'error');

    const checkin = {
        id: editingCheckinId || Date.now(),
        timestamp: editingCheckinId ? Storage.getCheckin(editingCheckinId).timestamp : new Date().toISOString(),
        location: currentPos,
        note: document.getElementById('placeNote').value.trim()
    };

    if (editingCheckinId) {
        Storage.updateCheckin(editingCheckinId, checkin);
        showToast('Yeah¡ actualizado correctamente', 'success');
    } else {
        Storage.saveCheckin(checkin);
        showToast('¡Yeah! Guardado', 'success');
    }

    resetCheckinForm();
    CardStack.currentIndex = 0; // Volver al mapa principal
    CardStack.updatePositions();
    
    // Actualizar mapa principal
    if (mainMap) {
        Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
        mainMap.setView([checkin.location.lat, checkin.location.lng], 15);
    }
    CardStack.loadCardContent(0);
};

// --- Historial y Edición ---
function loadHistory() {
    const list = document.getElementById('checkinsList');
    const checkins = Storage.getAllCheckins().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (checkins.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        list.style.display = 'none';
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    list.style.display = 'block';
    
    list.innerHTML = checkins.map(c => `
        <div class="checkin-item">
            <div style="margin-bottom:0.5rem">
                <strong>${new Date(c.timestamp).toLocaleDateString()}</strong>
                <span style="opacity:0.7"> - ${new Date(c.timestamp).toLocaleTimeString().slice(0,5)}</span>
            </div>
            ${c.note ? `<p style="font-style:italic; color:var(--primary-color); margin-bottom:0.5rem">"${c.note}"</p>` : ''}
            <div style="font-family:monospace; font-size:0.8rem; opacity:0.6">
                ${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}
            </div>
            <div class="checkin-actions">
                <button class="btn-icon" onclick="editCheckin(${c.id})">✏️</button>
                <button class="btn-icon" onclick="deleteCheckin(${c.id})" style="color:var(--danger-color)">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Hacer estas funciones globales para que el HTML onclick las vea
window.editCheckin = function(id) {
    const checkin = Storage.getCheckin(id);
    if (!checkin) return;

    editingCheckinId = id;
    currentPos = checkin.location;

    // Rellenar formulario
    document.getElementById('cardTitleCheckin').textContent = 'Editando Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Actualizar Yeah¡';
    document.getElementById('placeNote').value = checkin.note || '';
    
    // Ir a la tarjeta de checkin (índice 1)
    CardStack.currentIndex = 1;
    CardStack.updatePositions();
    
    // Esperar a que la transición termine un poco antes de cargar el mapa
    setTimeout(() => {
        if (!checkinMap) initCheckinMap();
        // Detener el watch GPS para que no sobrescriba la posición que estamos editando
        if (window.geoWatchId) {
            navigator.geolocation.clearWatch(window.geoWatchId);
            window.geoWatchId = null;
        }
        updateCheckinLocation(currentPos.lat, currentPos.lng, '📍 Ubicación original');
    }, 300);
};

window.deleteCheckin = function(id) {
    if (confirm('¿Seguro que quieres borrar este Yeah?')) {
        Storage.deleteCheckin(id);
        loadHistory();
        showToast('Yeah eliminado', 'normal');
        if (mainMap) Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
    }
};

function loadStats() {
    document.getElementById('statTotal').textContent = Storage.getAllCheckins().length;
    // Stats simples por ahora
}
