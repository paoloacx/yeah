// Widget Bridge - Comunicación entre la web app y widgets de Android

class WidgetBridge {
    constructor() {
        this.isAndroid = window.Capacitor && window.Capacitor.getPlatform() === 'android';
    }

    // Update widget data when checkins change
    async updateWidgets() {
        if (!this.isAndroid) return;

        try {
            const checkins = Storage.getAllCheckins();

            // Update checkins count
            await this.setPreference('checkins_count', checkins.length);

            // Calculate top 3 places
            const topPlaces = this.calculateTopPlaces(checkins);
            await this.setPreference('top_places', JSON.stringify(topPlaces));

            // Trigger widget updates
            await this.broadcastWidgetUpdate();
        } catch (error) {
            console.error('Error updating widgets:', error);
        }
    }

    calculateTopPlaces(checkins) {
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
                placeData[key] = { name: displayName, count: 0 };
            }
            placeData[key].count++;
        });

        // Sort and get top 3
        return Object.values(placeData)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }

    async setPreference(key, value) {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
            await window.Capacitor.Plugins.Preferences.set({ key, value: String(value) });
        }
    }

    async broadcastWidgetUpdate() {
        // Send broadcast to update widgets using Capacitor plugin
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.WidgetPlugin) {
            try {
                await window.Capacitor.Plugins.WidgetPlugin.updateWidgets();
            } catch (error) {
                console.error('Error calling WidgetPlugin:', error);
            }
        }
    }
}

// Create global instance
window.widgetBridge = new WidgetBridge();

// Hook into storage operations to auto-update widgets
const originalSaveCheckin = Storage.saveCheckin;
Storage.saveCheckin = function(checkin) {
    const result = originalSaveCheckin.call(this, checkin);
    if (window.widgetBridge) {
        setTimeout(() => window.widgetBridge.updateWidgets(), 100);
    }
    return result;
};

const originalDeleteCheckin = Storage.deleteCheckin;
Storage.deleteCheckin = function(id) {
    const result = originalDeleteCheckin.call(this, id);
    if (window.widgetBridge) {
        setTimeout(() => window.widgetBridge.updateWidgets(), 100);
    }
    return result;
};
