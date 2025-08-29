class PlotManager {
    constructor() {
        this.plotInitialized = false;
    }

    updateFlightPlot(flightProfile, currentPosition) {
        const layout = this.getPlotLayout();
        const plotData = this.generatePlotData(flightProfile);
        const currentPositionData = this.getCurrentPositionData(flightProfile, currentPosition);

        const TESTER = document.getElementById('tester');

        if (this.plotInitialized) {
            try {
                Plotly.deleteTraces(TESTER, 0);
                Plotly.deleteTraces(TESTER, 0);
            } catch (e) {
                // Do nothing if traces don't exist
            }
        } else {
            this.plotInitialized = true;
        }

        Plotly.newPlot("tester", [plotData], layout);
        Plotly.plot(TESTER, [currentPositionData], layout);
    }

    getPlotLayout() {
        const element = document.getElementById("tester");
        return {
            width: element.offsetWidth,
            height: element.offsetHeight,
            margin: { l: 25, r: 1, b: 25, t: 1, pad: 1 }
        };
    }

    generatePlotData(flightProfile) {
        // Generate x,y data based on flight profile type
        switch (flightProfile.type) {
            case 'short':
            case 'medium':
                return this.getMediumFlightPlotData(flightProfile);
            case 'long':
            case 'very_long':
                return this.getLongFlightPlotData(flightProfile);
            default:
                return this.getDefaultPlotData(flightProfile);
        }
    }

    getMediumFlightPlotData(profile) {
        const x = [
            0,
            profile.D_ic,
            profile.D_ic + profile.D_c1,
            profile.D_ic + profile.D_c1 + profile.D_c2,
            profile.D_ic + profile.D_c1 + profile.D_c2,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_cr,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_cr + profile.D_d,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_cr + profile.D_d + profile.D_a
        ];
        
        const y = [
            0,
            profile.H_ic,
            profile.H_c1,
            profile.H_c2,
            profile.H_cr,
            profile.H_cr,
            profile.H_d,
            profile.H_a
        ];

        return {
            x: x,
            y: y,
            name: 'Track',
            type: 'scatter',
            mode: 'lines'
        };
    }

    getLongFlightPlotData(profile) {
        const x = [
            0,
            profile.D_ic,
            profile.D_ic + profile.D_c1,
            profile.D_ic + profile.D_c1 + profile.D_c2,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_mc,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_mc + profile.D_cr,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_mc + profile.D_cr + profile.D_id,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_mc + profile.D_cr + profile.D_id + profile.D_d,
            profile.D_ic + profile.D_c1 + profile.D_c2 + profile.D_mc + profile.D_cr + profile.D_id + profile.D_d + profile.D_a
        ];
        
        const y = [
            0,
            profile.H_ic,
            profile.H_c1,
            profile.H_c2,
            profile.H_mc,
            profile.H_cr,
            profile.H_id,
            profile.H_d,
            profile.H_a
        ];

        return {
            x: x,
            y: y,
            name: 'Track',
            type: 'scatter',
            mode: 'lines'
        };
    }

    getDefaultPlotData(profile) {
        return {
            x: [0, 100],
            y: [0, 24000],
            name: 'Track',
            type: 'scatter',
            mode: 'lines'
        };
    }

    getCurrentPositionData(flightProfile, position) {
        // Calculate current altitude based on position
        let currentAltitude = 0;
        const D_passed = flightProfile.D_tot * position;
        
        if (flightProfile.type === 'medium' || flightProfile.type === 'short') {
            if (D_passed < flightProfile.D_ic) {
                currentAltitude = (D_passed / flightProfile.D_ic) * flightProfile.H_ic;
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1) {
                currentAltitude = flightProfile.H_ic + ((D_passed - flightProfile.D_ic) / flightProfile.D_c1) * (flightProfile.H_c1 - flightProfile.H_ic);
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2) {
                currentAltitude = flightProfile.H_c1 + ((D_passed - flightProfile.D_ic - flightProfile.D_c1) / flightProfile.D_c2) * (flightProfile.H_c2 - flightProfile.H_c1);
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_cr) {
                currentAltitude = flightProfile.H_cr;
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_cr + flightProfile.D_d) {
                const descProgress = (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_cr) / flightProfile.D_d;
                currentAltitude = flightProfile.H_cr + descProgress * (flightProfile.H_d - flightProfile.H_cr);
            } else {
                const appProgress = (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_cr - flightProfile.D_d) / flightProfile.D_a;
                currentAltitude = flightProfile.H_d + appProgress * (flightProfile.H_a - flightProfile.H_d);
            }
        } else {
            // Long flight calculation
            if (D_passed < flightProfile.D_ic) {
                currentAltitude = (D_passed / flightProfile.D_ic) * flightProfile.H_ic;
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1) {
                currentAltitude = flightProfile.H_ic + ((D_passed - flightProfile.D_ic) / flightProfile.D_c1) * (flightProfile.H_c1 - flightProfile.H_ic);
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2) {
                currentAltitude = flightProfile.H_c1 + ((D_passed - flightProfile.D_ic - flightProfile.D_c1) / flightProfile.D_c2) * (flightProfile.H_c2 - flightProfile.H_c1);
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc) {
                const machProgress = (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2) / flightProfile.D_mc;
                currentAltitude = flightProfile.H_c2 + machProgress * (flightProfile.H_mc - flightProfile.H_c2);
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc + flightProfile.D_cr) {
                currentAltitude = flightProfile.H_cr;
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc + flightProfile.D_cr + flightProfile.D_id) {
                const idProgress = (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc - flightProfile.D_cr) / flightProfile.D_id;
                currentAltitude = flightProfile.H_cr + idProgress * (flightProfile.H_id - flightProfile.H_cr);
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc + flightProfile.D_cr + flightProfile.D_id + flightProfile.D_d) {
                const descProgress = (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc - flightProfile.D_cr - flightProfile.D_id) / flightProfile.D_d;
                currentAltitude = flightProfile.H_id + descProgress * (flightProfile.H_d - flightProfile.H_id);
            } else {
                const appProgress = (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc - flightProfile.D_cr - flightProfile.D_id - flightProfile.D_d) / flightProfile.D_a;
                currentAltitude = flightProfile.H_d + appProgress * (flightProfile.H_a - flightProfile.H_d);
            }
        }

        return {
            x: [D_passed],
            y: [Math.max(0, currentAltitude)],
            name: 'A/C pos',
            type: 'scatter',
            mode: 'markers',
            marker: { color: 'red', size: 8 }
        };
    }
}