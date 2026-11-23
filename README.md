# EduTrack – Student Management System

**EduTrack** (Education Tracker) ek web-based Student Management System hai. Is project ko aap 2 hisson mein samajh sakte hain — ise laptop par chalana kaise hai aur yeh andar se kaise kaam karta hai.

---

## 1. Laptop par Run Karne ke Steps

1. **Terminal kholein:** VS Code mein `student-management-system` folder open karein aur terminal (`Ctrl + ~`) mein yeh command run karein:
   ```bash
   python app.py
      ```
   Note: Agar kisi naye laptop par pehli baar chala rahe hain, toh pehle pip install flask run karein.

Browser mein kholein: Chrome ya Edge ke address bar mein neeche diye gaye links open karein:

Website & Portal: http://127.0.0.1:5000

Database Table: http://127.0.0.1:5000/db-view

Server band karne ke liye: Terminal mein Ctrl + C dabayein.

2. Andar se Kaise Kaam Karta Hai (Project Flow)
Server & Database Start: python app.py run hote hi init_db() check karta hai ki students.db file maujood hai ya nahi. Nahi hone par yeh automatically tables banakar sample data daal deta hai aur Flask server port 5000 par start kar deta hai.

Frontend Load: Jab aap http://127.0.0.1:5000 kholte hain, toh Flask static/ folder se index.html, style.css, aur app.js browser mein load karta hai.

Live Data Sync: Page load hote hi app.js fetch('/api/students') ke zariye database se data mangwata hai aur use KPIs, Chart.js graphs, aur tables mein display karta hai.

Save / Update: Jab bhi aap kisi student ko Add, Edit, ya Delete karte hain (ya Attendance aur Grades update karte hain), toh app.js POST/PUT/DELETE request app.py ko bhejta hai, aur app.py us data ko SQLite (students.db) mein permanently save kar deta hai.
