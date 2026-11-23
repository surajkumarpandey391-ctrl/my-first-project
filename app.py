import csv
import html
import io
import os
import sqlite3
from flask import Flask, jsonify, request, send_from_directory, Response

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "students.db")

app = Flask(__name__, static_folder="static", static_url_path="")

DEFAULT_STUDENTS = [
    ("GP-CSE-01", "Aarav Sharma", "aarav.sharma@golapoly.edu", "+91 98765 43210", "CSE", 5, 92, 36, 52, 8.8, "Active"),
    ("GP-CIV-05", "Rohan Gupta", "rohan.gupta@golapoly.edu", "+91 97654 32109", "Civil", 3, 71, 29, 43, 7.2, "Active"),
    ("GP-ME-12", "Ananya Singh", "ananya.singh@golapoly.edu", "+91 99123 45678", "Mechanical", 4, 95, 37, 51, 8.8, "Active"),
    ("GP-EE-04", "Kabir Mehta", "kabir.mehta@golapoly.edu", "+91 98222 33445", "Electrical", 2, 68, 26, 41, 6.7, "On Leave"),
    ("GP-ECE-09", "Sneha Patel", "sneha.patel@golapoly.edu", "+91 97333 44556", "ECE", 6, 84, 34, 47, 8.1, "Active"),
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def row_to_dict(row):
    d = dict(row)
    d["id"] = str(d["id"])
    return d

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                roll TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT DEFAULT '',
                dept TEXT NOT NULL,
                sem INTEGER NOT NULL,
                attendance INTEGER NOT NULL DEFAULT 85,
                internal INTEGER NOT NULL DEFAULT 32,
                external INTEGER NOT NULL DEFAULT 48,
                cgpa REAL NOT NULL DEFAULT 8.0,
                status TEXT NOT NULL DEFAULT 'Active'
            )
        """)
        if conn.execute("SELECT COUNT(*) FROM students").fetchone()[0] == 0:
            conn.executemany(
                "INSERT INTO students (roll, name, email, phone, dept, sem, attendance, internal, external, cgpa, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                DEFAULT_STUDENTS
            )

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/students", methods=["GET"])
def list_students():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM students ORDER BY id DESC").fetchall()
    return jsonify([row_to_dict(r) for r in rows])

@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json(force=True)
    cgpa = round(min(10.0, max(0.0, float(data.get("cgpa", 8.0)))), 1)
    att = min(100, max(0, int(data.get("attendance", 85))))
    internal = int(data.get("internal", round((cgpa / 10.0) * 40)))
    external = int(data.get("external", round((cgpa / 10.0) * 60)))
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO students (roll, name, email, phone, dept, sem, attendance, internal, external, cgpa, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (data["roll"].strip(), data["name"].strip(), data["email"].strip(), data.get("phone", "").strip(),
                 data["dept"], int(data["sem"]), att, internal, external, cgpa, data.get("status", "Active"))
            )
            row = conn.execute("SELECT * FROM students WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify(row_to_dict(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Roll number already exists."}), 400

@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json(force=True)
    cgpa = round(min(10.0, max(0.0, float(data.get("cgpa", 8.0)))), 1)
    att = min(100, max(0, int(data.get("attendance", 85))))
    internal = int(data.get("internal", round((cgpa / 10.0) * 40)))
    external = int(data.get("external", round((cgpa / 10.0) * 60)))
    with get_db() as conn:
        conn.execute(
            "UPDATE students SET roll=?, name=?, email=?, phone=?, dept=?, sem=?, attendance=?, internal=?, external=?, cgpa=?, status=? WHERE id=?",
            (data["roll"].strip(), data["name"].strip(), data["email"].strip(), data.get("phone", "").strip(),
             data["dept"], int(data["sem"]), att, internal, external, cgpa, data.get("status", "Active"), student_id)
        )
        row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    return jsonify(row_to_dict(row))

@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    with get_db() as conn:
        conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    return jsonify({"deleted": True})

@app.route("/api/attendance", methods=["POST"])
def save_attendance():
    updates = request.get_json(force=True).get("records", [])
    with get_db() as conn:
        for item in updates:
            sid = int(item["id"])
            row = conn.execute("SELECT attendance FROM students WHERE id = ?", (sid,)).fetchone()
            if not row:
                continue
            att = row["attendance"]
            if item.get("status") == "Present":
                att = min(100, att + 1)
            elif item.get("status") == "Absent":
                att = max(0, att - 2)
            conn.execute("UPDATE students SET attendance = ? WHERE id = ?", (att, sid))
    return jsonify({"saved": True})

@app.route("/api/grades/<int:student_id>", methods=["PUT"])
def update_grades(student_id):
    data = request.get_json(force=True)
    internal = min(40, max(0, int(data.get("internal", 0))))
    external = min(60, max(0, int(data.get("external", 0))))
    cgpa = round((internal + external) / 10.0, 1)
    with get_db() as conn:
        conn.execute("UPDATE students SET internal=?, external=?, cgpa=? WHERE id=?", (internal, external, cgpa, student_id))
        row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    return jsonify(row_to_dict(row))

@app.route("/api/reset", methods=["POST"])
def reset_demo():
    with get_db() as conn:
        conn.execute("DELETE FROM students")
        conn.executemany(
            "INSERT INTO students (roll, name, email, phone, dept, sem, attendance, internal, external, cgpa, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            DEFAULT_STUDENTS
        )
    return jsonify({"reset": True})

@app.route("/api/export", methods=["GET"])
def export_csv():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM students ORDER BY id DESC").fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll No", "Name", "Email", "Phone", "Branch", "Semester", "Attendance %", "CGPA", "Status"])
    for r in rows:
        writer.writerow([r["roll"], r["name"], r["email"], r["phone"], r["dept"], r["sem"], r["attendance"], r["cgpa"], r["status"]])
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=gola_polytechnic_students.csv"})

@app.route("/db-view")
def db_view():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM students ORDER BY id ASC").fetchall()
    cols = ["id", "roll", "name", "email", "phone", "dept", "sem", "attendance", "internal", "external", "cgpa", "status"]
    head = "".join(f"<th style='padding:8px;border:1px solid #cbd5e1;background:#f1f5f9;text-align:left'>{c}</th>" for c in cols)
    body = "".join("<tr>" + "".join(f"<td style='padding:8px;border:1px solid #e2e8f0'>{html.escape(str(r[c]))}</td>" for c in cols) + "</tr>" for r in rows)
    return f"<html><body style='font-family:sans-serif;padding:24px'><h2>SQLite Database: students.db</h2><table style='border-collapse:collapse;width:100%;font-size:13px'><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></body></html>"

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)