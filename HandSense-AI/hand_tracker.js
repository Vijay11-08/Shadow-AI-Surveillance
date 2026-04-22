class HandTracker {
    constructor() {
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
        });
    }

    onResults(callback) {
        this.hands.onResults(callback);
    }

    send(image) {
        this.hands.send({ image });
    }

    static getGesture(landmarks) {
        if (!landmarks) return "NEUTRAL";

        // landmarks: 0 (wrist), 4 (thumb tip), 8 (index tip)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        // 1. Pinch Detection (Thumb and Index tips distance)
        const distPinch = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        if (distPinch < 0.05) return "PINCH";

        // 2. Open Hand Detection (Check distances from wrist)
        const avgDist = (
            Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) +
            Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) +
            Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y) +
            Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y)
        ) / 4;

        if (avgDist > 0.4) return "OPEN";

        return "NEUTRAL";
    }
}
