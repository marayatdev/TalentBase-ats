TalentBase HR

TalentBase HR คือระบบ Applicant Tracking System (ATS) สำหรับช่วยทีม HRจัดการกระบวนการสรรหาบุคลากร ตั้งแต่การเปิดตำแหน่งงาน การค้นหา Candidate การจัดเก็บCandidate Lead การสร้าง Application ไปจนถึงการติดตามผู้สมัครผ่าน RecruitmentPipeline

โปรเจกต์ยังมี Chrome Extension สำหรับช่วยค้นหา Candidate จาก Facebookโดยใช้ข้อมูลของ Job เป็นเงื่อนไข และใช้ AI ช่วยสร้างคำค้น วิเคราะห์โพสต์ และคัดกรองCandidate ที่มีแนวโน้มเหมาะสมก่อนบันทึกกลับเข้าสู่ ATS

System Flow

Jobs
  |
  v
Candidate Leads / Candidates
  |
  v
Applications
  |
  v
Pipeline
  |
  +----> Hired
  |
  +----> Rejected

สำหรับ Candidate ที่ค้นหาจาก Facebook:

Job
  |
  v
Chrome Extension
  |
  v
Facebook
  |
  v
Local Filter
  |
  v
AI Analysis
  |
  v
Candidate Match
  |
  v
Save to ATS
  |
  v
Candidate Lead
  |
  v
Convert
  |
  v
Candidate + Application
  |
  v
Pipeline

Features

Jobs

ใช้สำหรับสร้างและจัดการตำแหน่งงานที่องค์กรกำลังเปิดรับ

สามารถกำหนดข้อมูล เช่น:

Job Title

Job Description

Requirements

Employment Type

Minimum Experience

Salary Range

Number of Positions

Job Status

Job ที่มีสถานะ Open สามารถนำไปใช้เป็น Target Job ใน Chrome Extension ได้

Candidates

ใช้สำหรับจัดเก็บและบริหารข้อมูลผู้สมัคร

ข้อมูลที่สามารถจัดเก็บได้ เช่น:

ชื่อผู้สมัคร

Email

เบอร์โทร

LinkedIn

Current Position

Skills

Work Experience

Education

Languages

Certificates

Resume

Candidate สามารถถูกนำไปสร้าง Application สำหรับ Job ที่ต้องการได้

Candidate Leads

Candidate Lead คือบุคคลที่ HR พบว่าน่าสนใจจากแหล่งภายนอกแต่ยังไม่ได้เข้าสู่กระบวนการสมัครอย่างเต็มรูปแบบ

ในโปรเจกต์นี้ Candidate Lead สามารถมาจาก Facebook ผ่าน Chrome Extension

ข้อมูลที่สามารถเก็บได้ เช่น:

ชื่อผู้โพสต์

Email / Phone ที่ตรวจพบ

Current Position

Skills

ข้อความโพสต์ต้นทาง

Facebook Post URL

Target Job

AI Match Score

AI Match Reason

เมื่อ HR ตรวจสอบแล้วสามารถ Convert Candidate Lead เพื่อสร้าง Candidate และApplication ได้

Applications

Application ใช้เชื่อม Candidate เข้ากับ Job

ตัวอย่าง:

Candidate: Somchai
        |
        v
Job: Backend Developer
        |
        v
Application

Application จะมี Current Stage และ Status ของตัวเอง เพื่อใช้ติดตาม Candidateใน Recruitment Pipeline

Pipeline

Pipeline ใช้สำหรับติดตามขั้นตอนการรับสมัครของ Candidate ในแต่ละ Job

ตัวอย่าง:

Applied
   |
   v
Screening
   |
   v
Interview
   |
   v
Offer
   |
   v
Hired

หาก Candidate ไม่ผ่าน สามารถเปลี่ยนสถานะเป็น Rejected ตาม Workflow ของระบบ

Chrome Extension

Chrome Extension ใช้สำหรับช่วย HR ค้นหา Candidate จาก Facebook โดยเชื่อมต่อกับTalentBase HR API

Extension Flow

1. Login

เปิด Chrome Extension และ Login ด้วยบัญชีสำหรับใช้งาน TalentBase HR

เมื่อ Login สำเร็จ Extension จะเก็บ Access Token สำหรับเรียก API ที่ต้องAuthentication

2. Select Target Job

เลือก Job ที่ต้องการค้นหา Candidate

ตัวอย่าง:

Backend Developer

Extension จะใช้รายละเอียดของ Job เป็นบริบทในการค้นหาและวิเคราะห์ Candidate

3. Generate Search Queries

สามารถใช้ AI ช่วยสร้างคำค้นจาก Job Description และ Requirements

ตัวอย่าง:

Backend Developer Node.js
Node.js PostgreSQL หางาน
Full Stack Developer หางาน

จากนั้นนำคำค้นไปใช้บน Facebook Search หรือ Facebook Group

4. Search Facebook

เปิด Facebook และค้นหาโพสต์ที่เกี่ยวข้อง

Extension จะตรวจสอบโพสต์ที่ Facebook แสดงอยู่บนหน้า

5. Local Filter

ก่อนส่งข้อมูลไป AI ระบบจะกรองโพสต์เบื้องต้นจาก Keyword ของ Target Job

Flow:

Facebook Post
      |
      v
Local Filter
   /      \
 Skip    Analyze
           |
           v
          AI

ช่วยลดจำนวนโพสต์ที่ไม่เกี่ยวข้องและลด AI Request ที่ไม่จำเป็น

6. AI Analysis

โพสต์ที่ผ่าน Local Filter จะถูกส่งไป Backend เพื่อให้ AI วิเคราะห์ความเหมาะสมกับ Job

AI สามารถช่วยวิเคราะห์ข้อมูล เช่น:

Match Score

Match Reason

Skills

Experience

Education

Current Position

Email

Phone

7. Candidate Match Card

หาก AI พบว่าโพสต์มีความเกี่ยวข้องกับ Target Job Extension จะแสดง CandidateMatch Card บน Facebook

HR สามารถตรวจสอบผลก่อนตัดสินใจบันทึก

8. Save to ATS

หาก Candidate น่าสนใจ ให้กด:

Save to ATS

ข้อมูลจะถูกบันทึกเข้า:

TalentBase HR
      |
      v
Candidate Leads

พร้อม Facebook Post URL เพื่อให้ HR สามารถย้อนกลับไปตรวจสอบโพสต์ต้นทางได้

9. Convert Candidate Lead

กลับมาที่ TalentBase HR และเปิดเมนู Candidate Leads

เลือก Lead ที่ต้องการ จากนั้นกด Convert

Candidate Lead
      |
      v
   Convert
      |
      +------> Candidate
      |
      +------> Application
                    |
                    v
                 Pipeline

จากนั้นสามารถดำเนินกระบวนการ Screening, Interview, Offer และ Hiring ต่อได้

Project Structure

TalentBase-ats/
|
+-- client/
|   +-- React / Vite Web ATS
|
+-- server/
|   +-- Node.js / Express API
|   +-- Prisma
|   +-- Authentication
|   +-- Candidate / Job / Application APIs
|   +-- AI Integration
|
+-- extension/
    +-- Chrome Extension
    +-- Popup
    +-- Background Service Worker
    +-- Facebook Content Script
    +-- Facebook Parser
    +-- AI Candidate Match UI

Tech Stack

Frontend

React

TypeScript

Vite

TanStack Query

React Router

Tailwind CSS / UI Components

Backend

Node.js

Express

TypeScript

Prisma ORM

JWT Authentication

Database

PostgreSQL

Supabase

Deployment

Frontend: Vercel

Backend: Railway

Database: Supabase

Extension

Chrome Extension

Content Script

Background Service Worker

Chrome Storage API

Getting Started

Repository มี 3 ส่วนหลัก:

client/
server/
extension/

แต่ละส่วนติดตั้ง dependencies แยกกัน

Client

cd client
npm install
npm run dev

Server

cd server
npm install
npm run dev

สำหรับ Production build:

npm run build
npm start

Chrome Extension

cd extension
npm install
npm run build

จากนั้นเปิด Chrome:

chrome://extensions

เปิด Developer mode

เลือก Load unpacked

เลือกโฟลเดอร์ build ของ Extension

หลังแก้โค้ด ให้ npm run build

กด Reload Extension

Refresh หน้า Facebook ก่อนทดสอบใหม่

Basic Usage

Flow การใช้งานที่แนะนำ:

สร้าง Job ใน TalentBase HR

ตั้ง Job เป็น Open

เปิด Chrome Extension

Login

เลือก Target Job

Generate Search Queries

ค้นหา Candidate บน Facebook

ตรวจ Candidate Match จาก AI

กด Save to ATS

เปิด Candidate Leads

ตรวจสอบข้อมูล Lead

Convert เป็น Candidate/Application

ติดตาม Candidate ผ่าน Pipeline

จบกระบวนการด้วย Hired หรือ Rejected

Important Notes

AI ใช้เป็นเครื่องมือช่วยคัดกรอง Candidate ไม่ใช่ผู้ตัดสินใจแทน HR

ควรตรวจสอบข้อมูล Candidate ก่อน Convert ทุกครั้ง

Facebook DOM สามารถเปลี่ยนแปลงได้ จึงอาจต้องปรับ Parser ในอนาคต

ไม่ควร Commit Password, JWT Secret, Database Credentials หรือ AI APIKey ลง Repository

หลัง Build Chrome Extension ใหม่ ควร Reload Extension และ RefreshFacebook ก่อนทดสอบ

Summary

TalentBase HR ช่วยเชื่อมกระบวนการสรรหาให้ต่อเนื่องตั้งแต่การเปิด Jobไปจนถึงการจ้างงาน

Create Job
    |
    v
Find Candidate
    |
    v
Candidate Lead
    |
    v
Candidate
    |
    v
Application
    |
    v
Pipeline
    |
    v
Hired / Rejected

Chrome Extension ช่วยเพิ่มความสามารถด้าน Candidate Sourcing:

Facebook
    |
    v
Extension
    |
    v
AI Analysis
    |
    v
Candidate Lead
    |
    v
TalentBase HR

เป้าหมายคือช่วยให้ทีม HR ค้นหา Candidate ได้เร็วขึ้น เก็บข้อมูลเป็นระบบและติดตามกระบวนการรับสมัครได้จากจุดเดียว