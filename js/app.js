// Sistema de navegación por tarjetas estilo webOS
const Cards = {
    current: 'map',
    history: ['map'],

    show(cardName) {
        const currentCard = document.querySelector('.card.active');
        const nextCard = document.getElementById(`card${cardName.charAt(0).toUpperCase() + cardName.slice(1)}`);

        if (!nextCard || currentCard === nextCard) return;

        // Animación de salida
        currentCard.classList.remove('active');
        currentCard.classList.add('left');

        // Animación de entrada
        setTimeout(() => {
            nextCard.classList.remove('left');
            nextCard.classList.add('active');
            this.current = cardName;
            this.history.push(cardName);

            // Inicializar contenido de la tarjeta
            this.initCard(cardName);
        }, 100);
    },

    back() {
        if (this.history.length > 1) {
            this.history.pop();
            const previous = this.history[this.history.length - 1];
            this.show(previous);
        }
    },

    initCard(cardName) {
        switch(cardName) {
            case 'map':
                if (!mainMap) {
                    initMainMap();
                } else {
                    setTimeout(() => mainMap.invalidateSize(), 100);
                    loadCheckinsOnMap();
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
            case 'export':
                initExport();
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
    initApp();
});

function initApp() {
    // Inicializar mapa principal
    initMainMap();

    // Wave Launcher
    document.querySelectorAll('.wave-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            Cards.show(action);
        });
    });

    // Detectar swipe para volver atrás
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        if (touchEndX - touchStartX > 100 && Cards.current !== 'map') {
            Cards.show('map');
        }
    }
}

// Mapa principal
function initMainMap() {
    Maps.getCurrentPosition()
        .then(position => {
            mainMap = Maps.createMap('map', position.lat, position.lng);
            loadCheckinsOnMap();
        })
        .catch(error => {
            console.log('Ubicación no disponible, usando Madrid');
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

            // Inicializar mapa preview
            if (checkinMap) {
                checkinMap.remove();
            }
            checkinMap = Maps.createMap('mapPreview', currentPosition.lat, currentPosition.lng, 16);
            Maps.addMarker(checkinMap, currentPosition.lat, currentPosition.lng);

            // Buscar lugares cercanos
            searchNearbyPlaces(currentPosition.lat, currentPosition.lng);
        },
        (error) => {
            status.textContent = 'Error obteniendo ubicación';
            status.classList.add('error');
            console.error(error);
        }
    );

    // Búsqueda manual
    const searchBtn = document.getElementById('searchBtn');
    const placeSearch = document.getElementById('placeSearch');

    searchBtn.onclick = () => performSearch();
    placeSearch.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    };

    // Foto
    document.getElementById('placePhoto').onchange = handlePhoto;

    // Guardar
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
            resultsDiv.innerHTML = '<p class="hint">No se encontraron lugares. Busca manualmente o guarda solo GPS.</p>';
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
        console.error('Error buscando lugares:', error);
        resultsDiv.innerHTML = '<p class="hint">Error al buscar. Puedes guardar solo GPS.</p>';
    }
}

async function performSearch() {
    const query = document.getElementById('placeSearch').value.trim();
    const resultsDiv = document.getElementById('placeResults');

    if (query.length < 3) {
        resultsDiv.innerHTML = '<p class="hint">Escribe al menos 3 caracteres</p>';
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
        console.error('Error:', error);
        resultsDiv.innerHTML = '<p class="hint">Error al buscar</p>';
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
            preview.innerHTML = `<img src="${compressedPhoto}" alt="Preview" style="max-width: 100%; border-radius: 12px;">`;
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
    Cards.show('map');
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
            if (confirm('¿Eliminar este check-in?')) {
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

// Exportar
function initExport() {
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
                if (confirm('¿Reemplazar todos los datos actuales?')) {
                    if (Storage.importData(data)) {
                        alert('Datos importados');
                        Cards.show('map');
                    } else {
                        alert('Error en el archivo');
                    }
                }
            } catch (error) {
                alert('Archivo inválido');
            }
        };
        reader.readAsText(file);
    };

    document.getElementById('clearAll').onclick = () => {
        if (confirm('¿ELIMINAR TODOS los check-ins?')) {
            if (confirm('Última confirmación')) {
                Storage.clearAll();
                alert('Datos eliminados');
                Cards.show('map');
            }
        }
    };
}
