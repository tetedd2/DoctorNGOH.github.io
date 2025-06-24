from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

# ข้อมูลผู้ใช้งานที่อนุญาตให้เข้าสู่ระบบได้ (ตัวอย่าง)
users = {
    "admin": "1234",
    "user": "password"
}
@app.route('/')
def home():
    # เมื่อเข้าหน้าแรก ให้ redirect ไปหน้า login
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        # ถ้ามีการส่งฟอร์มด้วยเมธอด POST
        username = request.form['username'] # รับค่า username จากฟอร์ม
        password = request.form['password'] # รับค่า password จากฟอร์ม

        # ตรวจสอบชื่อผู้ใช้และรหัสผ่าน
        if username in users and users[username] == password:
            # ถ้าถูกต้อง ให้ redirect ไปหน้า welcome (สมมติว่ามี)
            return redirect(url_for('welcome', username=username))
        else:
            # ถ้าไม่ถูกต้อง ให้ตั้งค่าข้อความ error
            error = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!"
    
    # ถ้าเป็นเมธอด GET (เปิดหน้า login ครั้งแรก) หรือมี error จากการ POST
    # ให้แสดงหน้า login.html และส่งตัวแปร error (ถ้ามี) ไปด้วย
    return render_template('login.html', error=error)

@app.route('/welcome/<username>')
def welcome(username):
    # หน้าต้อนรับหลังจาก login สำเร็จ
    return f'<h1>ยินดีต้อนรับ, {username}! คุณเข้าสู่ระบบสำเร็จแล้ว</h1>'

if __name__ == '__main__':
    app.run(debug=True)