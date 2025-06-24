// อ่านชื่อจาก URL (เช่น Home999.html?name=สมชาย)
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('name');

  const greetingText = document.getElementById('greetingText');
  if (username && greetingText) {
    greetingText.textContent = 'สวัสดี, ' + decodeURIComponent(username);
  } else if (greetingText) {
    // หากไม่มีชื่อ ซ่อนป้ายนี้ไปเลย
    document.getElementById('greetingBox').style.display = 'none';
  }
});