// Global variables
let camera, video, mirrored = false;
let videoWidth, videoHeight, videoRatio;
let smallestWindowDimension = Math.min(window.innerWidth, window.innerHeight);
const canvasContainer = document.getElementsByClassName('canvas_container')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const previewElement = document.getElementsByClassName('preview_image')[0];
const meta_info = document.getElementsByClassName('meta_info')[0];
const canvasCtx = canvasElement.getContext('2d');
const facingMode = ['user', 'environment'];
let facingModeIndex = 0;

// Function to start the camera
function startCamera() {
    const mode = facingMode[facingModeIndex];
    video = document.createElement('video');
    video.setAttribute('playsinline', 'true');

    let firstFrame = true;
    camera = new Camera(video, {
        onFrame: async () => {
            if (firstFrame) {
                firstFrame = false;
                videoWidth = video.videoWidth;
                videoHeight = video.videoHeight;
                videoRatio = videoWidth / videoHeight;
                canvasContainer.style.backgroundImage = 'url(./passport-mask.png)';
                resizeOutput();
                meta_info.textContent = `${mode}, ${video.videoWidth}, ${video.videoHeight}`;
            }
            await selfieSegmentation.send({ image: video });
        },
        facingMode: mode,
        width: 720,
        height: 720
    });
    camera.start();

    // Adjust UI elements
    document.querySelectorAll('.step-capture').forEach(show);
    document.querySelectorAll('.step-intro').forEach(hide);
}

function toggleMirror() {
    mirrored = !mirrored;
    canvasElement.style.transform = mirrored ? 'scaleX(-1)' : 'none';
}

// Utility functions for showing and hiding elements
function hide(el) { el.style.display = 'none'; }
function show(el) { el.style.display = 'block'; }

// Function to resize output based on window dimensions
function resizeOutput() {
    smallestWindowDimension = Math.min(window.innerWidth, window.innerHeight);
    canvasElement.style.height = `${smallestWindowDimension}px`;
    canvasElement.style.width = `${smallestWindowDimension * videoRatio}px`;

    canvasContainer.style.width = `${smallestWindowDimension}px`;
    canvasContainer.style.height = `${smallestWindowDimension}px`;

    canvasElement.height = videoHeight;
    canvasElement.width = videoWidth;
}

// Initialize the selfie segmentation
const selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
    }
});
selfieSegmentation.setOptions({
    selfieMode: true,
    modelSelection: 0,
});
selfieSegmentation.onResults(onResults);

// Function to handle selfie segmentation results
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.drawImage(results.segmentationMask, 0, 0, videoWidth, videoHeight);

    // Only overwrite existing pixels.
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    canvasCtx.restore();
}
// Function to flip the camera between front and back
function flipCamera() {
    stopCamera();
    facingModeIndex = (facingModeIndex + 1) % facingMode.length;
    startCamera();
}

// Function to capture a photo with countdown
function capturePhoto() {
    let seconds = 3;  // Countdown from 3 seconds
    let interval = 0;

    const timer = document.createElement('div');
    timer.style = `position:absolute;font-size:160px;color:white;top:${smallestWindowDimension / 2}px;margin-top:-80px;text-align:center;width:100%;`;
    timer.textContent = seconds;
    document.body.appendChild(timer);

    const countdown = function () {
        seconds -= 1;
        timer.textContent = seconds;
        if (seconds === 0) {
            takePhoto();
            window.clearInterval(interval);
            timer.remove();
        }
    }
    interval = window.setInterval(countdown, 1000);
}

// Function to take a photo
function takePhoto() {
    const outputSize = 600;  // Set the desired output size for the photo
    const img = new Image();

    img.onload = function () {
        const imageHeight = img.height;
        const imageWidth = img.width;
        canvasElement.height = outputSize;
        canvasElement.width = outputSize;
        canvasCtx.save(); // Save canvas transform state before doing horizontal flip
        canvasCtx.clearRect(0, 0, outputSize, outputSize); // Reset canvas
        canvasCtx.rect(0, 0, outputSize, outputSize); // Paint white background so it's not transparent
        canvasCtx.fillStyle = 'white';
        canvasCtx.fill();
        if (mirrored) {
            canvasCtx.translate(outputSize, 0);
            canvasCtx.scale(-1, 1);
        }
        // Draw the image onto the canvas, cropping to a square based on the smaller dimension
        canvasCtx.drawImage(img, (imageWidth - imageHeight) / 2, 0, imageHeight, imageHeight, 0, 0, outputSize, outputSize);
        canvasCtx.restore();
        const dataURL = canvasElement.toDataURL();
        previewElement.src = dataURL;
        resizeOutput();
        document.querySelectorAll('.step-download').forEach(show);
        document.querySelectorAll('.step-capture').forEach(hide);
        canvasContainer.style.backgroundImage = 'none';
        stopCamera();
    }
    img.src = canvasElement.toDataURL();
}
// Function to retake the photo
function retakePhoto() {
    startCamera();
    document.querySelectorAll('.step-download').forEach(hide);
    document.querySelectorAll('.step-capture').forEach(show);
    canvasContainer.style.backgroundImage = 'url(./passport-mask.png)';
}

// Function to download the captured photo
function downloadPhoto() {
    const dataURL = canvasElement.toDataURL('image/png'); // Assume the canvas has the image we want to download
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'webcam-passport-photo.png'; // The default filename for downloading
    document.body.appendChild(a); // Append the anchor to body
    a.click(); // Simulate click on the anchor
    document.body.removeChild(a); // Remove the anchor from the body
}
// Function to resize the output canvas to fit the video feed
function resizeOutput() {
    smallestWindowDimension = Math.min(window.innerWidth, window.innerHeight);
    canvasElement.style.height = `${smallestWindowDimension}px`;
    canvasElement.style.width = `${smallestWindowDimension * videoRatio}px`;

    canvasContainer.style.width = `${smallestWindowDimension}px`;
    canvasContainer.style.height = `${smallestWindowDimension}px`;

    canvasElement.height = videoHeight;
    canvasElement.width = videoWidth;
}

// Function to handle selfie segmentation results
function onResults(results) {
    // Assuming results.segmentationMask is the mask and results.image is the video frame
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
    canvasCtx.drawImage(results.segmentationMask, 0, 0, videoWidth, videoHeight);

    // Only overwrite existing pixels
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

    canvasCtx.restore();
}

// Function to stop the camera
function stopCamera() {
    if (camera) {
        camera.stop();
    }
    if (video) {
        video.pause();
        video.srcObject = null;
        if (video.parentNode) {
            video.parentNode.removeChild(video);
        }
        video = null;
    }
}

// Expose the new functions to the global scope for Blazor to call
window.resizeOutput = resizeOutput;
window.onResults = onResults;
window.stopCamera = stopCamera;
// Expose the new functions to the global scope for Blazor to call
window.retakePhoto = retakePhoto;
window.downloadPhoto = downloadPhoto;
// Expose the new functions to the global scope
window.flipCamera = flipCamera;
window.capturePhoto = capturePhoto;
// Expose necessary functions to the global scope
window.startCamera = startCamera;
window.toggleMirror = toggleMirror;

// Additional functions like stopCamera, capturePhoto, etc., need to be implemented based on the initial logic provided.