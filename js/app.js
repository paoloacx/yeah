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

document.addEventListener('DOMContentLoaded', () => {
    CardStack.init();
    initTopoBackground();
});

// --- Topographic Background ---
function initTopoBackground() {
    const canvas = document.getElementById('topoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Create a height map with multiple noise layers
    const heightMap = [];
    const cols = 150;
    const rows = 150;
    
    for (let y = 0; y < rows; y++) {
        heightMap[y] = [];
        for (let x = 0; x < cols; x++) {
            let height = 0;
            // Multiple octaves of Perlin-like noise
            height += Math.sin(x * 0.05 + y * 0.03) * 20;
            height += Math.sin(x * 0.1 + y * 0.08) * 10;
            height += Math.sin(x * 0.2 + y * 0.15) * 5;
            height += Math.cos(x * 0.03 + y * 0.05) * 15;
            heightMap[y][x] = height;
        }
    }
    
    let time = 0;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        
        const scaleX = canvas.width / cols;
        const scaleY = canvas.height / rows;
        
        // Draw contour lines at different elevation levels
        for (let elevation = -50; elevation < 50; elevation += 3) {
            ctx.beginPath();
            
            for (let y = 0; y < rows - 1; y++) {
                for (let x = 0; x < cols - 1; x++) {
                    const h1 = heightMap[y][x] + Math.sin(time * 0.001 + x * 0.1) * 2;
                    const h2 = heightMap[y][x + 1] + Math.sin(time * 0.001 + (x + 1) * 0.1) * 2;
                    const h3 = heightMap[y + 1][x] + Math.sin(time * 0.001 + x * 0.1) * 2;
                    const h4 = heightMap[y + 1][x + 1] + Math.sin(time * 0.001 + (x + 1) * 0.1) * 2;
                    
                    // Check if contour line passes through this cell
                    const corners = [h1, h2, h3, h4];
                    const minH = Math.min(...corners);
                    const maxH = Math.max(...corners);
                    
                    if (elevation >= minH && elevation <= maxH) {
                        // Draw contour segment
                        const px = x * scaleX;
                        const py = y * scaleY;
                        
                        if (h1 <= elevation && h2 > elevation) {
                            const t = (elevation - h1) / (h2 - h1);
                            ctx.lineTo(px + t * scaleX, py);
                        }
                        if (h2 <= elevation && h4 > elevation) {
                            const t = (elevation - h2) / (h4 - h2);
                            ctx.lineTo(px + scaleX, py + t * scaleY);
                        }
                        if (h3 <= elevation && h4 > elevation) {
                            const t = (elevation - h3) / (h4 - h3);
                            ctx.lineTo(px + t * scaleX, py + scaleY);
                        }
                        if (h1 <= elevation && h3 > elevation) {
                            const t = (elevation - h1) / (h3 - h1);
                            ctx.lineTo(px, py + t * scaleY);
                        }
                    }
                }
            }
            ctx.stroke();
        }
        
        time++;
        requestAnimationFrame(animate);
    }
    animate();
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
    document.getElementById('cardTitleCheckin').textContent = 'Nuevo Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Guardar Yeah¡';
    document.getElementById('placeNote').value = '';
    document.getElementById('photoInput').value = '';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoPreview').src = '#';
    document.getElementById('placeSearch').value = '';
    document.getElementById('placeResults').innerHTML = '';
    
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
        });
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
    document.getElementById('placeNote').value = (document.getElementById('placeNote').value + ' ' + name).trim();
    document.getElementById('placeResults').innerHTML = '';
    updateLoc(parseFloat(lat), parseFloat(lng));
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
        note: document.getElementById('placeNote').value.trim(),
        photo: currentPhoto
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
    editingId = id; currentPos = c.location; currentPhoto = c.photo || null;
    document.getElementById('cardTitleCheckin').textContent = 'Editando Yeah¡';
    document.getElementById('saveCheckin').textContent = 'Actualizar Yeah¡';
    document.getElementById('placeNote').value = c.note || '';
    
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
        ics += "BEGIN:VEVENT\n" +
               `UID:${c.id}@yeah.app\nDTSTAMP:${d}\nDTSTART:${d}\nSUMMARY:Yeah¡ aquí\n` +
               `DESCRIPTION:${c.note || ''}\nGEO:${c.location.lat};${c.location.lng}\nEND:VEVENT\n`;
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
            ${c.note ? `<p class="note-text">${c.note}</p>` : '<p class="note-text" style="opacity:0.5">Sin nota</p>'}
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
    document.getElementById('statPhotos').textContent = checkins.filter(c => c.photo).length;
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
