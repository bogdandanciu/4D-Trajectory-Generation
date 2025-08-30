class FlightTrajectoryApp {
    constructor() {
        this.state = new ApplicationState();
        this.state.userADEP = null;
        this.state.userADES = null;
        this.flightCalculator = new FlightCalculator(FLIGHT_CONSTANTS);
        this.mapManager = new MapManager(this.state);
        this.uiManager = new UIManager(this.state);
        this.plotManager = new PlotManager();
        this.timeCalculator = new TimeCalculator(this.state);
        this.animationManager = new AnimationManager(this.state);
        this.updateTimeout = null;
        this.isDragging = false;
        this.setupEventListeners();
    }

    initialize() {
        this.initializeUI();
        this.mapManager.initializeMap();
        this.update();
    }

    initializeUI() {
        document.getElementById('inputTextToSave').value = '';
        document.getElementById('inputFileNameToSaveAs').value = 'coordinates.txt';
    }

    setupEventListeners() {
        document.addEventListener('stateChanged', () => this.update());
        window.addEventListener('resize', () => this.throttledUpdate());
    }

    // Add throttled update method to prevent excessive updates
    throttledUpdate() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(() => this.update(), 16); // ~60fps
    }

    update() {
        if (this.state.selection.departureIndex >= 0 && this.state.selection.arrivalIndex >= 0) {
            this.updateFlightPath();
            const flightProfile = this.calculateFlightProfile();
            const flightData = this.calculateCurrentFlightData(flightProfile);
            const timeData = this.timeCalculator.calculateTimeDisplays(flightData);

            this.uiManager.updateFlightInfo(flightData);
            this.uiManager.updateTimeDisplays(timeData);
            this.plotManager.updateFlightPlot(flightProfile, this.state.f);
            this.updateAircraftPosition(flightData);
        } else {
            this.clearDisplays();
        }
    }

    clearDisplays() {
        const clearElements = ["lat", "lon", "heading", "length", "distance", "total_time", "time_passed", "speed", "roc", "flight_level"];
        clearElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = "";
        });
        this.state.userADEP = null;
        this.state.userADES = null;
    }

    updateFlightPath() {
        // Use user-placed marker or airport marker for each role as set
        let depPos = null, arrPos = null;
        if (this.state.userADEP) {
            depPos = this.state.userADEP.getPosition();
        } else if (this.state.selection.departureIndex !== null && this.state.selection.departureIndex >= 0) {
            depPos = this.state.markers[this.state.selection.departureIndex].getPosition();
        }
        if (this.state.userADES) {
            arrPos = this.state.userADES.getPosition();
        } else if (this.state.selection.arrivalIndex !== null && this.state.selection.arrivalIndex >= 0) {
            arrPos = this.state.markers[this.state.selection.arrivalIndex].getPosition();
        }

        if (depPos && arrPos) {
            this.state.route.path = [depPos, arrPos];
            this.state.poly.setPath(this.state.route.path);
            this.state.geodesicPoly.setPath(this.state.route.path);
            this.animationManager.startAnimation(this.state.geodesicPoly);
            this.state.flight.length_in_km = this.state.geodesicPoly.inKm();
            // Always update green marker position and state
            this.updateAircraftPosition();
        }
    }

    calculateFlightProfile() {
        return this.flightCalculator.calculateFlightProfile(this.state.flight.length_in_km);
    }

    calculateCurrentFlightData(flightProfile) {
        const baseData = this.flightCalculator.getFlightDataAtPosition(flightProfile, this.state.f);
        let heading = 0;
        if (this.state.route.path && this.state.route.path.length >= 2) {
            heading = google.maps.geometry.spherical.computeHeading(this.state.route.path[0], this.state.route.path[1]);
        }
        this.state.flight.heading = heading;
        this.state.flight.fi_i = this.state.fi_i;
        this.state.flight.lambda_i = this.state.lambda_i;
        return {
            ...baseData,
            ...flightProfile,
            heading,
            D_passed: flightProfile.D_tot * this.state.f,
            ROC_text: baseData.roc >= 0 ? "ROC" : "ROD",
            ROC: Math.abs(baseData.roc)
        };
    }

    updateAircraftPosition(flightData) {
        //Don't update position when the user is dragging the marker
        if (this.isDragging) {
            return;
        }

        // Use the current route endpoints for interpolation
        let depPos = null, arrPos = null;
        if (this.state.userADEP) {
            depPos = this.state.userADEP.getPosition();
        } else if (this.state.selection.departureIndex !== null && this.state.selection.departureIndex >= 0) {
            depPos = this.state.markers[this.state.selection.departureIndex].getPosition();
        }
        if (this.state.userADES) {
            arrPos = this.state.userADES.getPosition();
        } else if (this.state.selection.arrivalIndex !== null && this.state.selection.arrivalIndex >= 0) {
            arrPos = this.state.markers[this.state.selection.arrivalIndex].getPosition();
        }

        // If both endpoints are set, interpolate position
        let position = { lat: 45, lng: 23 };
        if (depPos && arrPos) {
            // Spherical interpolation between depPos and arrPos
            const lat1 = depPos.lat();
            const lon1 = depPos.lng();
            const lat2 = arrPos.lat();
            const lon2 = arrPos.lng();
            const f = this.state.f;
            // Convert to radians
            const lat1r = lat1 * Math.PI / 180;
            const lon1r = lon1 * Math.PI / 180;
            const lat2r = lat2 * Math.PI / 180;
            const lon2r = lon2 * Math.PI / 180;
            const fi = Math.abs(lat1r - lat2r);
            const lambda = Math.abs(lon1r - lon2r);
            const a = Math.pow(Math.sin(fi / 2), 2) + Math.cos(lat1r) * Math.cos(lat2r) * Math.pow(Math.sin(lambda / 2), 2);
            const c = 2 * Math.atan(Math.sqrt(a / (1 - a)));
            const A = Math.sin((1 - f) * c) / Math.sin(c);
            const B = Math.sin(f * c) / Math.sin(c);
            const x = A * Math.cos(lat1r) * Math.cos(lon1r) + B * Math.cos(lat2r) * Math.cos(lon2r);
            const y = A * Math.cos(lat1r) * Math.sin(lon1r) + B * Math.cos(lat2r) * Math.sin(lon2r);
            const z = A * Math.sin(lat1r) + B * Math.sin(lat2r);
            const fi_i = Math.atan(z / Math.sqrt(x * x + y * y)) * 180 / Math.PI;
            const lambda_i = Math.atan2(y, x) * 180 / Math.PI;
            position = { lat: fi_i, lng: lambda_i };
            this.state.flight.fi_i = fi_i;
            this.state.flight.lambda_i = lambda_i;
        }

        // Update position instead of recreating marker to prevent blinking
        if (this.state.marker_lat_lon) {
            this.state.marker_lat_lon.setPosition({ lat: position.lat, lng: position.lng });
            if (!this.state.marker_lat_lon.getDraggable()) {
                this.state.marker_lat_lon.setDraggable(true);
            }
            if (!this.state.marker_lat_lon.eventsSetup) {
                this.setupAircraftMarkerEvents(flightData);
                this.state.marker_lat_lon.eventsSetup = true;
            }
        } else {
            this.state.marker_lat_lon = new google.maps.Marker({
                position: { lat: position.lat, lng: position.lng },
                map: this.state.map,
                draggable: true,
                icon: 'icons/green-dot.png'
            });
            this.setupAircraftMarkerEvents(flightData);
            this.state.marker_lat_lon.eventsSetup = true;
        }
    }

    calculateIntermediatePosition() {
        if (this.state.selection.departureIndex < 0 || this.state.selection.arrivalIndex < 0) return { lat: 45, lng: 23 };
        const lat1 = airports[this.state.selection.departureIndex].latitude * Math.PI / 180;
        const lon1 = airports[this.state.selection.departureIndex].longitude * Math.PI / 180;
        const lat2 = airports[this.state.selection.arrivalIndex].latitude * Math.PI / 180;
        const lon2 = airports[this.state.selection.arrivalIndex].longitude * Math.PI / 180;

        // Spherical interpolation calculation
        const fi = Math.abs(lat1 - lat2);
        const lambda = Math.abs(lon1 - lon2);
        const a = Math.pow(Math.sin(fi / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(lambda / 2), 2);
        const c = 2 * Math.atan(Math.sqrt(a / (1 - a)));
        const A = Math.sin((1 - this.state.f) * c) / Math.sin(c);
        const B = Math.sin(this.state.f * c) / Math.sin(c);
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);
        this.state.flight.fi_i = Math.atan(z / Math.sqrt(x * x + y * y)) * 180 / Math.PI;
        this.state.flight.lambda_i = Math.atan(y / x) * 180 / Math.PI;
        return { lat: this.state.flight.fi_i, lng: this.state.flight.lambda_i };
    }

    setupAircraftMarkerEvents(flightData) {
        // Create a persistent InfoWindow that gets updated content
        if (!this.state.aircraftInfoWindow) {
            this.state.aircraftInfoWindow = new google.maps.InfoWindow();
        }

        // Set up the drag event handler directly without depending on closure variables
        google.maps.event.addListener(this.state.marker_lat_lon, 'mouseover', () => {
            // Update content dynamically when hovering
            const currentFlightData = this.getCurrentFlightDataForInfoWindow();
            this.state.aircraftInfoWindow.setContent(this.createAircraftInfoContent(currentFlightData));
            this.state.aircraftInfoWindow.open(this.state.map, this.state.marker_lat_lon);
        });

        google.maps.event.addListener(this.state.marker_lat_lon, 'mouseout', () => {
            this.state.aircraftInfoWindow.close();
        });

        // Add drag start event to prevent position updates during drag
        google.maps.event.addListener(this.state.marker_lat_lon, 'dragstart', () => {
            this.isDragging = true;
        });

        // Set up drag event with proper reference to the class instance
        google.maps.event.addListener(this.state.marker_lat_lon, 'dragend', () => {
            this.isDragging = false;
            this.handleAircraftDrag();
        });
    }

    getCurrentFlightDataForInfoWindow() {
        // Get current flight data for info window
        if (this.state.selection.departureIndex >= 0 && this.state.selection.arrivalIndex >= 0) {
            const flightProfile = this.calculateFlightProfile();
            return this.calculateCurrentFlightData(flightProfile);
        }
        return null;
    }

    createAircraftInfoContent(flightData) {
        if (!flightData) return "No route selected";
        // Get the values directly from the UI for lat/lon
        let latStr = $('#lat').val();
        let lonStr = $('#lon').val();
        // Fallback if not available
        if (!latStr || isNaN(parseFloat(latStr))) {
            latStr = (this.state.marker_lat_lon && this.state.marker_lat_lon.getPosition) ? (Math.round(this.state.marker_lat_lon.getPosition().lat() * 100) / 100) : '';
        }
        if (!lonStr || isNaN(parseFloat(lonStr))) {
            lonStr = (this.state.marker_lat_lon && this.state.marker_lat_lon.getPosition) ? (Math.round(this.state.marker_lat_lon.getPosition().lng() * 100) / 100) : '';
        }
        return `Lat: ${latStr} Lon: ${lonStr}<br/>` +
            `Heading: ${Math.round(flightData.heading * 100) / 100}<br/>` +
            `Length: ${Math.round(this.state.flight.length_in_km * 0.539956803 * 100) / 100} NM ` +
            `Distance: ${Math.round(flightData.D_passed * 100) / 100} NM<br/>` +
            `Total Time: ${Math.round(flightData.T_tot * 100) / 100} ` +
            `Time passed: ${Math.round(flightData.time_passed * 100) / 100} min<br/>` +
            `Flight Completed: ${Math.round(this.state.f * 10000) / 100}%<br/>` +
            `IAS: ${Math.round(flightData.speed * 100) / 100} ${flightData.ROC_text} ${flightData.ROC}<br/>` +
            `FL: ${Math.round(flightData.H / 100)}`;
    }

    handleAircraftDrag() {
        // Get the current route endpoints (can be airport or red marker)
        let depPos = null, arrPos = null;
        if (this.state.userADEP) {
            depPos = this.state.userADEP.getPosition();
        } else if (this.state.selection.departureIndex !== null && this.state.selection.departureIndex >= 0) {
            depPos = this.state.markers[this.state.selection.departureIndex].getPosition();
        }
        if (this.state.userADES) {
            arrPos = this.state.userADES.getPosition();
        } else if (this.state.selection.arrivalIndex !== null && this.state.selection.arrivalIndex >= 0) {
            arrPos = this.state.markers[this.state.selection.arrivalIndex].getPosition();
        }
        if (!depPos || !arrPos) return;

        // Get current marker position
        const latm = this.state.marker_lat_lon.getPosition().lat();
        const lonm = this.state.marker_lat_lon.getPosition().lng();

        // Convert all points to Cartesian coordinates
        function toCartesian(lat, lon) {
            lat = lat * Math.PI / 180;
            lon = lon * Math.PI / 180;
            return {
                x: Math.cos(lat) * Math.cos(lon),
                y: Math.cos(lat) * Math.sin(lon),
                z: Math.sin(lat)
            };
        }
        const p1 = toCartesian(depPos.lat(), depPos.lng());
        const p2 = toCartesian(arrPos.lat(), arrPos.lng());
        const pm = toCartesian(latm, lonm);

        // Vector from p1 to p2
        const v12 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
        // Vector from p1 to marker
        const v1m = { x: pm.x - p1.x, y: pm.y - p1.y, z: pm.z - p1.z };
        // Project v1m onto v12
        const v12_len2 = v12.x * v12.x + v12.y * v12.y + v12.z * v12.z;
        let t = 0;
        if (v12_len2 > 0) {
            t = (v1m.x * v12.x + v1m.y * v12.y + v1m.z * v12.z) / v12_len2;
        }
        // Clamp t between 0 and 1
        t = Math.max(0, Math.min(1, t));
        this.state.f = t;
        // Update the UI completion percentage when dragging aircraft marker
        document.getElementById("completed").value = Math.round(this.state.f * 10000) / 100;
        this.throttledUpdate();
    }

    setDepartureAirport() {
        this.state.set = 1;
        document.getElementById("ADEP").disabled = true;
        document.getElementById("ADES").disabled = false;
    }

    setArrivalAirport() {
        this.state.set = 2;
        document.getElementById("ADES").disabled = true;
        document.getElementById("ADEP").disabled = false;
    }

    setFlightProgress(percentage) {
        this.state.f = (parseFloat(percentage) / 100) % 1;
        this.update();
    }

    setDepartureTime(dateString) {
        const date = this.parseCustomDate(dateString);
        this.state.time.departure = date;
        this.state.time.arrival = null;
        this.update();
    }

    setArrivalTime(dateString) {
        const date = this.parseCustomDate(dateString);
        this.state.time.arrival = date;
        this.state.time.departure = null;
        this.update();
    }

    parseCustomDate(str) {
        const [time, date] = str.split(" ");
        const [hh, mm, ss] = time.split(":").map(Number);
        const [day, month, year] = date.split("/").map(Number);

        return new Date(year, month - 1, day, hh, mm, ss);
    }

    toggleAirportDisplay() {
        const button = document.getElementById("display_airports");
        const isHiding = button.value === "Hide airports";

        button.value = isHiding ? "Display airports" : "Hide airports";

        this.state.airportsHidden = isHiding;

        if (isHiding) {
            // Hide all airport markers
            Object.values(this.state.markers).forEach(marker => {
                if (marker && typeof marker.setMap === 'function') {
                    marker.setMap(null);
                }
            });
            this.state.visibleAirportIndexes.clear();
            this.mapManager.updateVisibleAirports();
        } else {
            // Show airports based on current bounds
            this.mapManager.updateVisibleAirports();
        }
    }
}

// Global app instance
let app;

// Global functions for HTML event handlers
function loadAirports() {
    app = new FlightTrajectoryApp();
    app.initialize();

    document.getElementById("ADEP").disabled = true;
    document.getElementById("ADES").disabled = false;
}

function ChangeADEP() {
    app.setDepartureAirport();
}

function ChangeADES() {
    app.setArrivalAirport();
}

function change_f() {
    const value = document.getElementById('completed').value;
    app.setFlightProgress(value);
}

function change_time_dep() {
    const date = document.getElementById('dep_time').value;
    app.setDepartureTime(date);
}

function change_time_arr() {
    const date = document.getElementById('arr_time').value;
    app.setArrivalTime(date);
}

function display_airports() {
    app.toggleAirportDisplay();
}

// File operations - keep existing implementation
function saveTextAsFile() {
    const textToSave = document.getElementById("inputTextToSave").value;
    const textToSaveAsBlob = new Blob([textToSave], { type: "text/plain" });
    const textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
    const fileNameToSaveAs = document.getElementById("inputFileNameToSaveAs").value;

    const downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    downloadLink.href = textToSaveAsURL;
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);

    downloadLink.click();
}

function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

function loadFileAsText() {
    const fileToLoad = document.getElementById("fileToLoad").files[0];
    const fileReader = new FileReader();

    fileReader.onload = function (fileLoadedEvent) {
        const textFromFileLoaded = fileLoadedEvent.target.result;
        document.getElementById("inputTextToSave").value = textFromFileLoaded;
    };

    fileReader.readAsText(fileToLoad, "UTF-8");
}