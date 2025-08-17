const URL = "https://teachablemachine.withgoogle.com/models/XVl8fpp5o/";

        'V2': '🚨 เป็นโรคใบไหม้ 🚨',
        'V3': '✅ ปลอดเชื้อโรค ✅',
        'V1': '🚨 กรุณาถ่ายใหม่ 🚨'

        const showButtonsFor = ["V2", ];

    if (showButtonsFor.includes(label)) {
        // ตั้งชื่อโรคให้ตรงตาม label
        let name = "";
        switch (label) {
            case "V2":
                name = "โรคใบไหม้";
                break;
            ;
            
    
        }

        if (resultText.includes('โรคใบไหม้')) {
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

    if (resultText.includes('โรคใบไหม้')) {
        href = 'health10.html';
    } else if (resultText.includes('เพลี้ยไฟ')) {
        href = 'health11.html';
    }