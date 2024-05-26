// Parametric EQ

// Get DOM elements
const audioFileInput = document.getElementById('audio-file');
const playButton = document.getElementById('play-button');
const pauseButton = document.getElementById('pause-button');
const stopButton = document.getElementById('stop-button');
const rewindButton = document.getElementById('rewind-button');
const fastForwardButton = document.getElementById('fastforward-button');
const volumeSlider = document.getElementById('volume-slider');
const eqContainer = document.getElementById('eq-container');
const addBandButton = document.getElementById('add-band-button');
const hpfSlider = document.getElementById('hpf-slider');
const hpfInput = document.getElementById('hpf-input');
const lpfSlider = document.getElementById('lpf-slider');
const lpfInput = document.getElementById('lpf-input');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const canvasContext = spectrumCanvas.getContext('2d');
const frequencyLabels = document.getElementById('frequency-labels');
const gainLabels = document.getElementById('gain-labels');

// Create audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// EQ parameters
const eqParams = {
    defaultFrequency: 1000,
    defaultGain: 0,
    defaultQ: 1,
    minFrequency: 20,
    maxFrequency: 20000,
    minGain: -40,
    maxGain: 40,
    minQ: 0.1,
    maxQ: 10,
};

// Create EQ bands
let eqBands = [];

// Create EQ filters
let eqFilters = [];

let audioSource;
let analyzer;
let hpfFilter;
let lpfFilter;
let gainNode;

// Load audio file
function loadAudioFile(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
        audioContext.decodeAudioData(fileReader.result, buffer => {
            if (audioSource) {
                audioSource.disconnect();
            }
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = buffer;

            // Create HPF and LPF filters
            hpfFilter = audioContext.createBiquadFilter();
            hpfFilter.type = 'highpass';
            hpfFilter.frequency.value = hpfSlider.value;

            lpfFilter = audioContext.createBiquadFilter();
            lpfFilter.type = 'lowpass';
            lpfFilter.frequency.value = lpfSlider.value;

            // Create gain node for volume control
            gainNode = audioContext.createGain();
            gainNode.gain.value = volumeSlider.value;

            // Connect audio source to filters
            audioSource.connect(hpfFilter);
            hpfFilter.connect(lpfFilter);

            // Connect EQ filters
            let lastNode = lpfFilter;
            eqFilters.forEach(filter => {
                lastNode.connect(filter);
                lastNode = filter;
            });

            // Create analyzer node
            analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 2048;
            lastNode.connect(analyzer);

            // Connect last EQ filter to gain node and destination
            lastNode.connect(gainNode);
            gainNode.connect(audioContext.destination);
        });
    };
    fileReader.readAsArrayBuffer(file);
}

// Play audio
function playAudio() {
    if (audioSource) {
        audioSource.start(0);
        requestAnimationFrame(visualizeSpectrum);
    }
}

// Pause audio
function pauseAudio() {
    if (audioSource) {
        audioSource.stop();
    }
}

// Stop audio
function stopAudio() {
    if (audioSource) {
        audioSource.stop();
        audioSource.disconnect();
        audioSource = null;
    }
}

// Rewind audio
function rewindAudio() {
    if (audioSource) {
        audioSource.currentTime = 0;
    }
}

// Fast forward audio
function fastForwardAudio() {
    if (audioSource) {
        audioSource.currentTime += 10;
    }
}

// Update volume
function updateVolume() {
    if (gainNode) {
        gainNode.gain.value = volumeSlider.value;
    }
}

// Update EQ band values from UI
function updateEqBand(index, freq, gain, q) {
    eqBands[index].freq = freq;
    eqBands[index].gain = gain;
    eqBands[index].q = q;
    eqFilters[index].frequency.value = freq;
    eqFilters[index].gain.value = gain;
    eqFilters[index].Q.value = q;
}

// Visualize audio spectrum
function visualizeSpectrum() {
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    canvasContext.clearRect(0, 0, width, height);

    analyzer.getByteFrequencyData(dataArray);

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        canvasContext.fillStyle = 'rgb(75, 192, 192)';
        canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }

    // Draw zero gain line
    canvasContext.strokeStyle = 'white';
    canvasContext.lineWidth = 1;
    canvasContext.beginPath();
    canvasContext.moveTo(0, height / 2);
    canvasContext.lineTo(width, height / 2);
    canvasContext.stroke();

    // Draw grid lines
    canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    canvasContext.lineWidth = 1;
    const gridSize = 4;
    for (let i = 1; i < gridSize; i++) {
        const x = (i / gridSize) * width;
        canvasContext.beginPath();
        canvasContext.moveTo(x, 0);
        canvasContext.lineTo(x, height);
        canvasContext.stroke();
    }
    for (let i = 1; i < gridSize; i++) {
        const y = (i / gridSize) * height;
        canvasContext.beginPath();
        canvasContext.moveTo(0, y);
        canvasContext.lineTo(width, y);
        canvasContext.stroke();
    }

    // Draw EQ bands
    eqBands.forEach((band, index) => {
        const freq = band.freq;
        const gain = band.gain;
        const q = band.q;
        const x = (freq / eqParams.maxFrequency) * width;
        const y = height - (gain / eqParams.maxGain) * (height / 2) - (height / 2);

        // Draw band dot
        canvasContext.fillStyle = 'blue';
        canvasContext.beginPath();
        canvasContext.arc(x, y, 5, 0, 2 * Math.PI);
        canvasContext.fill();

        // Draw Q parabola
        const qWidth = (q / eqParams.maxQ) * (width / 10);
        const qHeight = (q / eqParams.maxQ) * (height / 2);
        canvasContext.fillStyle = 'rgba(0, 0, 255, 0.2)';
        canvasContext.beginPath();
        canvasContext.moveTo(x, y);
        canvasContext.quadraticCurveTo(x, y - qHeight, x + qWidth / 2, y);
        canvasContext.quadraticCurveTo(x, y + qHeight, x - qWidth / 2, y);
        canvasContext.closePath();
        canvasContext.fill();
    });

    requestAnimationFrame(visualizeSpectrum);
}

// Add EQ band
function addEqBand() {
    const freq = eqParams.defaultFrequency;
    const gain = eqParams.defaultGain;
    const q = eqParams.defaultQ;

    const band = {
        freq: freq,
        gain: gain,
        q: q,
    };
    eqBands.push(band);

    const filter = audioContext.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = band.freq;
    filter.gain.value = band.gain;
    filter.Q.value = band.q;
    eqFilters.push(filter);

    createEqBandUI(eqBands.length - 1);
    connectFilters();
}

// Delete EQ band
function deleteEqBand(index) {
    eqBands.splice(index, 1);
    eqFilters.splice(index, 1);

    const bandDiv = document.querySelector(`.eq-band[data-index="${index}"]`);
    bandDiv.remove();

    connectFilters();
}

// Create EQ band UI
function createEqBandUI(index) {
    const band = eqBands[index];const bandDiv = document.createElement('div');
    bandDiv.className = 'eq-band';
    bandDiv.setAttribute('data-index', index);
    
    const freqLabel = document.createElement('label');
    freqLabel.textContent = `Frequency ${index + 1}:`;
    const freqSlider = document.createElement('input');
    freqSlider.type = 'range';
    freqSlider.min = eqParams.minFrequency;
    freqSlider.max = eqParams.maxFrequency;
    freqSlider.value = band.freq;
    freqSlider.addEventListener('input', () => {
        updateEqBand(index, Number(freqSlider.value), band.gain, band.q);
        freqInput.value = freqSlider.value;
    });
    const freqInput = document.createElement('input');
    freqInput.type = 'number';
    freqInput.min = eqParams.minFrequency;
    freqInput.max = eqParams.maxFrequency;
    freqInput.value = band.freq;
    freqInput.addEventListener('input', () => {
        updateEqBand(index, Number(freqInput.value), band.gain, band.q);
        freqSlider.value = freqInput.value;
    });
    
    const gainLabel = document.createElement('label');
    gainLabel.textContent = `Gain ${index + 1}:`;
    const gainSlider = document.createElement('input');
    gainSlider.type = 'range';
    gainSlider.min = eqParams.minGain;
    gainSlider.max = eqParams.maxGain;
    gainSlider.value = band.gain;
    gainSlider.addEventListener('input', () => {
        updateEqBand(index, band.freq, Number(gainSlider.value), band.q);
        gainInput.value = gainSlider.value;
    });
    const gainInput = document.createElement('input');
    gainInput.type = 'number';
    gainInput.min = eqParams.minGain;
    gainInput.max = eqParams.maxGain;
    gainInput.value = band.gain;
    gainInput.addEventListener('input', () => {
        updateEqBand(index, band.freq, Number(gainInput.value), band.q);
        gainSlider.value = gainInput.value;
    });
    
    const qLabel = document.createElement('label');
    qLabel.textContent = `Q ${index + 1}:`;
    const qSlider = document.createElement('input');
    qSlider.type = 'range';
    qSlider.min = eqParams.minQ;
    qSlider.max = eqParams.maxQ;
    qSlider.value = band.q;
    qSlider.addEventListener('input', () => {
        updateEqBand(index, band.freq, band.gain, Number(qSlider.value));
        qInput.value = qSlider.value;
    });
    const qInput = document.createElement('input');
    qInput.type = 'number';
    qInput.min = eqParams.minQ;
    qInput.max = eqParams.maxQ;
    qInput.value = band.q;
    qInput.addEventListener('input', () => {
        updateEqBand(index, band.freq, band.gain, Number(qInput.value));
        qSlider.value = qInput.value;
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-band';
    deleteButton.addEventListener('click', () => {
        deleteEqBand(index);
    });
    
    bandDiv.appendChild(freqLabel);
    bandDiv.appendChild(freqSlider);
    bandDiv.appendChild(freqInput);
    bandDiv.appendChild(gainLabel);
    bandDiv.appendChild(gainSlider);
    bandDiv.appendChild(gainInput);
    bandDiv.appendChild(qLabel);
    bandDiv.appendChild(qSlider);
    bandDiv.appendChild(qInput);
    bandDiv.appendChild(deleteButton);
    
    eqContainer.appendChild(bandDiv);
}

// Connect filters
function connectFilters() {
if (audioSource) {
audioSource.disconnect();
hpfFilter.disconnect();
lpfFilter.disconnect();
eqFilters.forEach(filter => filter.disconnect());
analyzer.disconnect();
gainNode.disconnect();    audioSource.connect(hpfFilter);
hpfFilter.connect(lpfFilter);

let lastNode = lpfFilter;
eqFilters.forEach(filter => {
    lastNode.connect(filter);
    lastNode = filter;
});

lastNode.connect(analyzer);
lastNode.connect(gainNode);
gainNode.connect(audioContext.destination);
}
}

// Update HPF and LPF values
function updateFilterValues() {
hpfFilter.frequency.value = hpfSlider.value;
hpfInput.value = hpfSlider.value;lpfFilter.frequency.value = lpfSlider.value;
lpfInput.value = lpfSlider.value;
}

// Create frequency and gain labels
function createLabels() {
const width = spectrumCanvas.width;
const height = spectrumCanvas.height;
const numFrequencyLabels = 10;
const numGainLabels = 6;for (let i = 0; i <= numFrequencyLabels; i++) {
    const freq = (i / numFrequencyLabels) * eqParams.maxFrequency;
    const label = document.createElement('div');
    label.textContent = `${freq.toFixed(0)} Hz`;
    label.style.position = 'absolute';
    label.style.left = `${(i / numFrequencyLabels) * 100}%`;
    label.style.transform = 'translateX(-50%)';
    frequencyLabels.appendChild(label);
}

for (let i = 0; i <= numGainLabels; i++) {
    const gain = (i / numGainLabels) * eqParams.maxGain - eqParams.maxGain / 2;
    const label = document.createElement('div');
    label.textContent = `${gain.toFixed(0)} dB`;
    label.style.position = 'absolute';
    label.style.top = `${(i / numGainLabels) * 100}%`;
    label.style.transform = 'translateY(-50%)';
    gainLabels.appendChild(label);
}
}

// Event listeners
audioFileInput.addEventListener('change', () => {
const file = audioFileInput.files[0];
loadAudioFile(file);
});

playButton.addEventListener('click', () => {
playAudio();
});

volumeSlider.addEventListener('input', () => {
updateVolume();
});

addBandButton.addEventListener('click', () => {
addEqBand();
});

hpfSlider.addEventListener('input', () => {
updateFilterValues();
});

hpfInput.addEventListener('input', () => {
hpfSlider.value = hpfInput.value;
updateFilterValues();
});

lpfSlider.addEventListener('input', () => {
updateFilterValues();
});

lpfInput.addEventListener('input', () => {
lpfSlider.value = lpfInput.value;
updateFilterValues();
});

// Initialize labels
createLabels();