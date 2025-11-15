const Maps = {
    // Crear mapa con Leaflet
    createMap(elementId, lat, lng, zoom = 13) {
        // Limpiar el contenedor antes de crear el mapa
        const container = L.DomUtil.get(elementId);
        if (container != null) {
            container._leaflet_id = null;
        }

        const map = L.map(elementId, {
            preferCanvas: true, // Usar Canvas en lugar de SVG para mejor rendimiento
            zoomControl: true,
            attributionControl: true
        }).setView([lat, lng], zoom);

        // OpenStreetMap con optimizaciones de rendimiento
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18, // Reducido de 19 para menos tiles
            minZoom: 3,
            updateWhenIdle: true, // Solo actualizar cuando el mapa está quieto
            updateWhenZooming: false, // No actualizar durante el zoom (más fluido)
            keepBuffer: 2, // Mantener 2 tiles fuera del viewport (reduce cargas)
            maxNativeZoom: 18
        }).addTo(map);

        return map;
    },

    // Añadir marcador
    addMarker(map, lat, lng, popup = null) {
        const marker = L.marker([lat, lng]).addTo(map);
        if (popup) {
            marker.bindPopup(popup);
        }
        return marker;
    },

    // Añadir todos los check-ins al mapa
    addCheckinsToMap(map, checkins) {
        const markers = [];
        const bounds = [];

        checkins.forEach(checkin => {
            const { lat, lng } = checkin.location;
            bounds.push([lat, lng]);

            const popupContent = `
                <div class="map-popup">
                    <strong>${checkin.place ? checkin.place.name : 'Ubicación GPS'}</strong><br>
                    <small>${new Date(checkin.timestamp).toLocaleDateString('es-ES')}</small>
                    ${checkin.note ? `<br><em>${checkin.note}</em>` : ''}
                </div>
            `;

            const marker = this.addMarker(map, lat, lng, popupContent);
            markers.push(marker);
        });

        // Ajustar vista para mostrar todos los marcadores
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        return markers;
    },

    // Obtener ubicación actual
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no disponible'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },

    // Calcular distancia entre dos puntos (fórmula Haversine)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return distance;
    },

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    // Formatear coordenadas para mostrar
    formatCoordinates(lat, lng) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
};
