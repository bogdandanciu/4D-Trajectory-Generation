class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    addListener(target, eventType, handler) {
        const listener = target.addListener(eventType, handler);
        if (!this.listeners.has(target)) {
            this.listeners.set(target, new Map());
        }
        this.listeners.get(target).set(eventType, listener);
    }

    removeAllListeners() {
        this.listeners.forEach(targetListeners => {
            targetListeners.forEach(listener => {
                google.maps.event.removeListener(listener);
            });
        });
        this.listeners.clear();
    }
}

class MapManager {
    constructor(state) {
        this.state = state;
        this.eventManager = new EventManager();
        this.markerCache = new Map();
        this.debounceTimers = new Map();
        this.currentSelectedMarker = null;
        this.markerCluster = null; // MarkerClusterer instance
    }

    initializeMap() {
        this.state.myCenter = new google.maps.LatLng(46.78, 23.68);

        const mapProp = {
            center: this.state.myCenter,
            zoom: 6,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        this.state.map = new google.maps.Map(document.getElementById("googleMap"), mapProp);

        this.setupMapEvents();
        this.createAirportMarkers();
        this.createPolylines();
        this.setupGeometryExtensions();
        
        // Initialize the aircraft marker
        this.state.marker_lat_lon = new google.maps.Marker({
            position: { lat: 45, lng: 23 },
            map: this.state.map,
            icon: 'icons/green-dot.png'
        });
    }

    setupMapEvents() {
        this.eventManager.addListener(
            this.state.map,
            'click',
            this.handleMapClick.bind(this)
        );

        this.eventManager.addListener(
            this.state.map,
            'idle',
            this.debounce(
                () => this.updateVisibleAirports(),
                250
            )
        );
    }

    handleMapClick(event) {
        // Default behavior: place a marker at the clicked location
        if (event && event.latLng) {
            this.placeMarker(event.latLng);
        }
    }

    createAirportMarkers() {
        // Use batch processing for better performance
        const batchSize = 50;
        const totalAirports = airports.length;
        let processed = 0;

        // Ensure state.markers is an array for index-based access
        if (!Array.isArray(this.state.markers)) {
            this.state.markers = [];
        }

        // Remove previous cluster if exists
        if (this.markerCluster) {
            this.markerCluster.clearMarkers();
            this.markerCluster = null;
        }

        const processBatch = () => {
            const end = Math.min(processed + batchSize, totalAirports);
            for (let i = processed; i < end; i++) {
                const airport = airports[i];
                const marker = this.createAirportMarker(airport);
                this.markerCache.set(airport.iata, marker);
                this.state.markers[i] = marker; // Ensure markers are accessible by index
            }
            processed = end;
            if (processed < totalAirports) {
                requestAnimationFrame(processBatch);
            } else {
                // Initialize MarkerClusterer after all markers are created
                this.markerCluster = new MarkerClusterer(this.state.map, this.state.markers, {
                    imagePath: 'icons/m',
                    gridSize: 80,
                    maxZoom: 5,
                    minimumClusterSize: 2
                });
                this.updateVisibleAirports();
            }
        };
        requestAnimationFrame(processBatch);
    }

    createAirportMarker(airport) {
        const marker = new google.maps.Marker({
            position: {
                lat: parseFloat(airport.latitude),
                lng: parseFloat(airport.longitude)
            },
            icon: "icons/black-triangle.png"
        });

        const index = airports.findIndex(a => (a.iata !== null && a.iata === airport.iata) || a.icao === airport.icao);
        if (index !== -1) {
            this.setupAirportMarkerEvents(marker, index);
        }

        return marker;
    }

    updateMarkerIcon(marker, selected) {
        marker.setIcon(selected ? "icons/selected-triangle.png" : "icons/black-triangle.png");
    }

    debounce(func, wait) {
        return (...args) => {
            const timeoutId = this.debounceTimers.get(func);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            this.debounceTimers.set(
                func,
                setTimeout(() => {
                    func.apply(this, args);
                    this.debounceTimers.delete(func);
                }, wait)
            );
        };
    }

    cleanup() {
        this.eventManager.removeAllListeners();
        this.markerCache.forEach(marker => marker.setMap(null));
        this.markerCache.clear();
    }

    setupAirportMarkerEvents(marker, index) {
        const content = `
        <div class="airport-info">
            <div>
                <strong>${airports[index].icao}</strong> 
                ${airports[index].iata ? `, <strong>${airports[index].iata}</strong>` : ``} 
                - ${airports[index].name}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
                ${airports[index].latitude}, ${airports[index].longitude}
            </div>
            <div style="font-size: 11px; color: #666;">
                ${airports[index].country}
            </div>
        </div>`;

        this.state.contentMarker[index] = content;
        this.state.infowindows[index] = new google.maps.InfoWindow({
            content: content,
            maxWidth: 250
        });

        google.maps.event.addListener(marker, 'mouseover', () => {
            this.state.infowindows[index].open(this.state.map, marker);
        });

        google.maps.event.addListener(marker, 'mouseout', () => {
            this.state.infowindows[index].close(this.state.map, marker);
        });

        google.maps.event.addListener(marker, 'click', () => {
            // Reset previous marker's icon if it exists and is different from current marker
            if (this.currentSelectedMarker && this.currentSelectedMarker !== marker) {
                this.updateMarkerIcon(this.currentSelectedMarker, false);
            }

            // Update current marker's icon
            this.updateMarkerIcon(marker, true);
            this.currentSelectedMarker = marker;

            if (this.state.set === 1) {
                // Set as ADEP (airport)
                this.state.selection.departureIndex = index;
                this.state.userADEP = null; // Clear any user marker for ADEP
            } else {
                // Set as ADES (airport)
                this.state.selection.arrivalIndex = index;
                this.state.userADES = null; // Clear any user marker for ADES
            }
            // Trigger update through event system
            this.notifyStateChange();
        });
    }

    createPolylines() {
        this.state.poly = new google.maps.Polyline({
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            map: this.state.map
        });

        this.state.geodesicPoly = new google.maps.Polyline({
            strokeColor: '#CC0099',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            geodesic: true,
            icons: [{ icon: this.createAirplaneIcon(), offset: "100%" }],
            map: this.state.map
        });
    }

    createAirplaneIcon() {
        return {
            path: "M45.985,430.724l-10.248,51.234l62.332,57.969l-3.293,26.145 l-71.345-23.599l-2.001,13.069l-2.057-13.529l-71.278,22.928l-5.762-23.984l64.097-59.271l-8.913-51.359l0.858-114.43 l-21.945-11.338l-189.358,88.76l-1.18-32.262l213.344-180.08l0.875-107.436l7.973-32.005l7.642-12.054l7.377-3.958l9.238,3.65 l6.367,14.925l7.369,30.363v106.375l211.592,182.082l-1.496,32.247l-188.479-90.61l-21.616,10.087l-0.094,115.684",
            scale: 0.0333,
            color: "black",
            strokeColor: '#000099',
            strokeWeight: 2
        };
    }

    updateVisibleAirports() {
        const bounds = this.state.map.getBounds();
        if (!bounds) return;

        this.state.visibleAirportIndexes.clear();

        if (this.state.airportsHidden) {
            // Hide all airport markers and clear cluster
            if (this.state.markers) {
                for (let i = 0; i < this.state.markers.length; i++) {
                    if (this.state.markers[i]) {
                        this.state.markers[i].setMap(null);
                    }
                }
            }
            if (this.markerCluster) {
                this.markerCluster.clearMarkers();
                this.markerCluster.repaint(); // Force update
            }
            return;
        }

        // Show/hide airports based on bounds
        const visibleMarkers = [];
        for (let i = 0; i < airports.length; i++) {
            if (this.state.markers[i]) {
                const lat = parseFloat(airports[i].latitude);
                const lng = parseFloat(airports[i].longitude);
                const latLng = new google.maps.LatLng(lat, lng);
                const shouldBeVisible = bounds.contains(latLng);
                if (shouldBeVisible) {
                    this.state.markers[i].setMap(this.state.map);
                    visibleMarkers.push(this.state.markers[i]);
                    this.state.visibleAirportIndexes.add(i);
                } else {
                    this.state.markers[i].setMap(null);
                }
            }
        }
        // Update clusterer with only visible markers
        if (this.markerCluster) {
            // Make sure all visible markers are on the map before clustering
            visibleMarkers.forEach(m => m.setMap(this.state.map));
            this.markerCluster.clearMarkers();
            this.markerCluster.addMarkers(visibleMarkers);
            this.markerCluster.repaint(); // Force update
        }
    }

    placeMarker(location) {
        // Ensure coordinates array exists
        if (!this.state.markers.coordinates) {
            this.state.markers.coordinates = [];
        }
        if (typeof this.state.markers.count !== 'number') {
            this.state.markers.count = 0;
        }

        const marker = new google.maps.Marker({
            position: location,
            map: this.state.map,
            icon: 'icons/red-dot.png',
        });
        marker.isUserPlaced = true; // Custom property to identify user-placed markers

        const infowindow = new google.maps.InfoWindow({
            content: `Latitude: ${location.lat()}<br>Longitude: ${location.lng()}`
        });
        infowindow.open(this.state.map, marker);

        this.state.markers.coordinates[this.state.markers.count] = { lat: location.lat(), lng: location.lng(), marker };
        this.state.markers.count++;

        this.updateMarkerText();
        this.addUserPlacedMarkerEvents(marker);
    }

    addUserPlacedMarkerEvents(marker) {
        let clickTimeout = null;
        // Single click: set as ADEP or ADES, but only if not followed by double click
        google.maps.event.addListener(marker, 'click', () => {
            if (clickTimeout) return; // Prevent multiple timers
            clickTimeout = setTimeout(() => {
                // If a selected airport marker exists for this role, reset its icon
                if (this.state.set === 1) {
                    if (this.state.selection.departureIndex !== null && this.state.selection.departureIndex >= 0 && this.state.markers[this.state.selection.departureIndex]) {
                        this.updateMarkerIcon(this.state.markers[this.state.selection.departureIndex], false);
                    }
                    this.state.selection.departureIndex = null;
                    this.state.userADEP = marker;
                } else {
                    if (this.state.selection.arrivalIndex !== null && this.state.selection.arrivalIndex >= 0 && this.state.markers[this.state.selection.arrivalIndex]) {
                        this.updateMarkerIcon(this.state.markers[this.state.selection.arrivalIndex], false);
                    }
                    this.state.selection.arrivalIndex = null;
                    this.state.userADES = marker;
                }
                this.notifyStateChange();
                clickTimeout = null;
            }, 250); // Wait to see if dblclick happens
        });
        // Double click: remove marker and cancel single click
        google.maps.event.addListener(marker, 'dblclick', () => {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }
            marker.setMap(null);
            // Remove from coordinates array and update count
            if (this.state && this.state.markers && Array.isArray(this.state.markers.coordinates)) {
                const pos = marker.getPosition();
                const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
                const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
                for (let i = 0; i < this.state.markers.coordinates.length; i++) {
                    if (this.state.markers.coordinates[i].lat === lat && this.state.markers.coordinates[i].lng === lng) {
                        this.state.markers.coordinates.splice(i, 1);
                        this.state.markers.count = this.state.markers.coordinates.length;
                        break;
                    }
                }
            }
            // If this marker was set as userADEP or userADES, clear it
            if (this.state.userADEP === marker) this.state.userADEP = null;
            if (this.state.userADES === marker) this.state.userADES = null;
            this.updateMarkerText();
            this.notifyStateChange();
        });
    }

    removeMarkerFromArrays(marker) {
        for (let i = 0; i < this.state.markers.coordinates.length; i++) {
            if (marker.position.lat() === this.state.markers.coordinates[i].lat &&
                marker.position.lng() === this.state.markers.coordinates[i].lng) {
                this.state.markers.count--;
                this.state.markers.coordinates.splice(i, 1);
                break;
            }
        }
    }

    updateMarkerText() {
        let text = '';
        for (let i = 0; i < this.state.markers.count; i++) {
            text += `${this.state.markers.coordinates[i].lat} ${this.state.markers.coordinates[i].lng} \n`;
        }
        document.getElementById('inputTextToSave').value = text;
    }

    setupGeometryExtensions() {
        google.maps.LatLng.prototype.kmTo = function (a) {
            const e = Math, ra = e.PI / 180;
            const b = this.lat() * ra, c = a.lat() * ra, d = b - c;
            const g = this.lng() * ra - a.lng() * ra;
            const f = 2 * e.asin(e.sqrt(e.pow(e.sin(d / 2), 2) + e.cos(b) * e.cos(c) * e.pow(e.sin(g / 2), 2)));
            return f * 6378.137;
        };

        google.maps.Polyline.prototype.inKm = function (n) {
            const a = this.getPath(n), len = a.getLength();
            let dist = 0;
            for (let i = 0; i < len - 1; i++) {
                dist += a.getAt(i).kmTo(a.getAt(i + 1));
            }
            return dist;
        };
    }

    notifyStateChange() {
        // Trigger update event
        document.dispatchEvent(new CustomEvent('stateChanged'));
    }
}