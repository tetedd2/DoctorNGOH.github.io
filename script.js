// ฟังก์ชันโหลด GPS และพยากรณ์อากาศอัตโนมัติเมื่อหน้าโหลดเสร็จ
window.addEventListener('DOMContentLoaded', () => {
    getGPSAndWeather();
});

function getGPSAndWeather() {
    const statusElement = document.getElementById("weatherInfo");
    statusElement.innerHTML = "กำลังหาตำแหน่งปัจจุบัน...";

    if (!navigator.geolocation) {
        statusElement.innerHTML = "เบราว์เซอร์ของคุณไม่รองรับ Geolocation";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // หลังจากได้ GPS แล้ว ไปดึงข้อมูลสภาพอากาศ
        await getWeather(lat, lon);
    }, (error) => {
        console.error("เกิดข้อผิดพลาดในการขอ GPS:", error);
        statusElement.innerHTML = `ไม่สามารถหาตำแหน่งปัจจุบันได้: ${error.message}`;
    });
}

async function getWeather(lat, lon) {
    const apiKey = '6a5f56c17d0b8fcf9d5a691ccca1a1d5'; // ใส่ API Key จริงของคุณ
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            const weatherInfo = document.getElementById('weatherInfo');
            const temperature = data.main.temp.toFixed(1);
            const description = data.weather[0].description;
            const humidity = data.main.humidity;
            const cityName = data.name;

            weatherInfo.innerHTML = `
                <h3>📍 สภาพอากาศใน ${cityName}</h3>
                <p>🌡️ อุณหภูมิ: ${temperature}°C</p>
                <p>☁️ สภาพอากาศ: ${description}</p>
                <p>💧 ความชื้น: ${humidity}%</p>
            `;
        } else {
            document.getElementById('weatherInfo').innerHTML = `<p>ไม่สามารถโหลดข้อมูลสภาพอากาศได้</p>`;
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error);
        document.getElementById('weatherInfo').innerHTML = `<p>เกิดข้อผิดพลาดขณะโหลดสภาพอากาศ</p>`;
    }
}