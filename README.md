# 🚀 AI-Powered Multi-Platform Job Scraper Dashboard

A robust, full-stack MERN application designed to automate your job hunt. It scrapes listings from multiple top-tier platforms, filters them based on your preferences, and provides an AI-assisted application workflow.

## 🌟 Features

- **Multi-Platform Scaping**: Integrated Puppeteer-based scrapers for:
  - **Naukri** (Direct scraping)
  - **Indeed** (Direct scraping)
  - **Internshala** (Direct scraping)
  - **LinkedIn & Wellfound** (Search-based scraping with DuckDuckGo fallback)
- **Smart Filtering**: Filter jobs by status (New, All) and posting date (Today, Yesterday, Last 7 Days).
- **Premium UI**: Modern dark-mode dashboard with glassmorphism effects and GSAP-powered animations.
- **Resume Parsing**: Upload your resume (PDF/DOCX) to automatically extract skills and experience.
- **AI-Assisted Apply**: One-click application that copies a tailored message to your clipboard and opens the job listing.
- **Graceful Port Management**: Automatic port conflict resolution and graceful server shutdown.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), GSAP (Animations), Vanilla CSS.
- **Backend**: Node.js, Express, Puppeteer (Scraping), Cheerio.
- **Database**: MongoDB (Mongoose).
- **Logging**: Pino (High-performance logging).

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or via Atlas)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vive4545/job_hunter.git
   cd job_hunter
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend` directory based on `.env.example`.

4. **Run the application**:
   ```bash
   # From the root
   npm run dev
   ```

## 📝 Configuration

You can customize the job search queries in the `.env` file:
```env
JOB_SOURCES=naukri:mern developer,indeed:react developer,linkedin:fullstack developer
```

## 📄 License

MIT
