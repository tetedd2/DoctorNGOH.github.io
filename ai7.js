// AI1.js - เวอร์ชันรวมปุ่มสาเหตุ/รักษา + ระบบกล้อง + ระบบจำแนก
const URL = "https://teachablemachine.withgoogle.com/models/6HxInDCGD/";
let model, labelContainer, maxPredictions;
let isPredicting = false;
let currentFacingMode = 'environment';
let videoElement, stream;

const messageElement = document.getElementById('message');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const switchCameraButton = document.getElementById('switchCameraButton');
const resultDisplayElement = document.getElementById('resultDisplay');
const actionButtonsDiv = document.getElementById('actionButtons');
const infoButtonsDiv = document.getElementById('infoButtons');
const causeButton = document.getElementById('causeButton');
const treatmentButton = document.getElementById('treatmentButton');

let predictionHistory = [];
const REQUIRED_CONSISTENCY_TIME_MS = 2000;
const REQUIRED_PROBABILITY = 0.9;

function toggleInfoButtons(show) {
    infoButtonsDiv.classList.toggle('hidden', !show);
    actionButtonsDiv.classList.toggle('hidden', show);
}

function showMessage(text, type = '') {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`.trim();
}

function showError(text) {
    showMessage(text, 'error');
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
}

async function init() {
    showMessage('กำลังโหลดโมเดลและตั้งค่ากล้อง...');
    startButton.disabled = true;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    toggleInfoButtons(false);
    resultDisplayElement.innerHTML = '';
    predictionHistory = [];

    async function predict() {
        if (!videoElement || videoElement.readyState < 2) return;
        const prediction = await model.predict(videoElement);
        prediction.sort((a, b) => b.probability - a.probability);
        const top = prediction[0];
        const currentTime = Date.now();
        if (top.probability > 0.7) {
            predictionHistory.push({ className: top.className, probability: top.probability, time: currentTime });
        } else {
            predictionHistory = [];
        }
        predictionHistory = predictionHistory.filter(p => currentTime - p.time <= REQUIRED_CONSISTENCY_TIME_MS);

        const consistent = predictionHistory.length > 0 &&
            predictionHistory.every(p => p.className === top.className && p.probability >= REQUIRED_PROBABILITY) &&
            (predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time >= REQUIRED_CONSISTENCY_TIME_MS);

        if (consistent) {
            handleFinalResult(top.className); // ส่ง className ไปยัง handleFinalResult
        } else {
            showResultHint(top);
        }
    }

    try {
        model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
        maxPredictions = model.getTotalClasses();
    } catch (error) {
        showError(`เกิดข้อผิดพลาดในการโหลดโมเดล: ${error.message}`);
        return;
    }

    await setupCamera();

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
        labelContainer.appendChild(document.createElement("div"));
    }

    showMessage('พร้อมสำหรับการจำแนก!', 'success');
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

async function setupCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());

    const constraints = {
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: currentFacingMode }
    };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        videoElement = document.createElement('video');
        videoElement.setAttribute('playsinline', true);
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.srcObject = stream;

        const webcamDiv = document.getElementById("webcam");
        webcamDiv.innerHTML = '';
        webcamDiv.appendChild(videoElement);

        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => resolve(videoElement.play());
            setTimeout(resolve, 3000);
        });

        isPredicting = true;
        window.requestAnimationFrame(loop);
    } catch (error) {
        let msg = error.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้เข้าถึงกล้อง' :
                  error.name === 'NotFoundError' ? 'ไม่พบกล้องในอุปกรณ์' :
                  'เกิดข้อผิดพลาดในการเปิดกล้อง';
        showError(msg);
    }
}

async function loop() {
    if (!isPredicting) return;
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (!videoElement || videoElement.readyState < 2) return;

    const prediction = await model.predict(videoElement);
    prediction.sort((a, b) => b.probability - a.probability);

    const top = prediction[0];
    const currentTime = Date.now();

    if (top.probability > 0.7) {
        predictionHistory.push({ className: top.className, probability: top.probability, time: currentTime });
    } else {
        predictionHistory = [];
    }

    predictionHistory = predictionHistory.filter(p => currentTime - p.time <= REQUIRED_CONSISTENCY_TIME_MS);

    const consistent = predictionHistory.length > 0 &&
        predictionHistory.every(p => p.className === top.className && p.probability >= REQUIRED_PROBABILITY) &&
        (predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time >= REQUIRED_CONSISTENCY_TIME_MS);

    if (consistent) {
        handleFinalResult(top.className);
    } else {
        showResultHint(top);
    }
}

function handleFinalResult(className) {
    let resultText = {
        'V1': '🚨 เป็นโรคใบไหม้ 🚨',
        'V2': '🚨 เป็นโรคใบหอยหาก 🚨',
        'V3': '✅ ปลอดเชื้อโรค ✅',
        'V4': '✅ พร้อมทานรสชาติหวาน ✅',
        'V5': '🕐 รอต่อสัก 2-3 วัน 🕐',
        'V6': '✅ เก็บขายได้ราคาดี ✅',
        'V7': '🚨 เพลี้ยไฟ 🚨',
        'V8': '🚨 หนอนกิน 🚨',
        'V9': '🚨 กรุณาถ่ายใหม่ 🚨'
        
    }[className] || `💡 ตรวจพบ: ${className}`;

    resultDisplayElement.innerHTML = `<h3>${resultText}</h3>`;
    resultDisplayElement.className = 'important-message';

    // ✅ ใช้ toggleInfoButtons หรือปรับ style ตรง ๆ ก็ได้
    const shouldShowInfoButtons = ['V1', 'V2', 'V7', 'V8'].includes(className);
    document.getElementById("actionButtons").style.display = shouldShowInfoButtons ? 'none' : 'block';
    document.getElementById("infoButtons").style.display = shouldShowInfoButtons ? 'flex' : 'none';

    stopCamera();
}
 
// ย้ายปุ่ม "สาเหตุ" และ "วิธีรักษา" เข้าสู่ #resultDisplay
function moveInfoButtonsToResultDisplay() {
    const causeButton = document.getElementById('causeButton');
    const treatmentButton = document.getElementById('treatmentButton');
    const resultDisplay = document.getElementById('resultDisplay');

    // ย้ายปุ่ม "สาเหตุ" และ "วิธีรักษา" เข้าสู่ #resultDisplay
    resultDisplay.appendChild(causeButton);
    resultDisplay.appendChild(treatmentButton);

    // ลบ div #infoButtons ออกเพื่อไม่ให้มีปุ่มซ้ำ
    const infoButtonsDiv = document.getElementById('infoButtons');
    infoButtonsDiv.remove();
}

function showResultHint(top) {
    const timeElapsed = predictionHistory.length > 0
        ? predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time
        : 0;
    const remaining = Math.max(0, Math.ceil((REQUIRED_CONSISTENCY_TIME_MS - timeElapsed) / 1000));
    resultDisplayElement.innerHTML = `กำลังรอการยืนยัน "${top.className}" (${(top.probability * 100).toFixed(1)}%)<br>ต้องมั่นใจต่อเนื่องอีกประมาณ ${remaining} วินาที`;
    resultDisplayElement.className = 'info-message';
}

async function stopCamera() {
    isPredicting = false;
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (videoElement) videoElement.srcObject = null;
    document.getElementById("webcam").innerHTML = '<p>กล้องหยุดทำงานแล้ว</p>';
    showMessage('กล้องและโมเดลหยุดทำงานแล้ว');
    labelContainer.innerHTML = '';
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    predictionHistory = [];
}

async function switchCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await stopCamera();
    await setupCamera();
    showMessage('พร้อมสำหรับการจำแนก!', 'success');
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

startButton.addEventListener('click', init);
stopButton.addEventListener('click', stopCamera);
switchCameraButton.addEventListener('click', switchCamera);

// ปุ่ม "สาเหตุ" และ "วิธีรักษา" เปลี่ยนหน้าต่างเดิม
causeButton.addEventListener('click', () => {
    const resultText = resultDisplayElement.querySelector('h3')?.textContent.trim() || '';
    let href = 'bad5.html';

    if (resultText.includes('เป็นโรคใบไหม้')) {
        href = 'bad5.html';
    } else if (resultText.includes('เพลี้ยไฟ')) {
        href = 'bad6.html';
    }

    const diseaseName = resultText.replace(/[🚨✅]/g, '').trim();
    window.location.href = `${href}?disease=${encodeURIComponent(diseaseName)}`;
});

treatmentButton.addEventListener('click', () => {
    const resultText = resultDisplayElement.querySelector('h3')?.textContent.trim() || '';
    let href = 'health10.html';

    if (resultText.includes('เป็นโรคใบไหม้')) {
        href = 'health10.html';
    } else if (resultText.includes('เพลี้ยไฟ')) {
        href = 'health11.html';
    }

    const diseaseName = resultText.replace(/[🚨✅]/g, '').trim();
    window.location.href = `${href}?disease=${encodeURIComponent(diseaseName)}`;
});

window.addEventListener('DOMContentLoaded', () => {
    toggleInfoButtons(false);
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
});

window.addEventListener('beforeunload', stopCamera);

// วิเคราะห์ภาพจากไฟล์ที่อัปโหลด
document.getElementById("uploadImage").addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const image = new Image();
        image.src = e.target.result;

        showMessage('กำลังวิเคราะห์ภาพ...');
        resultDisplayElement.innerHTML = '';  // ล้างผลลัพธ์ก่อน

        image.onload = async function () {
            // โหลดโมเดลเพียงครั้งแรก
            if (!model) {
                try {
                    showMessage('กำลังโหลดโมเดล...');
                    model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
                    maxPredictions = model.getTotalClasses();
                    showMessage('โมเดลพร้อมใช้งาน!', 'success');
                } catch (err) {
                    showError('ไม่สามารถโหลดโมเดลได้: ' + err.message);
                    return;
                }
            }

            // วิเคราะห์ภาพทุกครั้งที่มีการอัปโหลด
            try {
                const prediction = await model.predict(image);
                prediction.sort((a, b) => b.probability - a.probability);
                const top = prediction[0];
                handleFinalResult(top.className);
            } catch (err) {
                showError('เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: ' + err.message);
            }
        };
    };
    reader.readAsDataURL(file);

    // reset input เพื่อให้อัปโหลดรูปเดิมซ้ำได้
    event.target.value = "";
});
