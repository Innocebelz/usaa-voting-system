# U.S.S.A Voting System

A secure, mobile-responsive electronic voting portal built for the Uganda Students' Association in Algeria (U.S.S.A). The system provides authenticated, one-time voting using email-based OTP (One-Time Password) verification, plus a password-protected Election Control Center for monitoring turnout and live results.

## System Architecture

* **Frontend:** React, TypeScript, Vite, Tailwind CSS — deployed on Vercel
* **Backend:** Python, FastAPI — deployed on Render
* **Database:** PostgreSQL (e.g. Supabase)
* **Email:** Brevo HTTP API (Render's free tier blocks outbound SMTP, so OTPs are sent via Brevo's HTTPS API instead of `smtplib`/Gmail)
* **Authentication:**
    * **Voters:** a 6-digit OTP emailed to their registered address. Verifying the OTP issues a short-lived (30 min) signed token that the backend requires before it will accept a ballot — a ballot can no longer be submitted just by knowing a matric number.
    * **Admin:** a single shared password (`ADMIN_PASSWORD`) protects the Election Control Center. A correct login issues an 8-hour signed session token.

## Prerequisites

Before running this project, ensure you have the following installed on your machine:
* **Node.js** (v18 or higher)
* **Python** (v3.10 or higher)
* A PostgreSQL database (a free [Supabase](https://supabase.com) project works well)
* A [Brevo](https://www.brevo.com) account with a verified sender and an API key

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BREVO_API_KEY` | Brevo API key, used to send OTP emails |
| `BREVO_SENDER_EMAIL` | Verified sender address in Brevo |
| `APP_SECRET_KEY` | Random secret used to sign admin/vote session tokens. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_PASSWORD` | Password for the Election Control Center (`/admin`) |

Set the same variables in your Render dashboard for the deployed backend.

## Local Development & Setup

### 1. Backend

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

This starts the FastAPI server on `http://localhost:8000` and creates the required tables on startup if they don't already exist.

### 2. Voter Import

Place your `voters.csv` file (exported directly from Google Forms) into the root directory of the project. Ensure the column headers match the script exactly (`Full Name`, `Email Address`, `Matriculation Number`).

Run the importer script to load voters into Postgres:

```bash
python import_voters.py
```

`voters.csv` contains real student names, emails, and matric numbers — it's excluded from version control via `.gitignore` and should never be committed or shared publicly.

### 3. Frontend

```bash
npm install
npm run dev
```

This starts the Vite dev server (default `http://localhost:3000`), proxying `/api` requests to the local backend.

## Admin Access

Navigate to `/admin/login` (or click the U.S.S.A logo 5 times from any voter-facing page) and enter `ADMIN_PASSWORD`. From the Election Control Center you can monitor live turnout and results, export results as CSV, and open/close the election.
