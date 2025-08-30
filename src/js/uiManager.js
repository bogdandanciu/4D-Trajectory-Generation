class UIManager {
    constructor(state) {
        this.state = state;
    }

    updateFlightInfo(flightData) {
        this.updateElement("completed", Math.round(this.state.f * 10000) / 100);
        // Use the green marker's current position for lat/lon if available
        if (this.state.marker_lat_lon) {
            const pos = this.state.marker_lat_lon.getPosition();
            if (pos) {
                this.updateElement("lat", Math.round(pos.lat() * 100) / 100);
                this.updateElement("lon", Math.round(pos.lng() * 100) / 100);
            }
        } else if (this.state.flight.fi_i != null && !isNaN(this.state.flight.fi_i)) {
            this.updateElement("lat", Math.round(this.state.flight.fi_i * 100) / 100);
        }
        if (!this.state.marker_lat_lon && this.state.flight.lambda_i != null && !isNaN(this.state.flight.lambda_i)) {
            this.updateElement("lon", Math.round(this.state.flight.lambda_i * 100) / 100);
        }
        if (flightData.heading != null && !isNaN(flightData.heading)) {
            this.updateElement("heading", Math.round(flightData.heading * 100) / 100);
        }
        if (this.state.flight.length_in_km != null && this.state.flight.length_in_km >= 0) {
            this.updateElement("length", `${Math.round(this.state.flight.length_in_km * 0.539956803 * 100) / 100} NM`);
        }
        if (flightData.D_passed != null && !isNaN(flightData.D_passed)) {
            this.updateElement("distance", `${Math.round(flightData.D_passed * 100) / 100} NM`);
        }
        if (flightData.T_tot != null && !isNaN(flightData.T_tot)) {
            this.updateElement("total_time", `${Math.round(flightData.T_tot * 100) / 100} min`);
        }
        if (flightData.time_passed != null && !isNaN(flightData.time_passed)) {
            this.updateElement("time_passed", `${Math.round(flightData.time_passed * 100) / 100} min`);
        }
        if (flightData.speed != null && !isNaN(flightData.speed)) {
            this.updateElement("speed", `${Math.round(flightData.speed * 100) / 100} kts`);
        }
        if (flightData.ROC != null && flightData.ROC_text != null && !isNaN(flightData.ROC)) {
            this.updateElement("roc", `${flightData.ROC_text} ${Math.round(flightData.ROC)} ft/min`);
        }
        if (flightData.H != null && !isNaN(flightData.H)) {
            this.updateElement("flight_level", Math.round(flightData.H / 100));
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element && value != null && value !== undefined) {
            element.value = value;
        }
    }

    updateTimeDisplays(timeData) {
        if (timeData) {
            if (this.state.time.departure && timeData.arrival) {
                // Display arrival time from departure time
                const arrTimeString = this.formatTimeForDisplay(timeData.arrival);
                this.updateElement("arr_time", arrTimeString);
            }
            if (this.state.time.arrival && timeData.departure) {
                // Display departure time from arrival time
                const depTimeString = this.formatTimeForDisplay(timeData.departure);
                this.updateElement("dep_time", depTimeString);
            }
            if (timeData.current && (this.state.time.departure || this.state.time.arrival)) {
                const clockString = this.formatTimeForDisplay(timeData.current);
                this.updateElement("clock", clockString);
            }
        }
    }

    formatTimeForDisplay(dateObj) {
        if (!(dateObj instanceof Date)) return "";
        return dateObj.toLocaleString();
    }

    formatTimeForDisplay(dateObj) {
        if (!(dateObj instanceof Date)) return "";

        const pad = n => String(n).padStart(2, "0");

        const hours = pad(dateObj.getHours());
        const minutes = pad(dateObj.getMinutes());
        const seconds = pad(dateObj.getSeconds());
        const day = pad(dateObj.getDate());
        const month = pad(dateObj.getMonth() + 1); // Months are 0-based
        const year = dateObj.getFullYear();

        return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    }
}