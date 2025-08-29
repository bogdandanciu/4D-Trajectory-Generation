class TimeCalculator {
    constructor(state) {
        this.state = state;
    }

    calculateTimeDisplays(flightData) {
        const timeData = {};
        // If departure is set, calculate arrival and current
        if (this.state.time.departure instanceof Date) {
            timeData.departure = this.state.time.departure;
            timeData.arrival = this.calculateArrivalFromDeparture(flightData);
            timeData.current = this.calculateCurrentFromDeparture(flightData);
        }
        // If arrival is set, calculate departure and current
        else if (this.state.time.arrival instanceof Date) {
            timeData.arrival = this.state.time.arrival;
            timeData.departure = this.calculateDepartureFromArrival(flightData);
            timeData.current = this.calculateCurrentFromArrival(flightData);
        }
        return timeData;
    }

    calculateArrivalFromDeparture(flightData) {
        if (!(this.state.time.departure instanceof Date)) return null;
        // Add total time (in minutes) to departure
        return new Date(this.state.time.departure.getTime() + flightData.T_tot * 60000);
    }

    calculateCurrentFromDeparture(flightData) {
        if (!(this.state.time.departure instanceof Date)) return null;
        // Add time_passed (in minutes) to departure
        return new Date(this.state.time.departure.getTime() + flightData.time_passed * 60000);
    }

    calculateDepartureFromArrival(flightData) {
        if (!(this.state.time.arrival instanceof Date)) return null;
        // Subtract total time (in minutes) from arrival
        return new Date(this.state.time.arrival.getTime() - flightData.T_tot * 60000);
    }

    calculateCurrentFromArrival(flightData) {
        if (!(this.state.time.arrival instanceof Date)) return null;
        // Subtract time_passed (in minutes) from arrival
        return new Date(this.state.time.arrival.getTime() - flightData.time_passed * 60000);
    }

    // Format time for display
    formatTimeForDisplay(dateObj) {
        if (!(dateObj instanceof Date)) return "";
        return dateObj.toLocaleString();
    }

    // Format clock time for current position
    formatClockTime(dateObj) {
        if (!(dateObj instanceof Date)) return "";
        return dateObj.toLocaleString();
    }
}