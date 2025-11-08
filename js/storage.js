const Storage = {
    CHECKINS_KEY: 'yeah_checkins',

    // Obtener todos los check-ins
    getAllCheckins() {
        const data = localStorage.getItem(this.CHECKINS_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Guardar un nuevo check-in
    saveCheckin(checkin) {
        const checkins = this.getAllCheckins();
        checkins.push(checkin);
        localStorage.setItem(this.CHECKINS_KEY, JSON.stringify(checkins));
        return checkin;
    },

    // Obtener un check-in por ID
    getCheckin(id) {
        const checkins = this.getAllCheckins();
        return checkins.find(c => c.id === id);
    },

    // Actualizar un check-in
    updateCheckin(id, updatedData) {
        const checkins = this.getAllCheckins();
        const index = checkins.findIndex(c => c.id === id);
        if (index !== -1) {
            checkins[index] = { ...checkins[index], ...updatedData };
            localStorage.setItem(this.CHECKINS_KEY, JSON.stringify(checkins));
            return checkins[index];
        }
        return null;
    },

    // Eliminar un check-in
    deleteCheckin(id) {
        let checkins = this.getAllCheckins();
        checkins = checkins.filter(c => c.id !== id);
        localStorage.setItem(this.CHECKINS_KEY, JSON.stringify(checkins));
        return true;
    },

    // Obtener estadísticas básicas
    getStats() {
        const checkins = this.getAllCheckins();
        const uniquePlaces = new Set(
            checkins
                .filter(c => c.place)
                .map(c => c.place.name)
        ).size;

        return {
            total: checkins.length,
            uniquePlaces: uniquePlaces,
            withPhotos: checkins.filter(c => c.photo).length,
            withNotes: checkins.filter(c => c.note).length
        };
    },

    // Exportar todos los datos
    exportData() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            checkins: this.getAllCheckins()
        };
    },

    // Importar datos
    importData(data) {
        if (data.checkins && Array.isArray(data.checkins)) {
            localStorage.setItem(this.CHECKINS_KEY, JSON.stringify(data.checkins));
            return true;
        }
        return false;
    },

    // Limpiar todos los datos
    clearAll() {
        localStorage.removeItem(this.CHECKINS_KEY);
    }
};
