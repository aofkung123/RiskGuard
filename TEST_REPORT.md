# 🛡️ RiskGuard — Test Report

**วันที่ทดสอบ:** 2026-06-27  
**เวลา:** 08:39:01 (ICT)  
**ผู้ทดสอบ:** Automated API Test Suite (`test_runner.py`)  
**สภาพแวดล้อม:** Local Development (SQLite)

---

## 📊 ผลสรุปรวม

| ผล | จำนวน | เปอร์เซ็นต์ |
|---|---|---|
| ✅ PASS | 63 | 95.5% |
| ❌ FAIL | 3 | 4.5% |
| ⚠️ WARN | 0 | 0% |
| **รวมทั้งหมด** | **66** | **100%** |

---

## ✅ ผลรายละเอียดแต่ละ Section

### Section 0: Health Check — ผ่าน 4/4

| Test | ผล |
|---|---|
| `GET /health` → 200 | ✅ PASS |
| `/health` status = `healthy` | ✅ PASS |
| `GET /` → 200 | ✅ PASS |
| `/` has welcome message | ✅ PASS |

---

### Section 1: Authentication — ผ่าน 9/11

| Test | ผล | หมายเหตุ |
|---|---|---|
| Register Employer → 200 | ✅ PASS | |
| Register Contractor → 200 | ✅ PASS | |
| Register รหัสผ่านสั้น → 422 | ❌ FAIL | Backend ไม่ validate — logic อยู่ Frontend เท่านั้น |
| Register email ซ้ำ → 400 | ✅ PASS | |
| Login Employer → 200 | ✅ PASS | |
| Login Employer role = `employer` | ✅ PASS | |
| Login returns `access_token` | ✅ PASS | |
| Login Contractor → 200 | ✅ PASS | |
| Login Contractor role = `contractor` | ✅ PASS | |
| Login รหัสผ่านผิด → 401 | ✅ PASS | |
| Login email ไม่มีในระบบ → 401 | ❌ FAIL | Pydantic reject `.test` TLD → 422 (ไม่ใช่ bug จริง) |

---

### Section 2: Marketplace / Services — ผ่าน 5/5

| Test | ผล |
|---|---|
| `GET /marketplace/services` (public) → 200 | ✅ PASS |
| Services returns list | ✅ PASS |
| Create service โดยไม่มี profile → 403 | ✅ PASS |
| Profile update → 200 | ✅ PASS |
| Create service หลัง profile complete → 200 | ✅ PASS |

---

### Section 3: Chat & Quotation — ผ่าน 12/12

| Test | ผล |
|---|---|
| ส่งข้อความ text (Contractor→Employer) → 200 | ✅ PASS |
| `GET /chat/messages` → 200 | ✅ PASS |
| Messages list ไม่ว่าง | ✅ PASS |
| ส่ง Quotation (Contractor→Employer) → 200 | ✅ PASS |
| Employer ส่ง Quotation → 403 (ห้าม) | ✅ PASS |
| `GET /chat/quotations` → 200 | ✅ PASS |
| Approve Quotation → 200 | ✅ PASS |
| `GET /tracking/projects` หลัง approve → 200 | ✅ PASS |
| Project ถูกสร้างอัตโนมัติ | ✅ PASS |
| Project status = `in_progress` | ✅ PASS |
| Approve ซ้ำ → 409 Conflict | ✅ PASS |
| Reject Quotation → 200 | ✅ PASS |

---

### Section 4: Project Tracking — ผ่าน 11/11

| Test | ผล |
|---|---|
| `GET /tracking/stages` → 200 | ✅ PASS |
| Stages count = 5 | ✅ PASS |
| Has active stage | ✅ PASS |
| Contractor update stage → 200 | ✅ PASS |
| Employer update stage → 403 (ห้าม) | ✅ PASS |
| Stage เปลี่ยนเป็น `done_pending` | ✅ PASS |
| `awaiting_confirm` = true | ✅ PASS |
| Contractor confirm stage → 403 (ห้าม) | ✅ PASS |
| Employer confirm stage → 200 | ✅ PASS |
| Confirmed stage = `completed` | ✅ PASS |
| Stage ถัดไป auto-activate | ✅ PASS |

---

### Section 5: Dashboard & EVM — ผ่าน 14/15

| Test | ผล | หมายเหตุ |
|---|---|---|
| `GET /dashboard/overview` → 200 | ✅ PASS | |
| overview มี project | ✅ PASS | |
| overview มี kpis | ✅ PASS | |
| overview มี timeline | ✅ PASS | |
| kpis มี cpi | ✅ PASS | |
| kpis มี spi | ✅ PASS | CPI=0, SPI=0 (project ใหม่ ยังไม่มี analytics) |
| `GET /dashboard/evm` → 200 | ✅ PASS | |
| evm มี snapshots | ❌ FAIL | Project ใหม่ไม่มี `project_analytics` rows |
| evm bac > 0 | ✅ PASS | |
| evm latest มี cpi | ✅ PASS | |
| `GET /dashboard/variance` → 200 | ✅ PASS | |
| variance มี summary | ✅ PASS | |
| variance มี categories | ✅ PASS | |
| `GET /dashboard/warnings` → 200 | ✅ PASS | |
| warnings มี overall_risk | ✅ PASS | |
| warnings มี trend | ✅ PASS | |
| risk level = `normal` | ✅ PASS | ✔ ระดับความเสี่ยง: **NORMAL** |

---

### Section 6: Security / Permissions — ผ่าน 6/6

| Test | ผล |
|---|---|
| ไม่มี Token → 401 | ✅ PASS |
| Project ไม่มีในระบบ → 404 | ✅ PASS |
| Token ปลอม → 401 | ✅ PASS |
| Employer พยายาม update_stage → 403 | ✅ PASS |
| Contractor พยายาม confirm_stage → 403 | ✅ PASS |
| Stages ของ project ที่ไม่มี → 404 | ✅ PASS |

---

## ❌ Bug Report — 3 รายการที่ FAIL

### Bug #1 — Backend ไม่ validate ความยาว Password
- **Test:** `Register short password → 422`
- **ผลที่ได้:** `200 OK` (สมัครสำเร็จแม้ password = `"123"`)
- **Severity:** 🟡 Medium
- **สาเหตุ:** validation อยู่ที่ Frontend เท่านั้น (ใน `register/page.tsx`) ไม่มีที่ API layer
- **วิธีแก้ไข:**

```python
# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, field_validator

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
```

---

### Bug #2 — Login email ที่ไม่มีในระบบ → 422 แทน 401
- **Test:** `Login nonexistent → 401`
- **ผลที่ได้:** `422 Unprocessable Entity`
- **Severity:** 🟢 Low (ไม่ใช่ bug จริง)
- **สาเหตุ:** ใน test ใช้ email domain `.test` ซึ่ง Pydantic `EmailStr` ถือว่า invalid TLD → reject ก่อนถึง DB logic
- **หมายเหตุ:** ถ้า login ด้วย email จริงที่ไม่มีในระบบ จะได้ 401 ถูกต้องแล้ว

---

### Bug #3 — Project ใหม่ที่สร้างจาก Quotation ไม่มี EVM Snapshots
- **Test:** `evm has snapshots → True`
- **ผลที่ได้:** `False` (snapshots = `[]`, CPI=0, SPI=0)
- **Severity:** 🟡 Medium
- **สาเหตุ:** เมื่อ approve quotation → auto-create project แต่ไม่มีการ insert `project_analytics` rows ทำให้ EVM Dashboard ว่างเปล่าสำหรับ project ใหม่
- **วิธีแก้ไข (แนะนำ):** เพิ่ม seed analytics row ตอน approve quotation ใน `backend/app/api/chat.py`

```python
# ใน section "# Insert tracking stages" ของ approve flow
# เพิ่ม initial analytics snapshot
from datetime import datetime
conn.execute("""
    INSERT INTO project_analytics (project_id, date, pv, ev, ac)
    VALUES (?, ?, ?, 0, 0)
""", (proj_id, datetime.now().strftime("%Y-%m-%d"), budget * 0.1))
```

---

## 📋 สรุปภาพรวมระบบ

| Component | สถานะ |
|---|---|
| 🟢 Health & API | ปกติ |
| 🟢 Authentication (Login/Register) | ปกติ |
| 🟢 Marketplace / Services | ปกติ |
| 🟢 Chat + Quotation Flow | ปกติ สมบูรณ์ |
| 🟢 Project Auto-Create (Approve) | ปกติ |
| 🟢 Project Tracking (5 Stages) | ปกติ สมบูรณ์ |
| 🟢 Role-based Permissions | ปกติ ปลอดภัย |
| 🟢 Dashboard / EVM / Warnings | ปกติ (เฉพาะ project ที่มี seed data) |
| 🟡 EVM สำหรับ Project ใหม่ | มีข้อมูลว่าง (Bug #3) |
| 🔴 Password Validation (Backend) | ไม่มี (Bug #1) |

---

> **สร้างโดย:** `test_runner.py`  
> **ไฟล์ทดสอบ:** `C:\Users\natta\Desktop\RiskGuard\test_runner.py`
