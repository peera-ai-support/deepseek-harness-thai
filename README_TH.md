# คู่มือการใช้งาน DeepSeek Harness (`dsh`)

ยินดีต้อนรับสู่ **DeepSeek Harness** ระบบ Agentic Coding Framework แบบ Open Source จากทีมงาน **DeepSeek AI**

---

## 🚀 วิธีการเริ่มต้นใช้งาน (Quick Start)

### ขั้นตอนที่ 1: ใส่ DeepSeek API Key
1. เปิดไฟล์ [`.env`](file:///d:/APP_AI/Deepseek_Harness/.env) ในโฟลเดอร์โปรเจกต์
2. นำ API Key ที่ได้จาก [DeepSeek Platform](https://platform.deepseek.com/api_keys) มาใส่ เช่น:
   ```env
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

### ขั้นตอนที่ 2: ติดตั้งเป็นแอปบน Windows (แนะนำ)

ดับเบิลคลิก [`install-desktop-app.bat`](file:///d:/APP_AI/Deepseek_Harness/install-desktop-app.bat) ครั้งเดียว

ระบบจะสร้างทางลัด **DeepSeek Harness** บนเดสก์ท็อปและใน Start Menu จากนั้นเปิดแอปได้เหมือนโปรแกรมทั่วไป ไม่ต้องเปิดโฟลเดอร์โปรเจกต์ทุกครั้ง

* ปิดหน้าต่างแอป = หยุดเซิร์ฟเวอร์ที่แอปเป็นคนเปิด
* ถ้าเปิดซ้ำขณะที่แอปทำงานอยู่ จะดึงหน้าต่างเดิมขึ้นมา ไม่เปิดซ้ำ

### ขั้นตอนที่ 3: รันผ่านไฟล์ .bat (ทางเลือก)

* **🖥️ เปิดแบบ Desktop App:**
  ดับเบิลคลิก [`run-desktop.bat`](file:///d:/APP_AI/Deepseek_Harness/run-desktop.bat)

* **🌐 เปิดใช้งานหน้า Web UI บนเบราว์เซอร์:**
  ดับเบิลคลิกไฟล์ [`run-start.bat`](file:///d:/APP_AI/Deepseek_Harness/run-start.bat)
  เข้าใช้งานได้ที่: **[http://127.0.0.1:13080](http://127.0.0.1:13080)**

* **💻 เปิดในโหมดพัฒนา (Development / Hot Reload):**
  ดับเบิลคลิกไฟล์ [`run-dev.bat`](file:///d:/APP_AI/Deepseek_Harness/run-dev.bat)

* **⌨️ รันผ่าน Command Line (CLI):**
  ดับเบิลคลิกหรือรัน [`run-cli.bat`](file:///d:/APP_AI/Deepseek_Harness/run-cli.bat) เพื่อดูคำสั่งทั้งหมด หรือรันงานเฉพาะกิจ เช่น:
  ```cmd
  run-cli.bat --profile headless "สรุปโครงสร้างโค้ดในโฟลเดอร์นี้ให้หน่อย"
  ```

---

## 📁 โครงสร้างไฟล์และสคริปต์สำคัญ

| ไฟล์/โฟลเดอร์ | หน้าที่ |
|---|---|
| [`install-desktop-app.bat`](file:///d:/APP_AI/Deepseek_Harness/install-desktop-app.bat) | ติดตั้งทางลัดเดสก์ท็อปและ Start Menu |
| [`run-desktop.bat`](file:///d:/APP_AI/Deepseek_Harness/run-desktop.bat) | เปิดหน้าต่าง Desktop App |
| [`run-start.bat`](file:///d:/APP_AI/Deepseek_Harness/run-start.bat) | สคริปต์รัน Web UI สำหรับใช้งานทั่วไป (Port 13080) |
| [`run-dev.bat`](file:///d:/APP_AI/Deepseek_Harness/run-dev.bat) | สคริปต์รันโหมดพัฒนา (Watch mode / Hot reload) |
| [`run-cli.bat`](file:///d:/APP_AI/Deepseek_Harness/run-cli.bat) | สคริปต์รันคำสั่ง `dsh` บน Terminal |
| [`.env`](file:///d:/APP_AI/Deepseek_Harness/.env) | ไฟล์ตั้งค่า API Key (`DEEPSEEK_API_KEY`) |
| `packages/` | แพ็กเกจและปลั๊กอินความสามารถต่างๆ (Tools, Shell, FS, LLM, Subagents) |
| `apps/web/` | ซอร์สโค้ดและหน้า Web Dashboard |
