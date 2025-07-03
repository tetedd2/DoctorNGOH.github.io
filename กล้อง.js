// อ้างอิงถึง Element ต่างๆ ใน HTML
const videoElement = document.getElementById('webcam');
const snapButton = document.getElementById('snapButton');
const canvas = document.getElementById('canvas');

// ฟังก์ชันสำหรับขออนุญาตและเริ่มการทำงานของกล้อง
async function startCamera() {
    // ตรวจสอบว่าเบราว์เซอร์รองรับ API หรือไม่
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            // ขอสิทธิ์เข้าถึงวิดีโอ (ไม่เอาเสียง)
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true,
                audio: false
            });

            // ถ้าสำเร็จ ให้นำ stream ที่ได้ไปใส่ใน <video> element
            videoElement.srcObject = stream;
            console.log("กล้องพร้อมใช้งานแล้ว!");

        } catch (error) {
            // ถ้าผู้ใช้ปฏิเสธ หรือเกิดข้อผิดพลาด
            console.error("เกิดข้อผิดพลาดในการเข้าถึงกล้อง: ", error);
            alert("ไม่สามารถเข้าถึงกล้องได้! กรุณาตรวจสอบว่าคุณได้อนุญาตให้เว็บนี้ใช้กล้องหรือไม่");
        }
    } else {
        alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับการใช้งานกล้อง");
    }
}

// ฟังก์ชันสำหรับถ่ายภาพ
function takePicture() {
    console.log("กำลังถ่ายภาพ...");
    
    // ตั้งค่าขนาดของ canvas ให้เท่ากับขนาดของวิดีโอ
    const context = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // วาดภาพเฟรมปัจจุบันจากวิดีโอลงบน canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // แปลงภาพบน canvas เป็นข้อมูลรูปภาพแบบ Data URL (PNG)
    const imageDataUrl = canvas.toDataURL('image/png');
    
    // สร้างลิงก์สำหรับดาวน์โหลดภาพ
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `snapshot-${new Date().getTime()}.png`; // ตั้งชื่อไฟล์
    
    // สั่งให้เบราว์เซอร์คลิกลิงก์นี้เพื่อดาวน์โหลดไฟล์
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // ลบลิงก์ทิ้งไปหลังดาวน์โหลด
}

// สั่งให้กล้องเริ่มทำงานเมื่อหน้าเว็บโหลดเสร็จ
startCamera();

// เพิ่ม Event Listener ให้กับปุ่มถ่ายภาพ
snapButton.addEventListener('click', takePicture);