const Export = {
    // Exportar a CSV
    toCSV() {
        const checkins = Storage.getAllCheckins();
        
        if (checkins.length === 0) {
            alert('No hay check-ins para exportar');
            return;
        }

        const headers = ['Fecha', 'Hora', 'Lugar', 'Latitud', 'Longitud', 'Nota'];
        const rows = checkins.map(checkin => {
            const date = new Date(checkin.timestamp);
            return [
                date.toLocaleDateString('es-ES'),
                date.toLocaleTimeString('es-ES'),
                checkin.place ? checkin.place.name : 'Ubicación GPS',
                checkin.location.lat,
                checkin.location.lng,
                checkin.note ? `"${checkin.note.replace(/"/g, '""')}"` : ''
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(blob, `yeah-checkins-${this.getDateString()}.csv`);
    },

    // Exportar a iCal
    toICal() {
        const checkins = Storage.getAllCheckins();
        
        if (checkins.length === 0) {
            alert('No hay check-ins para exportar');
            return;
        }

        const events = checkins.map(checkin => {
            const date = new Date(checkin.timestamp);
            const dateStr = this.formatICalDate(date);
            const placeName = checkin.place ? checkin.place.name : 'Check-in GPS';
            const description = [
                checkin.note || '',
                `Coordenadas: ${checkin.location.lat}, ${checkin.location.lng}`
            ].filter(Boolean).join('\\n');

            return [
                'BEGIN:VEVENT',
                `UID:${checkin.id}@yeah-app`,
                `DTSTAMP:${dateStr}`,
                `DTSTART:${dateStr}`,
                `DTEND:${dateStr}`,
                `SUMMARY:Yeah! ${placeName}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${checkin.location.lat},${checkin.location.lng}`,
                'END:VEVENT'
            ].join('\r\n');
        });

        const icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Yeah App//Check-ins//ES',
            'CALSCALE:GREGORIAN',
            ...events,
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
        this.downloadFile(blob, `yeah-checkins-${this.getDateString()}.ics`);
    },

    // Exportar a JSON (backup completo)
    toJSON() {
        const data = Storage.exportData();
        
        if (data.checkins.length === 0) {
            alert('No hay check-ins para exportar');
            return;
        }

        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        this.downloadFile(blob, `yeah-backup-${this.getDateString()}.json`);
    },

    // Formatear fecha para iCal (formato: YYYYMMDDTHHmmssZ)
    formatICalDate(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return [
            date.getUTCFullYear(),
            pad(date.getUTCMonth() + 1),
            pad(date.getUTCDate()),
            'T',
            pad(date.getUTCHours()),
            pad(date.getUTCMinutes()),
            pad(date.getUTCSeconds()),
            'Z'
        ].join('');
    },

    // Obtener string de fecha para nombres de archivo
    getDateString() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return [
            now.getFullYear(),
            pad(now.getMonth() + 1),
            pad(now.getDate())
        ].join('-');
    },

    // Descargar archivo
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
