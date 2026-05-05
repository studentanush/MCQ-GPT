# Project Cost Estimation & ROI Analysis

## 1. Operational Cost Breakdown (Monthly)

| Category | Component | Phase 1: MVP (Current) | Phase 2: Professional Scale |
| :--- | :--- | :--- | :--- |
| **AI Generation** | Google Gemini 2.5 Flash | $0.00 (Free Tier) | $0.10 per 1,000 Quizzes |
| **Vector Search** | Google Embeddings-001 | $0.00 (Free Tier) | $0.02 per 1M tokens |
| **Frontend Hosting** | Vercel / Netlify | $0.00 (Hobby) | $20.00 / Month |
| **Node.js Backend** | Render (Web Service) | $0.00 (Free Instance) | $7.00 - $15.00 / Month |
| **Python RAG Engine**| Render (Compute) | $0.00 (Free Instance) | $25.00 / Month (2GB RAM) |
| **Database** | MongoDB Atlas | $0.00 (Shared M0) | $60.00 / Month (Dedicated) |
| **PDF Storage** | AWS S3 / Cloudinary | $0.00 (Free Tier) | $5.00 / Month |
| **TOTAL** | | **$0.00 / Mo** | **~$120.00 / Mo** |

---

## 2. ROI (Return on Investment) Comparison

### Traditional Content Creation
- **Time**: 4-6 hours per high-quality 50-question quiz.
- **Cost**: ~$50 - $100 per quiz (hiring a subject matter expert).
- **Update Cycle**: Manual, slow, and prone to error.

### MCQ-GPT (AI-Powered)
- **Time**: < 30 seconds per 50-question quiz.
- **Cost**: < $0.01 per quiz.
- **Update Cycle**: Instant generation from any new document or URL.
- **Efficiency Gain**: **99.9% reduction in time and cost.**

---

## 3. Scalability Logic

### Infrastructure
Our architecture uses **Decoupled Services**. The Python AI Engine is separated from the main Node.js backend.
- **Benefit**: We only pay for high-performance compute (Python RAG) when generation is happening.
- **Memory Optimization**: By using **Chroma DB** (Vector DB), we minimize the data passed to the LLM, keeping costs fixed even as the source documents grow in size.

### API Usage
Google Gemini 2.5 Flash pricing is volume-based:
- **Input**: $0.075 / 1 million tokens.
- **Output**: $0.30 / 1 million tokens.
- *At this rate, 1 million quiz questions would cost less than $10 in total API fees.*

---

## 4. Monetization Strategy (The "Business Case")

1. **Freemium Model**:
   - 5 Free AI Quiz Generations / Month for students.
   - 10 Free Live Sessions / Month for educators.
2. **Educator Pro ($9.99/mo)**:
   - Unlimited generations.
   - Advanced Analytics Dashboard.
   - Bulk export to PDF/LMS.
3. **Institutional API**:
   - Licensing the RAG pipeline to schools for internal training modules.
