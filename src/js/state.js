class ApplicationState {
    constructor() {
        this.markers = {
            coordinates: [], // Array of {lat, lng} objects
            count: 0
        };

        this.time = {
            departure: null, // JS Date object
            arrival: null,   // JS Date object
            elapsed: 0
        };

        this.flight = {
            speed: FLIGHT_CONSTANTS.DEFAULT_SPEED,
            altitude: 0,
            heading: 0,
            length_in_km: 0,
            time_in_min: 0,
            fi_i: 0,
            lambda_i: 0
        };

        this.route = {
            departureAirport: null, // index or object
            arrivalAirport: null,   // index or object
            waypoints: [],
            path: null
        };

        this.selection = {
            departureIndex: -1,
            arrivalIndex: -1,
            prevDepartureIndex: -1,
            prevArrivalIndex: -1
        };
        this.animationStep = 0;

        this.contentMarker = [];
        this.infowindows = [];
        this.poly = null;
        this.geodesicPoly = null;
        this.set = 1;
        this.f = 0.5;
        this.map = null;
        this.marker_lat_lon = null;
        this.myCenter = null;
        this.visibleAirportIndexes = new Set();
        this.airportsHidden = false;
        this.aircraftInfoWindow = null;
    }
}