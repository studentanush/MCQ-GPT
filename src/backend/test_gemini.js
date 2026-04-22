import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "src/backend/.env" });

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function test() {
  try {
    console.log("Testing with API_KEY:", process.env.API_KEY ? "Present" : "Missing");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say hello");
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("FAILED:", e.message);
    if (e.response) console.error("RESPONSE:", e.response);
  }
}

test();
