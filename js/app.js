const CardStack = {
    currentIndex: 0,
    cards: [],
    startX: 0,
    currentX: 0,
    isDragging: false,
    dragThreshold: 120, // Más recorrido necesario para cambiar = más "peso"

    init() {
        this.cards = Array.from(document.querySelectorAll('.card'));
        this.totalCards = this.cards.length;
        
        this.updatePositions();
        this.initListeners();
        
        // Iniciar primera tarjeta
        this.loadCardContent(0);
    },

    initListeners() {
        const stack = document.getElementById('cardStack');
        
        // Touch
        stack.addEventListener('touchstart', e => this.dragStart(e.touches[0]));
        stack.addEventListener('touchmove', e => this.dragMove(e.touches[0]));
        stack.addEventListener('touchend', () => this.dragEnd());
        
        // Mouse
        stack.addEventListener('mousedown', e => this.dragStart(e));
        stack.addEventListener('mousemove', e => this.dragMove(e));
        stack.addEventListener('mouseup', () => this.dragEnd());
        stack.addEventListener('mouseleave', () => this.dragEnd());
    },

    dragStart(e) {
        if (e.target.closest('.map-full') || e.target.closest('button') || e.target.closest('input, textarea')) {
            return;
        }
        this.isDragging = true;
        this.startX = e.clientX;
        
        // Desactivar transiciones durante el arrastre para respuesta instantánea
        this.cards[this.currentIndex].classList.add('dragging');
    },

    dragMove(e) {
        if (!this.isDragging) return;
        this.currentX = e.clientX;
        const diff = this.currentX - this.startX;
        
        // Resistencia elástica al arrastrar
        const resistance = 0.6; 
        const translateX = diff * resistance;
        const rotate = diff * 0.05; // Rotación dinámica según cuanto arrastres
        
        const activeCard = this.cards[this.currentIndex];
        activeCard.style.transform = `translateX(${translateX}px) rotate(${rotate}deg)`;
        
        // Opacidad dinámica
        const opacity = 1 - Math.abs(diff) / 1000;
        activeCard.style.opacity = Math.max(0.8, opacity);
    },

    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        const diff = this.currentX - this.startX;
        const activeCard = this.cards[this.currentIndex];
        
        activeCard.classList.remove('dragging');
        activeCard.style.transform = '';
        activeCard.style.opacity = '';
        
        if (Math.abs(diff) > this.dragThreshold) {
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
            // Calcular posición relativa circular
            let position = (index - this.currentIndex + this.totalCards) % this.totalCards;
            
            // Ajuste para que el loop infinito visual funcione en ambas direcciones
            if (position > this.totalCards / 2) {
                position -= this.totalCards;
            }
            
            card.setAttribute('data-position', position);
            
            // Actualizar dots
            const dots = card.querySelectorAll('.dot');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === this.currentIndex));
        });
    },

    loadCardContent(index) {
        const cardType = this.cards[index].dataset.card;
        switch(cardType) {
            case 'map': 
                if (!window.mainMap) setTimeout(initMainMap, 100); 
                break;
            case 'checkin':
                if (!window.checkinInitialized) {
                    initCheckin();
                    window.checkinInitialized = true;
                }
                break;
            case 'history': loadHistory(); break;
            case 'stats': loadStats(); break;
            case 'settings': initSettings(); break;
        }
    }
};

// --- Lógica de la App (simplificada y unificada) ---

// Variables globales necesarias
let mainMap, checkinMap, currentPos, selectedPlace;

document.addEventListener('DOMContentLoaded', () => CardStack.init());

// Inicializadores de tarjetas
function initMainMap() {
    if (mainMap) return;
    Maps.getCurrentPosition().then(pos => {
        mainMap = Maps.createMap('map', pos.lat, pos.lng);
        Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
    }).catch(() => {
        mainMap = Maps.createMap('map', 40.4168, -3.7038, 6);
    });
}

function initCheckin() {
    const status = document.getElementById('locationStatus');
    
    navigator.geolocation.watchPosition(pos => {
        currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        status.textContent = 'Ubicación actualizada ✓';
        document.getElementById('currentLocation').textContent = 
            `${currentPos.lat.toFixed(4)}, ${currentPos.lng.toFixed(4)}`;
        
        if (!checkinMap) {
            checkinMap = Maps.createMap('mapPreview', currentPos.lat, currentPos.lng, 16);
        } else {
            checkinMap.setView([currentPos.lat, currentPos.lng], 16);
        }
        Maps.addMarker(checkinMap, currentPos.lat, currentPos.lng);
    }, err => {
        status.textContent = 'Esperando GPS...';
    }, { enableHighAccuracy: true });

    // Listeners del formulario
    document.getElementById('saveCheckin').onclick = saveCheckin;
}

function saveCheckin() {
    if (!currentPos) return alert('Necesitamos tu ubicación');
    
    const note = document.getElementById('placeNote').value;
    const checkin = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        location: currentPos,
        note: note,
        place: selectedPlace // Se llenaría con la búsqueda si se usa
    };
    
    Storage.saveCheckin(checkin);
    
    // Limpiar UI
    document.getElementById('placeNote').value = '';
    alert('¡Yeah! Guardado.');
    CardStack.next(); // Ir al historial automáticamente
}

function loadHistory() {
    const list = document.getElementById('checkinsList');
    const checkins = Storage.getAllCheckins().reverse(); // Más recientes primero
    
    if (checkins.length === 0) {
        list.innerHTML = '<div class="empty-state">Nada por aquí aún</div>';
        return;
    }
    
    list.innerHTML = checkins.map(c => `
        <div class="checkin-item">
            <div style="font-weight:bold">${new Date(c.timestamp).toLocaleDateString()}</div>
            <div>${c.note || 'Sin nota'}</div>
            <small style="opacity:0.6">${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}</small>
        </div>
    `).join('');
}

function loadStats() {
    const checkins = Storage.getAllCheckins();
    document.getElementById('statTotal').textContent = checkins.length;
    document.getElementById('statPlaces').textContent = new Set(checkins.map(c => 
        `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`
    )).size;
}

function initSettings() {
    document.getElementById('exportJSON').onclick = () => Export.toJSON();
}
