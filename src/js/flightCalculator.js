class FlightCalculator {
    constructor(constants) {
        this.constants = constants;
    }

    calculateDistances() {
        const c = this.constants;
        return {
            D_ic: c.IAS_ic / (60 / c.T_ic),
            D_c1: c.IAS_c1 / (60 / c.T_c1),
            D_c2: c.IAS_c2 / (60 / (9000 / c.ROC_c2)),
            D_d: c.IAS_d / (60 / c.T_d),
            D_a: c.IAS_a / (60 / (10000 / 1500)),
            D_mc: (589 * c.Mach_mc) / (60 / c.T_mc),
            D_id: (589 * c.Mach_id) / (60 / c.T_id)
        };
    }

    calculateFlightProfile(totalDistance) {
        const distances = this.calculateDistances();
        const D_total = totalDistance * 0.539956803; // km to NM

        if (D_total <= distances.D_ic + distances.D_c1 + distances.D_c2 + distances.D_d + distances.D_a) {
            return this.calculateShortFlight(D_total, distances);
        } else if (D_total <= this.constants.THRESHOLD_1) {
            return this.calculateMediumFlight(D_total, distances);
        } else if (D_total <= this.constants.THRESHOLD_2) {
            return this.calculateLongFlight(D_total, distances);
        } else {
            return this.calculateVeryLongFlight(D_total, distances);
        }
    }

    calculateShortFlight(D_total, distances) {
        // For very short flights, simplified profile
        const D_cr = Math.max(0, D_total - (distances.D_ic + distances.D_c1 + distances.D_c2 + distances.D_d + distances.D_a));
        const T_cr = D_cr / this.constants.IAS_cr * 60;
        const T_tot = this.constants.T_ic + this.constants.T_c1 + 
                     (9000 / this.constants.ROC_c2) + T_cr + 
                     this.constants.T_d + (10000 / 1500);

        return {
            type: 'short',
            D_ic: distances.D_ic,
            D_c1: distances.D_c1,
            D_c2: distances.D_c2,
            D_cr: D_cr,
            D_d: distances.D_d,
            D_a: distances.D_a,
            T_tot: T_tot,
            D_tot: D_total,
            H_ic: this.constants.H_ic,
            H_c1: this.constants.H_c1,
            H_c2: this.constants.H_c2,
            H_cr: this.constants.H_cr,
            H_d: this.constants.H_d,
            H_a: this.constants.H_a
        };
    }

    calculateMediumFlight(D_total, distances) {
        // Medium flight with cruise
        const D_cr = D_total - (distances.D_ic + distances.D_c1 + distances.D_c2 + distances.D_d + distances.D_a);
        const T_cr = D_cr / this.constants.IAS_cr * 60;
        const T_tot = this.constants.T_ic + this.constants.T_c1 + 
                     (9000 / this.constants.ROC_c2) + T_cr + 
                     this.constants.T_d + (10000 / 1500);

        return {
            type: 'medium',
            D_ic: distances.D_ic,
            D_c1: distances.D_c1,
            D_c2: distances.D_c2,
            D_cr: D_cr,
            D_d: distances.D_d,
            D_a: distances.D_a,
            T_cr: T_cr,
            T_tot: T_tot,
            D_tot: distances.D_ic + distances.D_c1 + distances.D_c2 + D_cr + distances.D_d + distances.D_a,
            H_ic: this.constants.H_ic,
            H_c1: this.constants.H_c1,
            H_c2: this.constants.H_c2,
            H_cr: this.constants.H_cr,
            H_d: this.constants.H_d,
            H_a: this.constants.H_a
        };
    }

    calculateLongFlight(D_total, distances) {
        // Long flight with mach climb
        return this.calculateComplexFlight(D_total, distances, 'long');
    }

    calculateVeryLongFlight(D_total, distances) {
        // Very long flight at FL410
        return this.calculateComplexFlight(D_total, distances, 'very_long');
    }

    calculateComplexFlight(D_total, distances, type) {
        let H_mc = this.constants.H_mc;
        let H_cr = H_mc;
        let IAS_cr;
        
        if (type === 'long') {
            // Calculate mach climb altitude based on distance
            const delta = (675.2792976 * this.constants.Mach_mc - 29.4897816 * this.constants.Mach_cr + 0.00393197088 * this.constants.H_cr * this.constants.Mach_mc) * 
                         (675.2792976 * this.constants.Mach_mc - 29.4897816 * this.constants.Mach_cr + 0.00393197088 * this.constants.H_cr * this.constants.Mach_mc) - 
                         4 * (0 - 0.00393197088 * this.constants.Mach_mc) * 
                         (5.064594732e6 * this.constants.Mach_cr - 675.2792976 * this.constants.H_cr * this.constants.Mach_mc - 30000 * (D_total - (distances.D_ic + distances.D_c1 + distances.D_c2 + distances.D_d + distances.D_a)));

            if (delta >= 0) {
                H_mc = (0 - (675.2792976 * this.constants.Mach_mc - 29.4897816 * this.constants.Mach_cr + 0.00393197088 * this.constants.H_cr * this.constants.Mach_mc) + Math.sqrt(delta)) / (2 * (0 - this.constants.Mach_mc * 0.00393197088));
            }
            
            const FL_mc = H_mc / 100;
            if (FL_mc >= 360) {
                H_mc = (D_total - 215.8) * 30000 / (574 * 0.79) + 24000;
                if (H_mc > 41000) H_mc = 41000;
            }
            
            H_cr = H_mc;
            IAS_cr = 573 * 0.78;
        } else {
            // Very long flight
            H_cr = 41000;
            IAS_cr = 0.78 * 605;
        }
        
        const T_mc = (H_mc - 24000) / 1000;
        const D_mc = 589 * 0.78 / 60 * T_mc;
        const D_id = D_mc;
        
        const D_cr = D_total - (distances.D_ic + distances.D_c1 + distances.D_c2 + D_mc + D_id + distances.D_d + distances.D_a);
        const T_cr = D_cr / IAS_cr * 60;
        const T_tot = this.constants.T_ic + this.constants.T_c1 + 
                     (9000 / this.constants.ROC_c2) + T_mc + T_cr + T_mc + 
                     this.constants.T_d + (10000 / 1500);

        return {
            type,
            D_ic: distances.D_ic,
            D_c1: distances.D_c1,
            D_c2: distances.D_c2,
            D_mc: D_mc,
            D_cr: D_cr,
            D_id: D_id,
            D_d: distances.D_d,
            D_a: distances.D_a,
            T_mc: T_mc,
            T_cr: T_cr,
            T_tot: T_tot,
            D_tot: distances.D_ic + distances.D_c1 + distances.D_c2 + D_mc + D_cr + D_id + distances.D_d + distances.D_a,
            H_ic: this.constants.H_ic,
            H_c1: this.constants.H_c1,
            H_c2: this.constants.H_c2,
            H_mc: H_mc,
            H_cr: H_cr,
            H_id: this.constants.H_id,
            H_d: this.constants.H_d,
            H_a: this.constants.H_a
        };
    }

    getFlightDataAtPosition(flightProfile, position) {
        const phaseData = this.determineFlightPhase(flightProfile, position);
        return {
            speed: this.calculateSpeedAtPosition(phaseData, flightProfile),
            altitude: this.calculateAltitudeAtPosition(phaseData, flightProfile),
            roc: this.calculateROCAtPosition(phaseData),
            timeElapsed: this.calculateTimeAtPosition(phaseData, flightProfile, position),
            H: this.calculateAltitudeAtPosition(phaseData, flightProfile),
            time_passed: this.calculateTimeAtPosition(phaseData, flightProfile, position)
        };
    }

    determineFlightPhase(flightProfile, position) {
        const D_passed = flightProfile.D_tot * position;
        
        if (flightProfile.type === 'medium' || flightProfile.type === 'short') {
            if (D_passed < flightProfile.D_ic) {
                return { phase: 'initial_climb', progress: D_passed / flightProfile.D_ic };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1) {
                return { phase: 'climb1', progress: (D_passed - flightProfile.D_ic) / flightProfile.D_c1 };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2) {
                return { phase: 'climb2', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1) / flightProfile.D_c2 };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_cr) {
                return { phase: 'cruise', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2) / flightProfile.D_cr };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_cr + flightProfile.D_d) {
                return { phase: 'descent', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_cr) / flightProfile.D_d };
            } else {
                return { phase: 'approach', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_cr - flightProfile.D_d) / flightProfile.D_a };
            }
        } else {
            // Long/very long flight phases
            if (D_passed < flightProfile.D_ic) {
                return { phase: 'initial_climb', progress: D_passed / flightProfile.D_ic };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1) {
                return { phase: 'climb1', progress: (D_passed - flightProfile.D_ic) / flightProfile.D_c1 };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2) {
                return { phase: 'climb2', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1) / flightProfile.D_c2 };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc) {
                return { phase: 'mach_climb', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2) / flightProfile.D_mc };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc + flightProfile.D_cr) {
                return { phase: 'cruise', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc) / flightProfile.D_cr };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc + flightProfile.D_cr + flightProfile.D_id) {
                return { phase: 'initial_descent', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc - flightProfile.D_cr) / flightProfile.D_id };
            } else if (D_passed < flightProfile.D_ic + flightProfile.D_c1 + flightProfile.D_c2 + flightProfile.D_mc + flightProfile.D_cr + flightProfile.D_id + flightProfile.D_d) {
                return { phase: 'descent', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc - flightProfile.D_cr - flightProfile.D_id) / flightProfile.D_d };
            } else {
                return { phase: 'approach', progress: (D_passed - flightProfile.D_ic - flightProfile.D_c1 - flightProfile.D_c2 - flightProfile.D_mc - flightProfile.D_cr - flightProfile.D_id - flightProfile.D_d) / flightProfile.D_a };
            }
        }
    }

    calculateSpeedAtPosition(phaseData, flightProfile) {
        switch (phaseData.phase) {
            case 'initial_climb':
                return this.constants.IAS_ic;
            case 'climb1':
                return this.constants.IAS_c1;
            case 'climb2':
                return this.constants.IAS_c2;
            case 'mach_climb':
                const H = flightProfile.H_c2 + (flightProfile.H_mc - flightProfile.H_c2) * phaseData.progress;
                if (H >= 40000) return this.constants.Mach_mc * 573;
                if (H >= 35000) return this.constants.Mach_mc * 574;
                if (H >= 30000) return this.constants.Mach_mc * 589;
                if (H >= 25000) return this.constants.Mach_mc * 602;
                if (H >= 20000) return this.constants.Mach_mc * 614;
                return 589 * this.constants.Mach_mc;
            case 'cruise':
                return flightProfile.type === 'medium' ? this.constants.IAS_cr : 573 * 0.78;
            case 'initial_descent':
                const H_desc = flightProfile.H_cr - (flightProfile.H_cr - this.constants.H_id) * phaseData.progress;
                if (H_desc >= 40000) return this.constants.Mach_id * 573;
                if (H_desc >= 35000) return this.constants.Mach_id * 574;
                if (H_desc >= 30000) return this.constants.Mach_id * 589;
                if (H_desc >= 25000) return this.constants.Mach_id * 602;
                if (H_desc >= 20000) return this.constants.Mach_id * 614;
                return 589 * this.constants.Mach_id;
            case 'descent':
                return this.constants.IAS_d;
            case 'approach':
                return this.constants.IAS_a;
            default:
                return this.constants.IAS_cr;
        }
    }

    calculateAltitudeAtPosition(phaseData, flightProfile) {
        switch (phaseData.phase) {
            case 'initial_climb':
                return this.constants.ROC_ic * (phaseData.progress * this.constants.T_ic);
            case 'climb1':
                return flightProfile.H_ic + this.constants.ROC_c1 * (phaseData.progress * this.constants.T_c1);
            case 'climb2':
                return flightProfile.H_c1 + this.constants.ROC_c2 * (phaseData.progress * (9000 / this.constants.ROC_c2));
            case 'mach_climb':
                return flightProfile.H_c2 + (flightProfile.H_mc - flightProfile.H_c2) * phaseData.progress;
            case 'cruise':
                return flightProfile.H_cr;
            case 'initial_descent':
                return flightProfile.H_cr - (flightProfile.H_cr - this.constants.H_id) * phaseData.progress;
            case 'descent':
                return this.constants.H_id + (-this.constants.ROD_d) * (phaseData.progress * this.constants.T_d);
            case 'approach':
                return this.constants.H_d + (-this.constants.ROD_a) * (phaseData.progress * (10000 / 1500));
            default:
                return flightProfile.H_cr || this.constants.H_cr;
        }
    }

    calculateROCAtPosition(phaseData) {
        switch (phaseData.phase) {
            case 'initial_climb':
                return this.constants.ROC_ic;
            case 'climb1':
                return this.constants.ROC_c1;
            case 'climb2':
                return this.constants.ROC_c2;
            case 'mach_climb':
                return this.constants.ROC_mc;
            case 'cruise':
                return 0;
            case 'initial_descent':
                return -this.constants.ROC_id;
            case 'descent':
                return -this.constants.ROD_d;
            case 'approach':
                return -this.constants.ROD_a;
            default:
                return 0;
        }
    }

    calculateTimeAtPosition(phaseData, flightProfile, position) {
        const time_passed = flightProfile.T_tot * position;
        return time_passed;
    }
}