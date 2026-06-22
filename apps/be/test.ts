import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AQ.Ab8RN6KHlzoasIEDxczgAmEkAq95lL63mAQGjUyCbs2A-ozAKw");

async function main() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent("hello");

    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}

main();