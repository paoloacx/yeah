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
        const baseRotation = this.currentIndex === 1 ? 1.5 : (this.currentIndex === 2 ? -1.5 : 0);
        this.cards[this.currentIndex].style.transform = `translateX(${diff * 0.7}px) rotate(${baseRotation + diff * 0.03}deg)`;
    },
    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.cards[this.currentIndex].classList.remove('dragging');
        this.cards[this.currentIndex].style.transform = '';
        if (this.hasMoved && Math.abs(this.currentX - this.startX) > 80) {
            // Check for unsaved changes before navigating away from checkin card
            if (this.currentIndex === 1 && hasUnsavedChanges) {
                if (confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) {
                    hasUnsavedChanges = false;
                    (this.currentX - this.startX) > 0 ? this.prev() : this.next();
                }
            } else {
                (this.currentX - this.startX) > 0 ? this.prev() : this.next();
            }
        }
    },
    next() { 
        this.currentIndex = (this.currentIndex + 1) % this.totalCards; 
        this.updatePositions(); 
        this.loadCardContent(this.currentIndex);
        if ('vibrate' in navigator) navigator.vibrate(30);
    },
    prev() { 
        this.currentIndex = (this.currentIndex - 1 + this.totalCards) % this.totalCards; 
        this.updatePositions(); 
        this.loadCardContent(this.currentIndex);
        if ('vibrate' in navigator) navigator.vibrate(30);
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
        if (type === 'map') {
            window.mainMap ? setTimeout(() => window.mainMap.invalidateSize(), 200) : initMainMap();
            updateQuickStats();
        }
        if (type === 'checkin' && !window.editingId) resetCheckin();
        if (type === 'history') loadHistory();
        if (type === 'stats') loadStats();
    }
};

// --- App Globals & Init ---
let mainMap, checkinMap, detailsMap, heatMapInstance, currentPos, editingId = null, watchId = null, marker = null;
let currentPhoto = null;
let currentPlaceName = null;
let hasUnsavedChanges = false;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('========================================');
    console.log('YEAH APP VERSION 2.0 - LOADED SUCCESSFULLY');
    console.log('========================================');

    CardStack.init();
    initTopoBackground();

    // Request permissions on mobile
    if (window.Capacitor && window.Capacitor.getPlatform() !== 'web') {
        setTimeout(async () => {
            try {
                // Request location permission
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
                    const permission = await window.Capacitor.Plugins.Geolocation.requestPermissions();
                    console.log('Location permission:', permission);
                }
            } catch (error) {
                console.log('Error requesting permissions:', error);
            }
        }, 1000);
    }

    // New Yeah button
    document.getElementById('newYeahBtn').addEventListener('click', () => {
        CardStack.currentIndex = 1;
        CardStack.updatePositions();
        CardStack.loadCardContent(1);
        if ('vibrate' in navigator) navigator.vibrate(50);
    });

    // Top Yeah button - open top places modal
    document.getElementById('topYeahBtn').addEventListener('click', () => {
        showTopPlacesModal();
        if ('vibrate' in navigator) navigator.vibrate(50);
    });

    // Edit top places button in stats
    document.getElementById('editTopPlacesBtn').addEventListener('click', () => {
        showEditTopPlacesModal();
        if ('vibrate' in navigator) navigator.vibrate(50);
    });

    // Quick stats - navigate to stats card
    document.getElementById('quickStats').addEventListener('click', () => {
        CardStack.currentIndex = 3;
        CardStack.updatePositions();
        CardStack.loadCardContent(3);
        if ('vibrate' in navigator) navigator.vibrate(50);
    });

    // Toggle details section
    document.getElementById('toggleDetailsBtn').addEventListener('click', () => {
        const detailsSection = document.getElementById('detailsSection');
        const toggleBtn = document.getElementById('toggleDetailsBtn');
        const isVisible = detailsSection.style.display !== 'none';

        detailsSection.style.display = isVisible ? 'none' : 'block';
        toggleBtn.classList.toggle('active', !isVisible);
    });

    // Clear selected place
    document.getElementById('clearPlace').addEventListener('click', () => {
        currentPlaceName = null;
        document.getElementById('selectedPlaceDisplay').style.display = 'none';
        document.getElementById('selectedPlaceName').textContent = '';
        hasUnsavedChanges = true;
    });

    // Top place search
    document.getElementById('topPlaceSearchBtn').addEventListener('click', () => {
        const query = document.getElementById('topPlaceSearch').value.trim();
        if (!query) return;

        showToast('Buscando lugares...');
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(r => r.json())
            .then(results => {
                const container = document.getElementById('topPlaceSearchResults');
                container.innerHTML = results.slice(0, 5).map(r =>
                    `<div class="place-item" onclick="selectSearchedPlaceForTop('${r.display_name.replace(/'/g, "\\'")}', ${r.lat}, ${r.lon})">${r.display_name}</div>`
                ).join('');
            })
            .catch(() => showToast('Error al buscar', 'error'));
    });

    // Save single top place
    document.getElementById('saveSingleTopPlace').addEventListener('click', () => {
        const name = document.getElementById('topPlaceName').value.trim();
        const icon = document.getElementById('topPlaceIcon').value.trim() || '📍';

        if (!name) {
            showToast('Falta el nombre', 'error');
            return;
        }

        if (!selectedTopPlaceLocation) {
            showToast('Falta la ubicación', 'error');
            return;
        }

        Storage.updateTopPlace(editingTopPlaceIndex, {
            name: name,
            lat: selectedTopPlaceLocation.lat,
            lng: selectedTopPlaceLocation.lng,
            icon: icon
        });

        showToast('Lugar TOP actualizado');
        closeEditSingleTopPlace();
        showEditTopPlacesModal(); // Refresh list
        if ('vibrate' in navigator) navigator.vibrate(50);
    });

    // Track unsaved changes
    document.getElementById('placeNote').addEventListener('input', () => hasUnsavedChanges = true);
    document.getElementById('photoInput').addEventListener('change', () => hasUnsavedChanges = true);
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges && CardStack.currentIndex === 1) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const savedTheme = localStorage.getItem('theme');

    console.log('Dark mode init - savedTheme:', savedTheme);
    console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
        console.log('Applied saved DARK theme');
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        darkModeToggle.checked = false;
        console.log('Applied saved LIGHT theme');
    } else {
        // Auto detect system preference and save it
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
            localStorage.setItem('theme', 'dark');
            console.log('Auto-detected DARK, saved to localStorage');
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
            localStorage.setItem('theme', 'light');
            console.log('Auto-detected LIGHT, saved to localStorage');
        }
    }

    darkModeToggle.addEventListener('change', (e) => {
        console.log('Toggle changed! Checked:', e.target.checked);
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            console.log('Switched to DARK mode');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            console.log('Switched to LIGHT mode');
        }
        console.log('Body classes:', document.body.className);
        if ('vibrate' in navigator) navigator.vibrate(30);
    });
    
    // Hide loader after app is ready
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }
    }, 800);

    // Show welcome toast on first visit
    setTimeout(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            const welcomeToast = document.createElement('div');
            welcomeToast.className = 'welcome-toast';
            welcomeToast.innerHTML = '👈 Desliza las cards hacia un lado para navegar 👉';
            document.body.appendChild(welcomeToast);

            setTimeout(() => {
                welcomeToast.style.opacity = '0';
                welcomeToast.style.transform = 'translateX(-50%) translateY(100%)';
                setTimeout(() => welcomeToast.remove(), 500);
            }, 4000);

            localStorage.setItem('hasSeenWelcome', 'true');
        }
    }, 1500);
});

// --- Topographic Background ---
function initTopoBackground() {
    const canvas = document.getElementById('topoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawTopo();
    };
    resize();
    window.addEventListener('resize', resize);
    
    function drawTopo() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        const spacing = 80;
        const amplitude = 40;
        
        // Draw organic wavy lines across the canvas
        for (let y = -amplitude; y < canvas.height + amplitude; y += spacing) {
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += 10) {
                const wave1 = Math.sin(x * 0.01 + y * 0.02) * amplitude;
                const wave2 = Math.sin(x * 0.015 + y * 0.01) * (amplitude * 0.5);
                const yPos = y + wave1 + wave2;
                
                if (x === 0) ctx.moveTo(x, yPos);
                else ctx.lineTo(x, yPos);
            }
            ctx.stroke();
        }
        
        // Draw secondary lines with different offset
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        for (let y = spacing/2; y < canvas.height + amplitude; y += spacing) {
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += 10) {
                const wave1 = Math.sin(x * 0.012 + y * 0.018) * amplitude;
                const wave2 = Math.cos(x * 0.008 + y * 0.022) * (amplitude * 0.6);
                const yPos = y + wave1 + wave2;
                
                if (x === 0) ctx.moveTo(x, yPos);
                else ctx.lineTo(x, yPos);
            }
            ctx.stroke();
        }
    }
}

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
    
    // Center map button
    document.getElementById('centerMapBtn').onclick = () => {
        const btn = document.getElementById('centerMapBtn');
        btn.classList.add('loading');
        navigator.geolocation.getCurrentPosition(
            p => {
                mainMap.setView([p.coords.latitude, p.coords.longitude], 16);
                btn.classList.remove('loading');
                if ('vibrate' in navigator) navigator.vibrate(50);
            },
            () => {
                btn.classList.remove('loading');
                showToast('No se pudo obtener ubicación', 'error');
            },
            {enableHighAccuracy: true}
        );
    };
}
function updateQuickStats() {
    const checkins = Storage.getAllCheckins();
    const places = new Set(checkins.map(c => `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`)).size;
    document.getElementById('quickStats').innerHTML = 
        `Llevas <strong>${checkins.length}</strong> Yeahs¡ en <strong>${places}</strong> lugares distintos.`;
}
function resetCheckin() {
    editingId = null;
    currentPhoto = null;
    currentPlaceName = null;
    hasUnsavedChanges = false;
    document.getElementById('cardTitleCheckin').textContent = 'Nuevo Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Guardar Yeah¡';
    document.getElementById('placeNote').value = '';
    document.getElementById('photoInput').value = '';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoPreview').src = '#';
    document.getElementById('placeSearch').value = '';
    document.getElementById('placeResults').innerHTML = '';
    document.getElementById('selectedPlaceDisplay').style.display = 'none';
    document.getElementById('selectedPlaceName').textContent = '';

    // Collapse details section
    document.getElementById('detailsSection').style.display = 'none';
    document.getElementById('toggleDetailsBtn').classList.remove('active');

    document.getElementById('dateTimeSection').style.display = 'none';
    
    const now = new Date();
    document.getElementById('checkinDate').value = now.toISOString().split('T')[0];
    document.getElementById('checkinTime').value = now.toTimeString().slice(0, 5);
    
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
        p => updateLoc(p.coords.latitude, p.coords.longitude),
        e => showToast('Buscando señal GPS...', 'error'), {enableHighAccuracy:true}
    );
}
function updateLoc(lat, lng) {
    currentPos = {lat, lng};
    if (!checkinMap) {
        checkinMap = Maps.createMap('mapPreview', lat, lng, 16);
        checkinMap.on('click', e => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            watchId = null;
            updateLoc(e.latlng.lat, e.latlng.lng);
            showToast('Ubicación fijada manualmente');
            if ('vibrate' in navigator) navigator.vibrate(50);
        });
        
        // Center preview button
        document.getElementById('centerPreviewBtn').onclick = () => {
            const btn = document.getElementById('centerPreviewBtn');
            btn.classList.add('loading');
            navigator.geolocation.getCurrentPosition(
                p => {
                    if (watchId) navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                    updateLoc(p.coords.latitude, p.coords.longitude);
                    btn.classList.remove('loading');
                    if ('vibrate' in navigator) navigator.vibrate(50);
                },
                () => {
                    btn.classList.remove('loading');
                    showToast('No se pudo obtener ubicación', 'error');
                },
                {enableHighAccuracy: true}
            );
        };
    }
    checkinMap.setView([lat, lng], 16);
    if (marker) marker.remove();
    marker = Maps.addMarker(checkinMap, lat, lng);
}

// --- Search ---
document.getElementById('searchBtn').onclick = () => {
    const query = document.getElementById('placeSearch').value.trim();
    if (!query || !currentPos) return;
    showToast('Buscando lugares...');
    if (window.Maps && window.Maps.searchNearby) {
        window.Maps.searchNearby(currentPos.lat, currentPos.lng, query)
            .then(results => {
                 const container = document.getElementById('placeResults');
                 container.innerHTML = results.map(r => 
                     `<div class="place-item" onclick="selectPlace('${r.display_name.replace(/'/g, "\\'")}', ${r.lat}, ${r.lon})">${r.display_name}</div>`
                 ).join('');
            })
            .catch(() => showToast('Error en la búsqueda', 'error'));
    } else {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&lat=${currentPos.lat}&lon=${currentPos.lng}`)
            .then(r => r.json())
            .then(results => {
                const container = document.getElementById('placeResults');
                 container.innerHTML = results.map(r => 
                     `<div class="place-item" onclick="selectPlace('${r.display_name.replace(/'/g, "\\'")}', ${r.lat}, ${r.lon})">${r.display_name}</div>`
                 ).join('');
            })
            .catch(() => showToast('Error al buscar', 'error'));
    }
};

window.selectPlace = (name, lat, lng) => {
    currentPlaceName = name;
    document.getElementById('selectedPlaceName').textContent = name;
    document.getElementById('selectedPlaceDisplay').style.display = 'flex';
    document.getElementById('placeResults').innerHTML = '';
    document.getElementById('placeSearch').value = '';

    // Stop GPS tracking when manually selecting a place
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    updateLoc(parseFloat(lat), parseFloat(lng));
    hasUnsavedChanges = true;
    if ('vibrate' in navigator) navigator.vibrate(30);
};

// --- Photo Handling ---
document.getElementById('photoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width; let height = img.height;
            if (width > 800 || height > 800) {
                if (width > height) { height *= 800 / width; width = 800; }
                else { width *= 800 / height; height = 800; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            currentPhoto = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('photoPreview').src = currentPhoto;
            document.getElementById('photoPreview').style.display = 'block';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- Actions ---
document.getElementById('saveCheckin').onclick = () => {
    if (!currentPos) return showToast('Falta ubicación', 'error');
    
    const dateValue = document.getElementById('checkinDate').value;
    const timeValue = document.getElementById('checkinTime').value;
    let timestamp;
    
    if (dateValue && timeValue) {
        timestamp = new Date(`${dateValue}T${timeValue}`).toISOString();
    } else {
        timestamp = editingId ? Storage.getCheckin(editingId).timestamp : new Date().toISOString();
    }
    
    const checkin = {
        id: editingId || Date.now(),
        timestamp: timestamp,
        location: currentPos,
        placeName: currentPlaceName || null,
        note: document.getElementById('placeNote').value.trim(),
        photo: currentPhoto
    };
    editingId ? Storage.updateCheckin(editingId, checkin) : Storage.saveCheckin(checkin);
    
    if ('vibrate' in navigator) navigator.vibrate([50, 100, 50]);
    
    showToast(editingId ? '¡Yeah actualizado!' : '¡Yeah¡ guardado!', 'success');
    hasUnsavedChanges = false;
    resetCheckin();
    CardStack.currentIndex = 0; CardStack.updatePositions();
    if (mainMap) { Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins()); mainMap.setView([checkin.location.lat, checkin.location.lng], 16); }
    CardStack.loadCardContent(0);
};

window.editCheckin = (id) => {
    const c = Storage.getCheckin(id); if (!c) return;
    editingId = id; currentPos = c.location; currentPhoto = c.photo || null; currentPlaceName = c.placeName || null;
    document.getElementById('cardTitleCheckin').textContent = 'Editando Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Actualizar Yeah¡';
    document.getElementById('placeNote').value = c.note || '';

    // Show place name if exists
    if (currentPlaceName) {
        document.getElementById('selectedPlaceName').textContent = currentPlaceName;
        document.getElementById('selectedPlaceDisplay').style.display = 'flex';
    } else {
        document.getElementById('selectedPlaceDisplay').style.display = 'none';
    }

    // Expand details section if there's note or photo
    if (c.note || c.photo) {
        document.getElementById('detailsSection').style.display = 'block';
        document.getElementById('toggleDetailsBtn').classList.add('active');
    }

    document.getElementById('dateTimeSection').style.display = 'block';

    const checkinDate = new Date(c.timestamp);
    document.getElementById('checkinDate').value = checkinDate.toISOString().split('T')[0];
    document.getElementById('checkinTime').value = checkinDate.toTimeString().slice(0, 5);

    if (currentPhoto) {
        document.getElementById('photoPreview').src = currentPhoto;
        document.getElementById('photoPreview').style.display = 'block';
    } else {
        document.getElementById('photoPreview').style.display = 'none';
    }
    CardStack.currentIndex = 1; CardStack.updatePositions();
    setTimeout(() => {
        if (!checkinMap) checkinMap = Maps.createMap('mapPreview', 0, 0, 16);
        if (watchId) navigator.geolocation.clearWatch(watchId); watchId = null;
        updateLoc(c.location.lat, c.location.lng);
    }, 300);
};

// --- Settings & Data Management ---
document.getElementById('exportCSV').onclick = () => {
    const data = Storage.getAllCheckins();
    if (!data.length) return showToast('No hay datos', 'normal');
    const csv = 'lat,lng,date,time,note\n' + data.map(c => {
        const d = new Date(c.timestamp);
        return `${c.location.lat},${c.location.lng},${d.toLocaleDateString()},${d.toLocaleTimeString()},"${(c.note || '').replace(/"/g, '""')}"`;
    }).join('\n');
    downloadFile(csv, 'yeah_backup.csv', 'text/csv');
    showToast('CSV descargado');
};

document.getElementById('exportJSON').onclick = () => {
    const data = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        checkins: Storage.getAllCheckins()
    };
    if (!data.checkins.length) return showToast('No hay datos', 'normal');
    downloadFile(JSON.stringify(data, null, 2), `yeah_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    showToast('Copia JSON descargada');
};

document.getElementById('exportICal').onclick = () => {
    const data = Storage.getAllCheckins();
    if (!data.length) return showToast('No hay datos', 'normal');
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Yeah App//NONSGML v1.0//EN\n";
    data.forEach(c => {
        const d = new Date(c.timestamp).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        // Nombre del evento: "Estoy en" + placeName o coordenadas, seguido de " - Yeah¡"
        const eventName = c.placeName
            ? `Estoy en ${c.placeName} - Yeah¡`
            : `Estoy en ${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)} - Yeah¡`;

        // Ubicación: nombre del lugar o coordenadas en texto
        const locationText = c.placeName || `${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}`;

        // Descripción: notas si existen
        const description = c.note || '';

        ics += "BEGIN:VEVENT\n" +
               `UID:${c.id}@yeah.app\nDTSTAMP:${d}\nDTSTART:${d}\n` +
               `SUMMARY:${eventName}\n` +
               `LOCATION:${locationText}\n` +
               `DESCRIPTION:${description}\n` +
               `GEO:${c.location.lat};${c.location.lng}\nEND:VEVENT\n`;
    });
    ics += "END:VCALENDAR";
    downloadFile(ics, 'yeah_calendar.ics', 'text/calendar');
    showToast('Calendario descargado');
};

document.getElementById('importJSON').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result.trim());
            const checkinsToImport = Array.isArray(data) ? data : (data.checkins || []);
            if (Array.isArray(checkinsToImport) && checkinsToImport.length > 0) {
                if (confirm(`¿Importar ${checkinsToImport.length} Yeahs? Se fusionarán con los actuales.`)) {
                    checkinsToImport.forEach(c => Storage.saveCheckin(c));
                    showToast('¡Datos importados correctamente!', 'success');
                    setTimeout(() => location.reload(), 1500);
                }
            } else {
                showToast('No se encontraron datos válidos', 'error');
            }
        } catch (err) { showToast('Error al leer el archivo JSON', 'error'); }
        e.target.value = '';
    };
    reader.readAsText(file);
};

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

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
            <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span class="date-time">${dF.format(new Date(c.timestamp))} • ${tF.format(new Date(c.timestamp))}</span>
                 ${c.photo ? '<span style="font-size:1.2rem;">📷</span>' : ''}
            </div>
            ${c.placeName ? `<p class="note-text" style="font-weight:600;">📍 ${c.placeName}</p>` : ''}
            ${c.note ? `<p class="note-text" style="opacity:0.8;font-size:0.95rem;margin-top:0.3rem;">${c.note}</p>` : ''}
            ${!c.placeName && !c.note ? '<p class="note-text" style="opacity:0.5">Sin detalles</p>' : ''}
        </div>
    `).join('');
}

window.showDetails = (id) => {
    const c = Storage.getCheckin(id); if(!c) return;
    const dF = new Intl.DateTimeFormat('es-ES', {dateStyle:'full', timeStyle:'short'});
    
    const photoContainer = document.getElementById('detailsPhotoContainer');
    const photoImg = document.getElementById('detailsPhoto');
    if (c.photo) {
        photoImg.src = c.photo;
        photoContainer.style.display = 'block';
    } else {
        photoContainer.style.display = 'none';
    }

    document.getElementById('detailsInfo').innerHTML = `
        <p style="font-size:0.9rem; color:#90A4AE; font-weight:600; margin-bottom:0.5rem">${dF.format(new Date(c.timestamp))}</p>
        ${c.placeName ? `<p style="font-size:1.2rem; color:#37474F; font-weight:700; margin-bottom:0.5rem">📍 ${c.placeName}</p>` : ''}
        ${c.note ? `<p style="font-size:1.1rem; color:#546E7A; margin-bottom:1rem">${c.note}</p>` : ''}
        <p style="font-family:monospace; color:#B0BEC5; font-size:0.85rem">${c.location.lat.toFixed(6)}, ${c.location.lng.toFixed(6)}</p>
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
        detailsMap.eachLayer(layer => { if(layer instanceof L.Marker) detailsMap.removeLayer(layer); });
        Maps.addMarker(detailsMap, c.location.lat, c.location.lng);
    }, 100);
};

window.closeDetails = () => document.getElementById('detailsModal').close();

window.openLastCheckinForPlace = (placeKey) => {
    const checkins = Storage.getAllCheckins();
    // Buscar el último checkin que coincida con este lugar
    const matchingCheckin = checkins.reverse().find(c => {
        if (c.placeName) {
            return c.placeName === placeKey;
        } else {
            const coords = `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`;
            return coords === placeKey;
        }
    });

    if (matchingCheckin) {
        showDetails(matchingCheckin.id);
    }
};

// --- Stats ---
function loadStats() {
    const checkins = Storage.getAllCheckins();
    document.getElementById('statTotal').textContent = checkins.length;
    document.getElementById('statPlaces').textContent = new Set(checkins.map(c => `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`)).size;
    document.getElementById('statPhotos').textContent = checkins.filter(c => c.photo).length;
    document.getElementById('statNotes').textContent = checkins.filter(c => c.note && c.note.trim()).length;
    
    // Agrupar por lugar (usando placeName si existe, si no coordenadas)
    const placeData = {};
    checkins.forEach(c => {
        let key, displayName;
        if (c.placeName) {
            key = c.placeName;
            displayName = c.placeName;
        } else {
            key = `${c.location.lat.toFixed(3)},${c.location.lng.toFixed(3)}`;
            displayName = `${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}`;
        }
        if (!placeData[key]) {
            placeData[key] = { count: 0, displayName: displayName, lastCheckin: c };
        } else {
            placeData[key].lastCheckin = c; // Actualizar con el más reciente
        }
        placeData[key].count++;
    });

    const sortedPlaces = Object.entries(placeData)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

    document.getElementById('topPlaces').innerHTML = sortedPlaces.length ? sortedPlaces.map(([key, data]) =>
        `<div class="top-item clickable-place" onclick="openLastCheckinForPlace('${key.replace(/'/g, "\\'")}')">
            <span>📍 ${data.displayName}</span>
            <span class="place-count-badge">${data.count}</span>
        </div>`).join('') : '<p style="opacity:0.6;text-align:center">Sin datos</p>';

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

// --- Top Places Modal ---
function showTopPlacesModal() {
    const places = Storage.getTopPlaces();
    const list = document.getElementById('topPlacesList');

    list.innerHTML = places.map((place, i) => {
        if (place.name && place.lat && place.lng) {
            return `
                <div class="top-place-item" onclick="selectTopPlace(${i})">
                    <span class="icon">${place.icon}</span>
                    <div class="info">
                        <div class="name">${place.name}</div>
                        <div class="coords">${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="top-place-item empty">
                    <span class="icon">➕</span>
                    <div class="info">
                        <div class="name">Lugar vacío</div>
                        <div class="coords">Configura en Estadísticas</div>
                    </div>
                </div>
            `;
        }
    }).join('');

    document.getElementById('topPlacesModal').showModal();
}

window.closeTopPlaces = () => {
    document.getElementById('topPlacesModal').close();
};

window.selectTopPlace = (index) => {
    const places = Storage.getTopPlaces();
    const place = places[index];

    if (place.name && place.lat && place.lng) {
        closeTopPlaces();

        // Guardar directamente el check-in
        const checkin = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            location: { lat: place.lat, lng: place.lng },
            placeName: place.name,
            note: '',
            photo: null
        };

        Storage.saveCheckin(checkin);

        if ('vibrate' in navigator) navigator.vibrate([50, 100, 50]);
        showToast(`¡Yeah guardado en ${place.name}!`, 'success');

        // Refresh map and stats
        if (mainMap) {
            Maps.addCheckinsToMap(mainMap, Storage.getAllCheckins());
            mainMap.setView([place.lat, place.lng], 16);
        }
        updateQuickStats();
    }
};

// --- Edit Top Places Modal ---
function showEditTopPlacesModal() {
    const places = Storage.getTopPlaces();
    const list = document.getElementById('editTopPlacesList');

    list.innerHTML = places.map((place, i) => {
        const hasData = place.name && place.lat && place.lng;
        return `
            <div class="top-place-item ${hasData ? '' : 'empty'}" onclick="editTopPlace(${i})">
                <span class="icon">${place.icon}</span>
                <div class="info">
                    <div class="name">${hasData ? place.name : 'Lugar vacío - Click para editar'}</div>
                    ${hasData ? `<div class="coords">${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}</div>` : '<div class="coords">Sin configurar</div>'}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('editTopPlacesModal').showModal();
}

window.closeEditTopPlaces = () => {
    document.getElementById('editTopPlacesModal').close();
};

let editingTopPlaceIndex = null;
let selectedTopPlaceLocation = null;

window.editTopPlace = (index) => {
    editingTopPlaceIndex = index;
    selectedTopPlaceLocation = null;

    const places = Storage.getTopPlaces();
    const place = places[index];

    // Pre-fill with existing data
    document.getElementById('topPlaceName').value = place.name || '';
    document.getElementById('topPlaceIcon').value = place.icon || '📍';

    if (place.lat && place.lng) {
        selectedTopPlaceLocation = { name: place.name, lat: place.lat, lng: place.lng };
        showSelectedTopPlaceLocation(place.name, place.lat, place.lng);
    } else {
        document.getElementById('topPlaceSelectedLocation').style.display = 'none';
    }

    // Load visited places
    loadVisitedPlacesForTopPlace();

    // Clear search
    document.getElementById('topPlaceSearch').value = '';
    document.getElementById('topPlaceSearchResults').innerHTML = '';

    // Open modal
    closeEditTopPlaces();
    document.getElementById('editSingleTopPlaceModal').showModal();
};

function loadVisitedPlacesForTopPlace() {
    const checkins = Storage.getAllCheckins();
    const container = document.getElementById('topPlaceVisitedPlaces');

    // Get most visited places
    const placeCounts = {};
    checkins.forEach(c => {
        if (c.placeName) {
            const key = `${c.placeName}|${c.location.lat}|${c.location.lng}`;
            placeCounts[key] = (placeCounts[key] || 0) + 1;
        }
    });

    const sortedPlaces = Object.entries(placeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => {
            const [name, lat, lng] = key.split('|');
            return { name, lat: parseFloat(lat), lng: parseFloat(lng) };
        });

    if (sortedPlaces.length > 0) {
        container.innerHTML = `
            <div style="font-weight:600; font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.5rem; text-transform:uppercase;">Lugares más visitados:</div>
            ${sortedPlaces.map(p => `
                <div class="place-item" onclick="selectVisitedPlaceForTop('${p.name.replace(/'/g, "\\'")}', ${p.lat}, ${p.lng})">
                    📍 ${p.name}
                </div>
            `).join('')}
        `;
    } else {
        container.innerHTML = '<p style="opacity:0.6; text-align:center; font-size:0.9rem;">Aún no tienes lugares visitados</p>';
    }
}

window.selectVisitedPlaceForTop = (name, lat, lng) => {
    selectedTopPlaceLocation = { name, lat, lng };
    showSelectedTopPlaceLocation(name, lat, lng);
    if (!document.getElementById('topPlaceName').value) {
        document.getElementById('topPlaceName').value = name;
    }
};

window.selectSearchedPlaceForTop = (name, lat, lng) => {
    selectedTopPlaceLocation = { name, lat: parseFloat(lat), lng: parseFloat(lng) };
    showSelectedTopPlaceLocation(name, parseFloat(lat), parseFloat(lng));
    if (!document.getElementById('topPlaceName').value) {
        document.getElementById('topPlaceName').value = name;
    }
    document.getElementById('topPlaceSearchResults').innerHTML = '';
    document.getElementById('topPlaceSearch').value = '';
};

function showSelectedTopPlaceLocation(name, lat, lng) {
    document.getElementById('topPlaceSelectedName').textContent = name;
    document.getElementById('topPlaceSelectedCoords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('topPlaceSelectedLocation').style.display = 'block';
}

window.closeEditSingleTopPlace = () => {
    document.getElementById('editSingleTopPlaceModal').close();
    editingTopPlaceIndex = null;
    selectedTopPlaceLocation = null;
};
