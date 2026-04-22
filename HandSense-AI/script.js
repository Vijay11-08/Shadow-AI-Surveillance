const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const gestureLabel = document.getElementById('gesture-label');
const fpsCounter = document.getElementById('fps-counter');
const telemetryLog = document.getElementById('telemetry-log');
const binaryStream = document.getElementById('binary-stream');
const threatLevel = document.getElementById('threat-level');

// Tactical UI simulation
function updateTacticalUI() {
    // Update Binary Stream
    let binary = "";
    for(let i=0; i<100; i++) binary += Math.round(Math.random());
    binaryStream.innerText = binary;

    // Random Telemetry
    if(Math.random() > 0.95) {
        const events = [
            "PACKET_CHECK_PASSED",
            "NEURAL_MAP_OPTIMIZED",
            "QUANTUM_SYNC_ACTIVE",
            "BUFFER_CLEARED",
            "THREAD_V4_INITIALIZED"
        ];
        const log = document.createElement('span');
        log.innerText = `> ${events[Math.floor(Math.random()*events.length)]}`;
        telemetryLog.prepend(log);
        if(telemetryLog.children.length > 8) telemetryLog.lastChild.remove();
    }
}

setInterval(updateTacticalUI, 100);

const particleSystem = new ParticleSystem();
const tracker = new HandTracker();

let lastFrameTime = performance.now();
let frameCount = 0;

function updateFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
        fpsCounter.innerText = frameCount;
        frameCount = 0;
        lastFrameTime = now;
    }
}

function onResults(results) {
    // Remove loader on first data
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';

    updateFPS();
    
    // Preparation
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw mirrored tactical background video
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    
    // Set global opacity for the background to match reference style
    canvasCtx.globalAlpha = 0.5;
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.globalAlpha = 1.0;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Multi-hand Neural Web Effect (Reference Style)
        if (results.multiHandLandmarks.length > 1) {
            const h1Indices = [4, 8, 12, 16, 20];
            const h2Indices = [4, 8, 12, 16, 20];
            
            // Draw cross-hand neural strings
            h1Indices.forEach((i1, idx) => {
                const p1 = results.multiHandLandmarks[0][i1];
                const p2 = results.multiHandLandmarks[1][h2Indices[idx]];
                
                for(let j=0; j<5; j++) {
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
                    canvasCtx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
                    canvasCtx.strokeStyle = `hsl(${(Date.now() / 15 + idx*40 + j*10) % 360}, 100%, 50%)`;
                    canvasCtx.lineWidth = 0.5;
                    canvasCtx.globalAlpha = 0.4;
                    canvasCtx.stroke();
                }
            });
        }

        // Individual Hand Processing
        for (const landmarks of results.multiHandLandmarks) {
            const gesture = HandTracker.getGesture(landmarks);
            gestureLabel.innerText = gesture;
            
            // Security Protocol Mapping
            if (gesture === 'PINCH') {
                threatLevel.innerText = "ENCRYPTING...";
                threatLevel.style.color = "#ff007a";
            } else if (gesture === 'OPEN') {
                threatLevel.innerText = "DECODING...";
                threatLevel.style.color = "#00f2fe";
            } else {
                threatLevel.innerText = "MONITORING";
                threatLevel.style.color = "#00ff00";
            }

            gestureLabel.style.color = gesture === 'OPEN' ? '#fff' : (gesture === 'PINCH' ? '#ff007a' : '#00f2fe');

            // Set up drawing styles
            const primaryColor = gesture === 'PINCH' ? '#ff007a' : '#00f2fe';

            // Static Palm Target HUD
            const wrist = landmarks[0];
            const middleMCP = landmarks[9];
            const palmX = (wrist.x + middleMCP.x) / 2 * canvasElement.width;
            const palmY = (wrist.y + middleMCP.y) / 2 * canvasElement.height;
            
            canvasCtx.beginPath();
            canvasCtx.arc(palmX, palmY, 25, 0, Math.PI * 2);
            canvasCtx.strokeStyle = primaryColor;
            canvasCtx.lineWidth = 1;
            canvasCtx.setLineDash([2, 4]);
            canvasCtx.stroke();
            canvasCtx.setLineDash([]);

            // Draw Neon Connections
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: primaryColor,
                lineWidth: 2
            });

            // Draw Landmarks
            drawLandmarks(canvasCtx, landmarks, {
                color: '#fff',
                lineWidth: 1,
                radius: 3
            });

            // Animated Effects
            const indexTip = landmarks[8];
            const px = indexTip.x * canvasElement.width;
            const py = indexTip.y * canvasElement.height;

            // Emit Particles
            particleSystem.emit(px, py, gesture === 'OPEN');

            // Special Circle for Pinch
            if (gesture === 'PINCH') {
                canvasCtx.beginPath();
                canvasCtx.arc(px, py, 40, 0, Math.PI * 2);
                canvasCtx.strokeStyle = '#ff007a';
                canvasCtx.lineWidth = 4;
                canvasCtx.setLineDash([5, 10]);
                canvasCtx.stroke();
                canvasCtx.setLineDash([]);
            }
        }
    } else {
        gestureLabel.innerText = "NO HAND";
    }

    // Update and Draw Particles
    particleSystem.updateAndDraw(canvasCtx);
    
    canvasCtx.restore();
}

tracker.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        await tracker.send(videoElement);
    },
    width: 1280,
    height: 720
});

camera.start();
