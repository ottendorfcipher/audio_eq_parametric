// ReaEQ Plugin

// Get DOM elements
const audioFileInput = document.getElementById('audio-file');
const playButton = document.getElementById('play-button');
const eqContainer = document.getElementById('eq-container');
const addBandButton = document.getElementById('add-band-button');
const hpfSlider = document.getElementById('hpf-slider');
const hpfInput = document.getElementById('hpf-input');
const lpfSlider = document.getElementById('lpf-slider');
const lpfInput = document.getElementById('lpf-input');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const canvasContext = spectrumCanvas.getContext('2d');

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

            // Connect last EQ filter to destination
            lastNode.connect(audioContext.destination);
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

    // Draw EQ bands
    canvasContext.strokeStyle = 'red';
    canvasContext.lineWidth = 2;
    canvasContext.beginPath();
    eqBands.forEach((band, index) => {
        const freq = band.freq;
        const gain = band.gain;
        const x = (freq / eqParams.maxFrequency) * width;
        const y = height - (gain / eqParams.maxGain) * height;
        if (index === 0) {
            canvasContext.moveTo(x, y);
        } else {
            canvasContext.lineTo(x, y);
        }
    });
    canvasContext.stroke();

    requestAnimationFrame(visualizeSpectrum);
}

// Add EQ band
function addEqBand() {
    const band = {
        freq: eqParams.defaultFrequency,
        gain: eqParams.defaultGain,
        q: eqParams.defaultQ,
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
    const band = eqBands[index];

    const bandDiv = document.createElement('div');
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

        audioSource.connect(hpfFilter);
        hpfFilter.connect(lpfFilter);

        let lastNode = lpfFilter;
        eqFilters.forEach(filter => {
            lastNode.connect(filter);
            lastNode = filter;
        });

        lastNode.connect(analyzer);
        lastNode.connect(audioContext.destination);
    }
}

// Update HPF and LPF values
function updateFilterValues() {
    hpfFilter.frequency.value = hpfSlider.value;
    hpfInput.value = hpfSlider.value;

    lpfFilter.frequency.value = lpfSlider.value;
    lpfInput.value = lpfSlider.value;
}

// Event listeners
audioFileInput.addEventListener('change', () => {
    const file = audioFileInput.files[0];
    loadAudioFile(file);
    });
    
    playButton.addEventListener('click', () => {
    playAudio();
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
    
    
