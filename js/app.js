let mainMap = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Inicializar mapa
    Maps.getCurrentPosition()
        .then(position => {
            mainMap = Maps.createMap('map', position.lat, position.lng);
            loadCheckinsOnMap();
        })
        .catch(error => {
            // Si no hay permisos de ubicación, usar coordenadas por defecto (Madrid)
            console.log('Ubicación no disponible, usando ubicación por defecto');
            mainMap = Maps.createMap('map', 40.4168, -3.7038, 6);
            loadCheckinsOnMap();
        });

    // Botón de check-in
    document.getElementById('checkinBtn').addEventListener('click', () => {
        window.location.href = 'checkin.html';
    });
}

function loadCheckinsOnMap() {
    if (!mainMap) return;

    const checkins = Storage.getAllCheckins();
    
    if (checkins.length > 0) {
        Maps.addCheckinsToMap(mainMap, checkins);
    }
}

// Recargar mapa cuando la página vuelve a estar visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && mainMap) {
        loadCheckinsOnMap();
    }
});
