class AnimationManager {
    constructor(state) {
        this.state = state;
        // Track animation interval to prevent multiples
        this.animationInterval = null;
    }

    startAnimation(polyline) {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }

        let count = 0;
        this.animationInterval = setInterval(() => {
            // Use the correct flight and route properties for length and speed
            const length_in_km = this.state.flight.length_in_km;
            const speed = this.state.flight.speed;
            if (!length_in_km || !speed) return;
            count = (count + 0.08 * (60 / 100) / (length_in_km / speed)) % 200;
            const icons = polyline.get("icons");
            if (icons && icons[0]) {
                icons[0].offset = (count / 2) + "%";
                polyline.set("icons", icons);
            }
        }, 50);
    }

    stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }
}