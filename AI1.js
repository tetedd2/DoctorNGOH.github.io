// AI1.js - รองรับกล้องสดและอัปโหลดภาพ พร้อมปิดวิดีโออัตโนมัติหลังวิเคราะห์
const URL = "https://teachablemachine.withgoogle.com/models/l_zvMSkA3/";
let model, labelContainer, maxPredictions;
let stream, videoElement;
let currentFacingMode = "environment";
let isPredicting = false;

const messageElement = document.getElementById("message");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const switchCameraButton = document.getElementById("switchCameraButton");
const uploadInput = document.getElementById("uploadImage");
const resultDisplayElement = document.getElementById("resultDisplay");
const actionButtonsDiv = document.getElementById("actionButtons");
const infoButtonsDiv = document.getElementById("infoButtons");
const causeButton = document.getElementById("causeButton");
const treatmentButton = document.getElementById("treatmentButton");

uploadInput.setAttribute("accept", "image/*");
uploadInput.setAttribute("capture", "environment");

let predictionHistory = [];
const REQUIRED_CONSISTENCY_TIME_MS = 2000;
const REQUIRED_PROBABILITY = 0.9;

function showMessage(text, type = "") {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`.trim();
}

function showError(text) {
    showMessage(text, "error");
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
}

function toggleInfoButtons(show) {
    infoButtonsDiv.classList.toggle("hidden", !show);
    actionButtonsDiv.classList.toggle("hidden", show);
}

startButton.addEventListener("click", async () => {
    showMessage("กำลังเปิดกล้อง...");
    await stopCamera();

    if (!model) {
        model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
        maxPredictions = model.getTotalClasses();
    }

    const webcamDiv = document.getElementById("webcam");
    webcamDiv.innerHTML = "";

    const constraints = {
        video: { facingMode: currentFacingMode }
    };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement = document.createElement("video");
        videoElement.setAttribute("playsinline", true);
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.srcObject = stream;

        webcamDiv.appendChild(videoElement);

        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => resolve(videoElement.play());
        });

        showMessage("กล้องพร้อมใช้งานแล้ว", "success");
        isPredicting = true;
        stopButton.disabled = false;
        switchCameraButton.disabled = false;
        requestAnimationFrame(loop);
    } catch (err) {
        showError("ไม่สามารถเปิดกล้อง: " + err.message);
    }
});

async function loop() {
    if (!isPredicting) return;
    await predictFromVideo();
    requestAnimationFrame(loop);
}

async function predictFromVideo() {
    if (!videoElement || videoElement.readyState < 2) return;
    const prediction = await model.predict(videoElement);
    prediction.sort((a, b) => b.probability - a.probability);
    const top = prediction[0];
    const now = Date.now();

    if (top.probability >= 0.7) {
        predictionHistory.push({ className: top.className, probability: top.probability, time: now });
    } else {
        predictionHistory = [];
    }

    predictionHistory = predictionHistory.filter(p => now - p.time <= REQUIRED_CONSISTENCY_TIME_MS);
    const consistent = predictionHistory.length > 0 &&
        predictionHistory.every(p => p.className === top.className && p.probability >= REQUIRED_PROBABILITY) &&
        (predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time >= REQUIRED_CONSISTENCY_TIME_MS);

    if (consistent) {
        handleFinalResult(top.className);
        await stopCamera();
    } else {
        resultDisplayElement.innerHTML = `🔍 กำลังวิเคราะห์... ${top.className} (${(top.probability * 100).toFixed(1)}%)`;
    }
}

async function stopCamera() {
    isPredicting = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    const webcamDiv = document.getElementById("webcam");
    webcamDiv.innerHTML = "<p>กล้องหยุดแล้ว</p>";
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    predictionHistory = [];
}

switchCameraButton.addEventListener("click", async () => {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    await stopCamera();
    startButton.click();
});

uploadInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        const image = new Image();
        image.src = e.target.result;

        showMessage("กำลังวิเคราะห์ภาพ...");
        resultDisplayElement.innerHTML = "";

        image.onload = async function () {
            const webcamDiv = document.getElementById("webcam");
            webcamDiv.innerHTML = ""; // ไม่แสดงภาพ

            try {
                if (!model) {
                    model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
                    maxPredictions = model.getTotalClasses();
                }

                const prediction = await model.predict(image);
                prediction.sort((a, b) => b.probability - a.probability);
                const top = prediction[0];
                handleFinalResult(top.className);
            } catch (err) {
                showError("เกิดข้อผิดพลาด: " + err.message);
            }
        };
    };
    reader.readAsDataURL(file);
    event.target.value = "";
});

function handleFinalResult(className) {
    let resultText = {
        D1: "✅ ปลอดเชื้อโรค ✅",
        D2: "🚨 เป็นโรคจุดราขาว 🚨",
        D3: "🚨 เป็นโรคสนิม 🚨",
        D4: "🚨 เป็นโรคใบไหม้ 🚨",
        D5: "🚨 กรุณาถ่ายใหม่ 🚨",
        D6: "🚨 ยังไม่สุก 🚨",
        D7: "🕐 รออีกสัก 2-3 วัน 🕐",
        D8: "✅ พร้อมทานแล้ว ✅",
    }[className] || `💡 ตรวจพบ: ${className}`;

    resultDisplayElement.innerHTML = `<h3>${resultText}</h3>`;
    resultDisplayElement.className = "important-message";

    const showButtons = ["D2", "D3", "D4"].includes(className);
    actionButtonsDiv.style.display = showButtons ? "none" : "block";
    infoButtonsDiv.style.display = showButtons ? "flex" : "none";
}

causeButton.addEventListener("click", () => {
    const text = resultDisplayElement.textContent || "";
    let url = "bad.html";
    if (text.includes("จุดราขาว")) url = "bad11.html";
    else if (text.includes("สนิม")) url = "bad3.html";
    else if (text.includes("ใบไหม้")) url = "bad4.html";
    window.location.href = url;
});

treatmentButton.addEventListener("click", () => {
    const text = resultDisplayElement.textContent || "";
    let url = "health.html";
    if (text.includes("จุดราขาว")) url = "health2.html";
    else if (text.includes("สนิม")) url = "health3.html";
    else if (text.includes("ใบไหม้")) url = "health.html";
    window.location.href = url;
});

window.addEventListener("DOMContentLoaded", () => {
    toggleInfoButtons(false);
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
});

window.addEventListener("beforeunload", stopCamera);
