// Sistema de navegación con swipe físico estilo SwipeNote
const CardStack = {
    currentIndex: 0,
    cards: [],
    totalCards: 5,
    isDragging: false,
    startX: 0,
    currentX: 0,
    dragThreshold: 100,

    init() {
        this.cards = Array.from(document.querySelectorAll('.card'));
        this.updatePositions();
        this.attachEventListeners();
        
        // Ocultar hint después de 3 segundos
        setTimeout(() => {
            const hint = document.getElementById('swipeHint');
            if (hint) hint.style.display = 'none';
        }, 3000);

        // Inicializar primera tarjeta
        this.initCard(0);
    },

    attachEventListeners() {
        const stack = document.getElementById('cardStack');

        // Touch events
        stack.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: true });
        stack.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
        stack.addEventListener('touchend', (e) => this.handleDragEnd(e));

        // Mouse events (para desktop)
        stack.addEventListener('mousedown', (e) => this.handleDragStart(e));
        stack.addEventListener('mousemove', (e) => this.handleDragMove(e));
        stack.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        stack.addEventListener('mouseleave', (e) => this.handleDragEnd(e));

        // Prevenir scroll mientras se arrastra
        stack.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
    },

    handleDragStart(e) {
        const activeCard = this.cards[this.currentIndex];
        if (!activeCard) return;

        // Solo permitir drag en la tarjeta activa
        const touch = e.touches ? e.touches[0] : e;
        this.startX = touch.clientX;
        this.isDragging = true;
        activeCard.classList.add('dragging');
    },

    handleDragMove(e) {
        if (!this.isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        this.currentX = touch.clientX;
        const diff = this.currentX - this.startX;

        const activeCard = this.cards[this.currentIndex];
        if (!activeCard) return;

        // Aplicar transformación durante el arrastre
        const progress = Math.min(Math.abs(diff) / this.dragThreshold, 1);
        const direction = diff > 0 ? 1 : -1;

        activeCard.style.transform = `translateX(${diff}px) scale(${1 - progress * 0.1}) rotateY(${direction * progress * 5}deg)`;
        activeCard.style.opacity = 1 - progress * 0.3;
    },

    handleDragEnd(e) {
        if (!this.isDragging) return;

        const diff = this.currentX - this.startX;
        const activeCard = this.cards[this.currentIndex];
        
        if (!activeCard) {
            this.isDragging = false;
            return;
        }

        activeCard.classList.remove('dragging');
        activeCard.style.transform = '';
        activeCard.style.opacity = '';

        // Determinar si el swipe fue suficiente
        if (Math.abs(diff) > this.dragThreshold) {
            if (diff < 0 && this.currentIndex < this.totalCards - 1) {
                // Swipe izquierda - siguiente tarjeta
                this.next();
            } else if (diff > 0 && this.currentIndex > 0) {
                // Swipe derecha - tarjeta anterior
                this.prev();
            }
        }

        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
    },

    next() {
        if (this.currentIndex < this.totalCards - 1) {
            this.currentIndex++;
            this.updatePositions();
            this.initCard(this.currentIndex);
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updatePositions();
            this.initCard(this.currentIndex);
        }
    },

    updatePositions() {
        this.cards.forEach((card, index) => {
            const position = index - this.currentIndex;
            card.setAttribute('data-position', position);
            
            // Actualizar indicadores
            const dots = card.querySelectorAll('.dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === this.currentIndex);
            });
        });
    },

    initCard(index) {
        const cardNames = ['map', 'checkin', 'history', 'stats', 'settings'];
        const cardName = cardNames[index];

        switch(cardName) {
            case 'map':
                if (!mainMap) {
                    initMainMap();
                } else {
                    setTimeout(() => {
                        mainMap.invalidateSize();
                        loadCheckinsOnMap();
                    }, 100);
                }
                break;
            case 'checkin':
                initCheckin();
                break;
            case 'history':
                loadHistory();
                break;
            case 'stats':
                loadStats();
                break;
            case 'settings':
                initSettings();
                break;
        }
    }
};

// Variables globales
let mainMap = null;
let checkinMap = null;
let currentPosition = null;
let selectedPlace = null;
let compressedPhoto = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    CardStack.init();
});

// Mapa principal
function initMainMap() {
    Maps.getCurrentPosition()
        .then(position => {
            mainMap = Maps.createMap('map', position.lat, position.lng);
            loadCheckinsOnMap();
        })
        .catch(error => {
            console.log('Ubicación no disponible');
            mainMap = Maps.createMap('map', 40.4168, -3.7038, 6);
            loadCheckinsOnMap();
        });
}

function loadCheckinsOnMap() {
    if (!mainMap) return;
    const checkins = Storage.getAllCheckins();
    if (checkins.length > 0) {
        Maps.addCheckinsToMap(mainMap, checkins);
    }
}

// Check-in
function initCheckin() {
    currentPosition = null;
    selectedPlace = null;
    compressedPhoto = null;

    const status = document.getElementById('locationStatus');
    const locationDisplay = document.getElementById('currentLocation');
    const resultsDiv = document.getElementById('placeResults');

    resultsDiv.innerHTML = '';
    document.getElementById('placeSearch').value = '';
    document.getElementById('placeNote').value = '';
    document.getElementById('photoPreview').innerHTML = '';

    if (!navigator.geolocation) {
        status.textContent = 'Geolocalización no disponible';
        status.classList.add('error');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            status.textContent = 'Ubicación obtenida ✓';
            status.classList.remove('error');
            status.classList.add('success');
            locationDisplay.textContent = `${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)}`;

            if (checkinMap) {
                checkinMap.remove();
            }
            checkinMap = Maps.createMap('mapPreview', currentPosition.lat, currentPosition.lng, 16);
            Maps.addMarker(checkinMap, currentPosition.lat, currentPosition.lng);

            searchNearbyPlaces(currentPosition.lat, currentPosition.lng);
        },
        (error) => {
            status.textContent = 'Error obteniendo ubicación';
            status.classList.add('error');
        }
    );

    const searchBtn = document.getElementById('searchBtn');
    const placeSearch = document.getElementById('placeSearch');

    searchBtn.onclick = () => performSearch();
    placeSearch.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    };

    document.getElementById('placePhoto').onchange = handlePhoto;
    document.getElementById('saveCheckin').onclick = saveCheckin;
}

async function searchNearbyPlaces(lat, lng) {
    const resultsDiv = document.getElementById('placeResults');
    resultsDiv.innerHTML = '<p class="hint">Buscando lugares cercanos...</p>';

    try {
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const reverseResponse = await fetch(reverseUrl, {
            headers: { 'User-Agent': 'YeahApp/1.0' }
        });
        const reverseData = await reverseResponse.json();

        const bbox = [lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005].join(',');
        const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&viewbox=${bbox}&bounded=1&limit=10`;
        const searchResponse = await fetch(searchUrl, {
            headers: { 'User-Agent': 'YeahApp/1.0' }
        });
        const searchData = await searchResponse.json();

        const places = [];

        if (reverseData.display_name) {
            places.push({
                name: reverseData.display_name,
                lat: reverseData.lat,
                lng: reverseData.lon,
                type: 'address'
            });
        }

        if (Array.isArray(searchData)) {
            searchData.forEach(place => {
                if (place.display_name && place.display_name !== reverseData.display_name) {
                    places.push({
                        name: place.display_name,
                        lat: place.lat,
                        lng: place.lon,
                        type: place.type
                    });
                }
            });
        }

        if (places.length === 0) {
            resultsDiv.innerHTML = '<p class="hint">No se encontraron lugares.</p>';
            return;
        }

        resultsDiv.innerHTML = '<div class="hint" style="margin-bottom: 0.5rem;">Lugares cercanos:</div>' +
            places.slice(0, 5).map(place => `
                <div class="place-item" data-place='${JSON.stringify(place)}'>
                    ${place.name}
                </div>
            `).join('');

        document.querySelectorAll('.place-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.place-item').forEach(p => p.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                selectedPlace = JSON.parse(e.currentTarget.dataset.place);
            });
        });

    } catch (error) {
        resultsDiv.innerHTML = '<p class="hint">Error al buscar.</p>';
    }
}

async function performSearch() {
    const query = document.getElementById('placeSearch').value.trim();
    const resultsDiv = document.getElementById('placeResults');

    if (query.length < 3) {
        resultsDiv.innerHTML = '<p class="hint">Mínimo 3 caracteres</p>';
        return;
    }

    resultsDiv.innerHTML = '<p class="hint">Buscando...</p>';

    try {
        let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`;
        if (currentPosition) {
            searchUrl += `&lat=${currentPosition.lat}&lon=${currentPosition.lng}&bounded=1&viewbox=${currentPosition.lng - 0.01},${currentPosition.lat - 0.01},${currentPosition.lng + 0.01},${currentPosition.lat + 0.01}`;
        }

        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'YeahApp/1.0' }
        });
        const data = await response.json();

        if (data.length === 0) {
            resultsDiv.innerHTML = '<p class="hint">Sin resultados</p>';
            return;
        }

        resultsDiv.innerHTML = data.map(place => `
            <div class="place-item" data-place='${JSON.stringify({
            name: place.display_name,
            lat: place.lat,
            lng: place.lon,
            type: place.type
        })}'>
                ${place.display_name}
            </div>
        `).join('');

        document.querySelectorAll('.place-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.place-item').forEach(p => p.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                selectedPlace = JSON.parse(e.currentTarget.dataset.place);
            });
        });

    } catch (error) {
        resultsDiv.innerHTML = '<p class="hint">Error</p>';
    }
}

function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const maxSize = 800;
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height *= maxSize / width;
                    width = maxSize;
                } else {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            compressedPhoto = canvas.toDataURL('image/jpeg', 0.8);

            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${compressedPhoto}" alt="Preview" style="max-width: 100%;">`;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function saveCheckin() {
    if (!currentPosition) {
        alert('Esperando ubicación...');
        return;
    }

    const checkin = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        location: currentPosition,
        place: selectedPlace,
        note: document.getElementById('placeNote').value.trim(),
        photo: compressedPhoto
    };

    Storage.saveCheckin(checkin);
    CardStack.currentIndex = 0;
    CardStack.updatePositions();
    CardStack.initCard(0);
}

// Historial
function loadHistory() {
    let checkins = Storage.getAllCheckins();

    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    if (searchTerm) {
        checkins = checkins.filter(c => {
            const placeName = c.place?.name?.toLowerCase() || '';
            const note = c.note?.toLowerCase() || '';
            return placeName.includes(searchTerm) || note.includes(searchTerm);
        });
    }

    const sortOrder = document.getElementById('sortFilter').value;
    checkins.sort((a, b) => {
        return sortOrder === 'newest'
            ? new Date(b.timestamp) - new Date(a.timestamp)
            : new Date(a.timestamp) - new Date(b.timestamp);
    });

    renderHistory(checkins);

    document.getElementById('searchFilter').oninput = loadHistory;
    document.getElementById('sortFilter').onchange = loadHistory;
}

function renderHistory(checkins) {
    const listDiv = document.getElementById('checkinsList');
    const emptyState = document.getElementById('emptyState');

    if (checkins.length === 0) {
        listDiv.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    listDiv.style.display = 'block';
    emptyState.style.display = 'none';

    listDiv.innerHTML = checkins.map(checkin => `
        <div class="checkin-item">
            ${checkin.photo ? `<img src="${checkin.photo}" alt="Foto" class="checkin-photo">` : ''}
            <div class="checkin-content">
                <div class="checkin-place">
                    ${checkin.place ? checkin.place.name : 'Ubicación GPS'}
                </div>
                <div class="checkin-time">${formatDate(checkin.timestamp)}</div>
                ${checkin.note ? `<div class="checkin-note">${checkin.note}</div>` : ''}
                <div class="checkin-coords">
                    ${checkin.location.lat.toFixed(6)}, ${checkin.location.lng.toFixed(6)}
                </div>
            </div>
            <div class="checkin-actions">
                <button class="btn-icon delete-btn" data-id="${checkin.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (confirm('¿Eliminar?')) {
                Storage.deleteCheckin(id);
                loadHistory();
            }
        });
    });
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Estadísticas
function loadStats() {
    const checkins = Storage.getAllCheckins();
    const stats = Storage.getStats();

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPlaces').textContent = stats.uniquePlaces;
    document.getElementById('statPhotos').textContent = stats.withPhotos;
    document.getElementById('statNotes').textContent = stats.withNotes;

    loadTopPlaces(checkins);
    loadMonthlyStats(checkins);
    loadWeekdayStats(checkins);
    loadHeatMap(checkins);
}

function loadTopPlaces(checkins) {
    const placeCounts = {};
    checkins.forEach(checkin => {
        const placeName = checkin.place ? checkin.place.name : 'Ubicación GPS';
        placeCounts[placeName] = (placeCounts[placeName] || 0) + 1;
    });

    const sorted = Object.entries(placeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const container = document.getElementById('topPlaces');

    if (sorted.length === 0) {
        container.innerHTML = '<p class="hint">No hay datos</p>';
        return;
    }

    container.innerHTML = sorted.map(([place, count]) => `
        <div class="top-item">
            <span class="place-name">${place}</span>
            <span class="place-count">${count} visita${count > 1 ? 's' : ''}</span>
        </div>
    `).join('');
}

function loadMonthlyStats(checkins) {
    const monthlyCounts = {};
    checkins.forEach(checkin => {
        const date = new Date(checkin.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    const sorted = Object.entries(monthlyCounts).sort();
    const container = document.getElementById('monthlyChart');

    if (sorted.length === 0) {
        container.innerHTML = '<p class="hint">No hay datos</p>';
        return;
    }

    const maxCount = Math.max(...sorted.map(([, count]) => count));

    container.innerHTML = sorted.map(([month, count]) => {
        const percentage = (count / maxCount) * 100;
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });

        return `
            <div class="chart-bar">
                <span class="bar-label">${monthName}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="bar-value">${count}</span>
            </div>
        `;
    }).join('');
}

function loadWeekdayStats(checkins) {
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

    checkins.forEach(checkin => {
        const date = new Date(checkin.timestamp);
        weekdayCounts[date.getDay()]++;
    });

    const container = document.getElementById('weekdayChart');

    if (checkins.length === 0) {
        container.innerHTML = '<p class="hint">No hay datos</p>';
        return;
    }

    const maxCount = Math.max(...weekdayCounts);

    container.innerHTML = weekdayCounts.map((count, index) => {
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return `
            <div class="chart-bar">
                <span class="bar-label">${weekdays[index]}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="bar-value">${count}</span>
            </div>
        `;
    }).join('');
}

function loadHeatMap(checkins) {
    const container = document.getElementById('heatMap');

    if (checkins.length === 0) {
        container.innerHTML = '<p class="hint">No hay datos</p>';
        return;
    }

    setTimeout(() => {
        const map = Maps.createMap('heatMap', 40.4168, -3.7038, 6);

        const locationCounts = {};
        checkins.forEach(checkin => {
            const key = `${checkin.location.lat.toFixed(4)},${checkin.location.lng.toFixed(4)}`;
            locationCounts[key] = (locationCounts[key] || 0) + 1;
        });

        Object.entries(locationCounts).forEach(([coords, count]) => {
            const [lat, lng] = coords.split(',').map(Number);
            const radius = Math.min(5 + count * 2, 20);

            L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: '#4CAF50',
                color: '#2E7D32',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
            }).addTo(map).bindPopup(`${count} check-in${count > 1 ? 's' : ''}`);
        });

        const bounds = checkins.map(c => [c.location.lat, c.location.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }, 100);
}

// Settings
function initSettings() {
    document.getElementById('exportCSV').onclick = () => Export.toCSV();
    document.getElementById('exportICal').onclick = () => Export.toICal();
    document.getElementById('exportJSON').onclick = () => Export.toJSON();

    document.getElementById('importJSON').onclick = () => {
        document.getElementById('importFile').click();
    };

    document.getElementById('importFile').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('¿Reemplazar datos?')) {
                    if (Storage.importData(data)) {
                        alert('Datos importados');
                        CardStack.currentIndex = 0;
                        CardStack.updatePositions();
                        CardStack.initCard(0);
                    } else {
                        alert('Error');
                    }
                }
            } catch (error) {
                alert('Archivo inválido');
            }
        };
        reader.readAsText(file);
    };

    document.getElementById('clearAll').onclick = () => {
        if (confirm('¿ELIMINAR TODO?')) {
            if (confirm('Última confirmación')) {
                Storage.clearAll();
                alert('Eliminado');
                CardStack.currentIndex = 0;
                CardStack.updatePositions();
                CardStack.initCard(0);
            }
        }
    };
}
