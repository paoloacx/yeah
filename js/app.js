const CardStack = {
    currentIndex: 0,
    cards: [],
    startX: 0,
    currentX: 0,
    isDragging: false,
    dragThreshold: 100, // Reducido ligeramente para facilitar el swipe

    init() {
        this.cards = Array.from(document.querySelectorAll('.card'));
        this.totalCards = this.cards.length;
        this.updatePositions();
        this.initListeners();
        
        // Esperar un tick para que el DOM esté listo antes de cargar el mapa
        setTimeout(() => this.loadCardContent(0), 100);
    },

    initListeners() {
        const stack = document.getElementById('cardStack');
        
        // Touch
        stack.addEventListener('touchstart', e => this.dragStart(e.touches[0]), { passive: true });
        stack.addEventListener('touchmove', e => this.dragMove(e.touches[0]), { passive: false });
        stack.addEventListener('touchend', () => this.dragEnd());
        
        // Mouse
        stack.addEventListener('mousedown', e => this.dragStart(e));
        stack.addEventListener('mousemove', e => this.dragMove(e));
        stack.addEventListener('mouseup', () => this.dragEnd());
        stack.addEventListener('mouseleave', () => this.dragEnd());
    },

    dragStart(e) {
        // Evitar arrastre en elementos interactivos
        if (e.target.closest('.leaflet-container') || 
            e.target.closest('button') || 
            e.target.closest('input, textarea, select') ||
            e.target.closest('.checkin-actions')) {
            return;
        }
        this.isDragging = true;
        this.startX = e.clientX;
        this.cards[this.currentIndex].classList.add('dragging');
    },

    dragMove(e) {
        if (!this.isDragging) return;
        
        // Prevenir scroll de página mientras arrastramos
        // e.preventDefault no funciona aquí si el listener es pasivo, pero lo hemos puesto en false para touchmove
        
        this.currentX = e.clientX;
        const diff = this.currentX - this.startX;
        
        // Física elástica
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
                if (!window.mainMap) {
                    initMainMap();
                } else {
                    // Clave: Forzar redibujado del mapa al volver a él
                    setTimeout(() => window.mainMap.invalidateSize(), 200);
                }
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

// --- Lógica Global de la App ---

let mainMap, checkinMap, currentPos, selectedPlace;

document.addEventListener('DOMContentLoaded', () => CardStack.init());

function initMainMap() {
    if (mainMap) return;
    Maps.getCurrentPosition().then(pos => {
        mainMap = Maps.createMap('map', pos.lat, pos.lng);
        Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
    }).catch(() => {
        mainMap = Maps.createMap('map', 40.4168, -3.7038, 6);
        Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
    });
}

function initCheckin() {
    const status = document.getElementById('locationStatus');
    
    // Usar watchPosition para mantener la ubicación actualizada
    navigator.geolocation.watchPosition(pos => {
        currentPos = { 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy 
        };
        
        status.textContent = 'Ubicación actualizada ✓';
        status.className = 'status-message success';
        document.getElementById('currentLocation').textContent = 
            `${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`;
        
        if (!checkinMap) {
            checkinMap = Maps.createMap('mapPreview', currentPos.lat, currentPos.lng, 16);
        } else {
            checkinMap.setView([currentPos.lat, currentPos.lng], 16);
        }
        // Actualizar marcador sin recrear el mapa entero constantemente
        Maps.addMarker(checkinMap, currentPos.lat, currentPos.lng);
        
    }, err => {
        status.textContent = 'Buscando señal GPS...';
        status.className = 'status-message';
    }, { 
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000 
    });

    document.getElementById('saveCheckin').onclick = saveCheckin;
}

function saveCheckin() {
    if (!currentPos) {
        alert('Aún no tenemos tu ubicación precisa.');
        return;
    }
    
    const note = document.getElementById('placeNote').value.trim();
    const checkin = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        location: currentPos,
        note: note,
        place: selectedPlace || null
        // Falta implementar foto por ahora para simplificar
    };
    
    Storage.saveCheckin(checkin);
    
    // Feedback y reset
    document.getElementById('placeNote').value = '';
    // Vibración de éxito si el navegador lo soporta
    if (navigator.vibrate) navigator.vibrate(50);
    
    // Volver al mapa principal y recargarlo
    CardStack.currentIndex = 0;
    CardStack.updatePositions();
    // Recargar markers en el mapa principal
    if (mainMap) {
        Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
        mainMap.setView([currentPos.lat, currentPos.lng], 15);
    }
    CardStack.loadCardContent(0);
}

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
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <strong style="font-size:1.1rem;">${c.place ? c.place.name : '📍 Ubicación marcada'}</strong>
                <small style="color:var(--text-secondary)">
                    ${new Date(c.timestamp).toLocaleDateString('es-ES', {weekday: 'short', day:'numeric', month:'short'})}
                    ${new Date(c.timestamp).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}
                </small>
            </div>
            ${c.note ? `<p style="font-style:italic; margin-bottom:0.5rem; color:var(--text-primary)">"${c.note}"</p>` : ''}
            <div style="font-family:monospace; font-size:0.8rem; color:var(--text-secondary)">
                ${c.location.lat.toFixed(6)}, ${c.location.lng.toFixed(6)}
            </div>
        </div>
    `).join('');
}

function loadStats() {
    const checkins = Storage.getAllCheckins();
    document.getElementById('statTotal').textContent = checkins.length;
    
    // Lugares únicos (basado en coordenadas redondeadas para agrupar cercanos)
    const uniquePlaces = new Set(checkins.map(c => 
        `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`
    ));
    document.getElementById('statPlaces').textContent = uniquePlaces.size;
    
    document.getElementById('statNotes').textContent = checkins.filter(c => c.note).length;
    // Fotos pendiente de re-implementar
}

function initSettings() {
    document.getElementById('exportJSON').onclick = () => Export.toJSON();
    // Otros exports se pueden reactivar aquí
}
