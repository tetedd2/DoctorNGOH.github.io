// **สำคัญ: แก้ไข URL นี้ให้ตรงกับโมเดลของคุณจาก Teachable Machine**
// ถ้าคุณ Upload โมเดลไป Cloud:
const URL = "https://teachablemachine.withgoogle.com/models/GAu0Um0vr/";
// แทน YOUR_MODEL_ID ด้วย ID จริงๆ ของโมเดลคุณ เช่น "https://teachablemachine.withgoogle.com/models/asdfghjkl/"

// ถ้าคุณ Download โมเดลมาแล้ววางไว้ในโฟลเดอร์ my-model/:
// const URL = "./my-model/";

let model, labelContainer, maxPredictions;
let isPredicting = false; // สถานะเพื่อควบคุม loop การทำนาย
let currentFacingMode = 'environment'; // กำหนดค่าเริ่มต้นเป็นกล้องหลัง
let videoElement; // จะใช้เก็บ video element แทน webcam ของ tmImage
let stream; // เก็บ MediaStream object

const messageElement = document.getElementById('message');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const switchCameraButton = document.getElementById('switchCameraButton');
const resultDisplayElement = document.getElementById('resultDisplay');

// เพิ่มการอ้างอิงถึงปุ่มใหม่และ div สำหรับกลุ่มปุ่ม
const actionButtonsDiv = document.getElementById('actionButtons');
const infoButtonsDiv = document.getElementById('infoButtons');
const causeButton = document.getElementById('causeButton');
const treatmentButton = document.getElementById('treatmentButton');

// *******************************************************************
// ** เพิ่มตัวแปรสำหรับ Logic การจับเวลาและการแสดงผลตามเงื่อนไข **
// *******************************************************************
let predictionHistory = []; // เก็บประวัติการทำนาย (เช่น 2 วินาทีล่าสุด)
const REQUIRED_CONSISTENCY_TIME_MS = 2000; // 2 วินาที
const REQUIRED_PROBABILITY = 0.9; // 90%

// ฟังก์ชันสำหรับแสดง/ซ่อนปุ่ม "สาเหตุ" และ "รักษา"
function toggleInfoButtons(show) {
    if (show) {
        infoButtonsDiv.classList.remove('hidden');
        actionButtonsDiv.classList.add('hidden'); // ซ่อนปุ่ม Start/Stop/Switch
    } else {
        infoButtonsDiv.classList.add('hidden');
        actionButtonsDiv.classList.remove('hidden'); // แสดงปุ่ม Start/Stop/Switch
    }
}

// ฟังก์ชันเริ่มต้น (ถูกเรียกเมื่อกดปุ่ม "เริ่มการจำแนก")
async function init() {
    messageElement.textContent = 'กำลังโหลดโมเดลและตั้งค่ากล้อง...';
    messageElement.className = 'message';
    startButton.disabled = true; // ปิดปุ่ม Start ชั่วคราว
    stopButton.disabled = true; // ปิดปุ่ม Stop ชั่วคราวในระหว่าง init
    switchCameraButton.disabled = true; // ปิดปุ่มสลับกล้องชั่วคราว
    toggleInfoButtons(false); // ซ่อนปุ่มสาเหตุ/รักษาไว้เสมอเมื่อเริ่มต้น
    resultDisplayElement.innerHTML = ''; // ล้างข้อมูลผลลัพธ์เก่า
    predictionHistory = []; // รีเซ็ตประวัติการทำนายเมื่อเริ่มใหม่

    // 1. โหลดโมเดล
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses(); // จำนวน Classes ทั้งหมดในโมเดล
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดโมเดล:", error);
        messageElement.textContent = `เกิดข้อผิดพลาดในการโหลดโมเดล: ${error.message}`;
        messageElement.className = 'message error';
        startButton.disabled = false; // เปิดปุ่ม Start กลับมา
        return;
    }

    // 2. ตั้งค่า Webcam (ใช้ getUserMedia แทน)
    await setupCamera();

    // 3. เตรียมพื้นที่สำหรับแสดงผลลัพธ์การทำนาย
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = ''; // ล้างเนื้อหาเดิม (ถ้ามี)
    for (let i = 0; i < maxPredictions; i++) { // สร้าง div สำหรับแต่ละ Class
        labelContainer.appendChild(document.createElement("div"));
    }

    messageElement.textContent = 'พร้อมสำหรับการจำแนก!';
    messageElement.className = 'message success';
    startButton.disabled = true; // ปิดปุ่ม Start
    stopButton.disabled = false; // เปิดปุ่ม Stop
    switchCameraButton.disabled = false; // เปิดปุ่มสลับกล้อง
}

// ฟังก์ชันสำหรับตั้งค่าและเริ่มกล้องมือถือ (แทน tmImage.Webcam)
async function setupCamera() {
    // หยุด stream เก่าหากมีอยู่
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            width: 200,
            height: 200,
            facingMode: currentFacingMode // ใช้ค่า currentFacingMode เพื่อกำหนดกล้อง
        }
    };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        // สร้าง <video> element เพื่อแสดงผลจากกล้อง
        videoElement = document.createElement('video');
        videoElement.width = 200;
        videoElement.height = 200;
        videoElement.autoplay = true;
        videoElement.playsInline = true; // สำคัญสำหรับ iOS
        videoElement.srcObject = stream;

        // เพิ่ม video element ลงใน DOM ก่อนที่จะรอ onloadedmetadata
        document.getElementById("webcam").innerHTML = ''; // ล้าง div ก่อน
        document.getElementById("webcam").appendChild(videoElement);

        // รอให้วิดีโอโหลดและพร้อมเล่น
        await new Promise(resolve => {
            videoElement.onloadedmetadata = () => {
                console.log("Video metadata loaded. Video readyState:", videoElement.readyState);
                resolve();
            };
            // เพิ่ม timeout เพื่อป้องกันการติดค้างหาก onloadedmetadata ไม่ถูกเรียก
            setTimeout(() => {
                if (videoElement.readyState < videoElement.HAVE_ENOUGH_DATA) {
                    console.warn("Video metadata timeout. Continuing anyway.");
                    resolve();
                }
            }, 3000); // 3 วินาที
        });

        isPredicting = true; // เริ่มการทำนาย
        window.requestAnimationFrame(loop); // เริ่ม loop การทำนายผล

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการตั้งค่ากล้อง:", error);
        if (error.name === 'NotAllowedError') {
            messageElement.textContent = 'ไม่ได้รับอนุญาตให้เข้าถึงกล้อง กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์ของคุณ';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            messageElement.textContent = 'ไม่พบกล้องในอุปกรณ์ของคุณ';
        } else if (error.name === 'NotReadableError') {
             messageElement.textContent = 'ไม่สามารถเข้าถึงกล้องได้: กล้องอาจถูกใช้งานโดยแอปพลิเคชันอื่น หรือมีปัญหาด้านฮาร์ดแวร์';
        } else {
            messageElement.textContent = `เกิดข้อผิดพลาดในการตั้งค่ากล้อง: ${error.message}`;
        }
        messageElement.className = 'message error';
        startButton.disabled = false; // เปิดปุ่ม Start กลับมา
        stopButton.disabled = true; // ปิดปุ่ม Stop
        switchCameraButton.disabled = true; // ปิดปุ่มสลับกล้อง
        isPredicting = false; // หยุดการทำนายถ้ากล้องมีปัญหา
        toggleInfoButtons(false); // ซ่อนปุ่มสาเหตุ/รักษา
        return;
    }
}

// Loop หลักสำหรับการทำนายผลอย่างต่อเนื่อง
async function loop() {
    if (!isPredicting) return; // ถ้าไม่ได้อยู่ในโหมดทำนาย ให้หยุด loop

    // ใช้ videoElement เป็น input ให้กับโมเดล
    await predict(); // ทำนายผล
    window.requestAnimationFrame(loop); // เรียกตัวเองซ้ำเพื่อทำซ้ำ
}

// ฟังก์ชันทำนายผล
async function predict() {
    // ส่งเฟรมปัจจุบันจาก videoElement เข้าสู่โมเดลเพื่อทำนายผล
    // ตรวจสอบให้แน่ใจว่า videoElement พร้อมใช้งานและมีข้อมูลเพียงพอ
    if (!videoElement || videoElement.readyState < videoElement.HAVE_ENOUGH_DATA) {
        return; // ไม่ทำนายหากกล้องยังไม่พร้อม
    }
    const prediction = await model.predict(videoElement); // ใช้ videoElement ตรงๆ แทน webcam.canvas

    // เรียงลำดับผลลัพธ์ตามความน่าจะเป็นจากมากไปน้อย
    prediction.sort((a, b) => b.probability - a.probability);

    let topClassName = ''; // เก็บชื่อ Class ที่มีความน่าจะเป็นสูงสุด
    let topProbability = 0; // เก็บค่าความน่าจะเป็นสูงสุด

    // แสดงผลลัพธ์
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className + ": " + (prediction[i].probability * 100).toFixed(1) + "%";
        const predictionDiv = labelContainer.childNodes[i];

        if (i === 0) { // Class ที่มีค่าความน่าจะเป็นสูงสุดอยู่เสมอ
            topClassName = prediction[i].className;
            topProbability = prediction[i].probability;

            const currentTime = Date.now();

            // เพิ่มการทำนายปัจจุบันลงใน History หากความน่าจะเป็นสูงสุดเกิน 70%
            if (topProbability > 0.7) {
                predictionHistory.push({ className: topClassName, probability: topProbability, time: currentTime });
                predictionDiv.className = 'highlight'; // ไฮไลท์ class ที่มีความน่าจะเป็นสูงสุด
            } else {
                // ถ้าน้อยกว่า 70% ให้รีเซ็ตประวัติและไม่ไฮไลท์
                predictionHistory = [];
                predictionDiv.className = '';
            }

            // ลบข้อมูลที่เก่าเกิน REQUIRED_CONSISTENCY_TIME_MS ออกไป
            predictionHistory = predictionHistory.filter(p => currentTime - p.time <= REQUIRED_CONSISTENCY_TIME_MS);

            // ตรวจสอบความต่อเนื่องของ Class และความน่าจะเป็น
            let isConsistentAndHighConfidence = true;
            if (predictionHistory.length > 0) {
                // ตรวจสอบว่าทุกการทำนายใน history เป็น class เดียวกันและมีความน่าจะเป็นตามที่กำหนด
                for (let p of predictionHistory) {
                    if (p.className !== topClassName || p.probability < REQUIRED_PROBABILITY) {
                        isConsistentAndHighConfidence = false;
                        break;
                    }
                }
                // ตรวจสอบว่ามีข้อมูลใน History เพียงพอสำหรับระยะเวลาที่ต้องการ (อย่างน้อย 2 วินาที)
                if (predictionHistory.length > 0 && (predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time) < REQUIRED_CONSISTENCY_TIME_MS) {
                    isConsistentAndHighConfidence = false;
                }
            } else {
                isConsistentAndHighConfidence = false; // ถ้าไม่มีประวัติก็ไม่ถือว่า Consistent
            }

            // Logic สำหรับการแสดงผลพิเศษ (D1, D2, D3, D4, D5 ) และหยุดการจำแนก
            if (isConsistentAndHighConfidence) {
                resultDisplayElement.className = 'important-message';
                let showInfoButtons = false; // ตั้งค่าเริ่มต้นเป็น false

                if (topClassName === "D2") {
                    resultDisplayElement.innerHTML = "<h3>🚨 เป็นโรคจุดราขาว 🚨</h3>";
                    showInfoButtons = true;
                } else if (topClassName === "D1") {
                    resultDisplayElement.innerHTML = "<h3>✅ ปลอดเชื้อโรค ✅</h3>";
                } else if (topClassName === "D3") {
                    resultDisplayElement.innerHTML = "<h3>🚨 เป็นโรคสนิม 🚨</h3>";
                    showInfoButtons = true;
                } else if (topClassName === "D4") {
                    resultDisplayElement.innerHTML = "<h3>🚨 เป็นโรคใบไหม้ 🚨</h3>"; // D4 คือโรคใบไหม้
                    showInfoButtons = true;
                } else if (topClassName === "D5") {
                    resultDisplayElement.innerHTML = "<h3>🚨 กรุณาถ่ายใหม่ 🚨</h3>";
                } else {
                    resultDisplayElement.innerHTML = `<h4>💡 โมเดลมั่นใจใน "${topClassName}" มากกว่า 2 วินาที!</h4><p>ความน่าจะเป็น: ${ (topProbability * 100).toFixed(1)}%</p>`;
                    resultDisplayElement.className = 'info-message';
                }
                
                stopCamera(); // เรียกฟังก์ชันหยุดการจำแนกเสมอเมื่อจำแนกเสร็จ
                toggleInfoButtons(showInfoButtons); // แสดง/ซ่อนปุ่มตามเงื่อนไข

            } else {
                // ถ้ายังไม่ตรงเงื่อนไข 2 วินาที 90%
                resultDisplayElement.className = 'info-message';
                // ปรับข้อความให้เข้าใจง่ายขึ้น
                if (predictionHistory.length > 0) {
                    const timeElapsed = predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time;
                    const remainingTime = Math.ceil((REQUIRED_CONSISTENCY_TIME_MS - timeElapsed) / 1000);
                    resultDisplayElement.innerHTML = `<p>กำลังรอการยืนยัน "${topClassName}"... (ความน่าจะเป็น: ${(topProbability * 100).toFixed(1)}%)<br>ต้องมั่นใจต่อเนื่องอีกประมาณ ${remainingTime} วินาที</p>`;
                } else {
                    resultDisplayElement.innerHTML = `<p>กำลังรอการจำแนก... (ความน่าจะเป็นของ "${topProbability > 0 ? topClassName : 'บางสิ่ง'}" : ${(topProbability * 100).toFixed(1)}% ยังไม่สูงพอ หรือยังไม่ต่อเนื่อง)</p>`;
                }
                toggleInfoButtons(false); // ซ่อนปุ่มสาเหตุ/รักษา
            }
        } else { // หากไม่มี class ไหนมีความน่าจะเป็นเกิน 70% เลย
            predictionDiv.className = '';
        }
        predictionDiv.innerHTML = classPrediction;
    }
}

// ฟังก์ชันสำหรับหยุดการทำงานของกล้องและการทำนาย
async function stopCamera() {
    isPredicting = false; // หยุด loop การทำนาย (สำคัญมาก)
    if (stream) {
        stream.getTracks().forEach(track => track.stop()); // หยุด track ของกล้องทั้งหมด
    }
    if (videoElement) {
        videoElement.srcObject = null; // ตัดการเชื่อมต่อ stream
    }
    // ล้าง canvas ของกล้อง
    const webcamDiv = document.getElementById("webcam");
    if (webcamDiv) {
        webcamDiv.innerHTML = '<p>กล้องหยุดทำงานแล้ว</p>'; // เพิ่มข้อความแจ้งสถานะ
    }
    labelContainer.innerHTML = ''; // ล้างผลการทำนาย
    messageElement.textContent = 'กล้องและโมเดลหยุดทำงานแล้ว'; // ข้อความสถานะหลัก
    messageElement.className = 'message';
    
    startButton.disabled = false; // เปิดปุ่ม Start
    stopButton.disabled = true; // ปิดปุ่ม Stop
    switchCameraButton.disabled = true; // ปิดปุ่มสลับกล้องเมื่อหยุด
    predictionHistory = []; // รีเซ็ตประวัติการทำนาย
}

// ฟังก์ชันสำหรับสลับกล้อง
async function switchCamera() {
    // สลับค่า facingMode
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';

    // หยุดการทำนายชั่วคราว
    isPredicting = false;
    messageElement.textContent = 'กำลังสลับกล้อง...';
    messageElement.className = 'message';
    startButton.disabled = true;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    toggleInfoButtons(false); // ซ่อนปุ่มสาเหตุ/รักษาเมื่อสลับกล้อง

    // หยุดกล้องปัจจุบัน
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (videoElement) {
        videoElement.srcObject = null;
        document.getElementById("webcam").innerHTML = ''; // ล้าง video element เก่า
    }

    // ตั้งค่าและเริ่มกล้องใหม่ด้วย facingMode ที่อัปเดต
    await setupCamera();

    messageElement.textContent = 'พร้อมสำหรับการจำแนก!';
    messageElement.className = 'message success';
    startButton.disabled = true;
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

// เพิ่ม Event Listener ให้กับปุ่ม
startButton.addEventListener('click', init); // คลิก Start -> เรียก init()
stopButton.addEventListener('click', stopCamera); // คลิก Stop -> เรียก stopCamera()
switchCameraButton.addEventListener('click', switchCamera); // คลิก Switch Camera -> เรียก switchCamera()

// เพิ่ม Event Listener สำหรับปุ่มสาเหตุและรักษา
causeButton.addEventListener('click', () => {
    const diseaseName = resultDisplayElement.querySelector('h3') ? resultDisplayElement.querySelector('h3').textContent.replace('🚨 เป็นโรค', '').replace(' ✅', '').replace(' 🚨', '').trim() : 'Unknown Disease';
    // แก้ไข URL เป็น bad.html
    window.open(`bad.html?disease=${encodeURIComponent(diseaseName)}`, '_blank');
});

treatmentButton.addEventListener('click', () => {
    const diseaseName = resultDisplayElement.querySelector('h3') ? resultDisplayElement.querySelector('h3').textContent.replace('🚨 เป็นโรค', '').replace(' ✅', '').replace(' 🚨', '').trim() : 'Unknown Disease';
    // แก้ไข URL เป็น health.html
    window.open(`health.html?disease=${encodeURIComponent(diseaseName)}`, '_blank');
});

// จัดการเมื่อผู้ใช้ปิดหน้าเว็บ ให้หยุดกล้อง
window.addEventListener('beforeunload', () => {
    stopCamera(); // เรียก stopCamera เพื่อหยุดกล้องและปล่อยทรัพยากร
});

// กำหนดสถานะเริ่มต้นของปุ่มเมื่อหน้าเว็บโหลด
document.addEventListener('DOMContentLoaded', () => {
    toggleInfoButtons(false); // ซ่อนปุ่มสาเหตุ/รักษาเมื่อโหลดหน้าเว็บครั้งแรก
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
});