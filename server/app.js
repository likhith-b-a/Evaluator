const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

const app = express();
const port = 3500;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const upload = multer({ dest: "uploads/" });

const questions = [
  "What is statistics?",
  "Difference between descriptive and inferential statistics?",
  "What is mode?",
  "What is the formula for standard deviation?",
  "Explain histogram binning methods.",
  "What is the median of this dataset?",
  "What is independence in probability?",
  "State Bayes Theorem.",
  "Explain conditional probability.",
  "What is interquartile range?",
];

const keyAnswers = [
  "Statistics is the process of collecting, analyzing, interpreting, and presenting data.",
  "Descriptive statistics summarizes data; inferential statistics draws conclusions from it.",
  "Mode is the value that appears most frequently in a data set.",
  "Standard deviation = square root of (sum of (x - mean)^2 / N).",
  "Equal width and equal depth are two methods of binning in histograms.",
  "Median is the middle value in a sorted dataset.",
  "Events A and B are independent if P(A and B) = P(A) * P(B).",
  "Bayes Theorem: P(A|B) = P(B|A) * P(A) / P(B).",
  "Conditional probability is the probability of one event given that another has occurred.",
  "Interquartile range = Q3 - Q1.",
];

const evaluateAllAnswers = async (studentAnswers) => {
  let prompt = `
  You are a friendly tutor who motivates students. For each question, compare the student's answer with the key answer and assign a fair and supportive score:
- 1 for fully correct or very close
- 0.5 for a decent attempt with some relevant points
- 0 for completely off-topic or incorrect


Then give a short explanation:
- Be generous with encouragement
- Celebrate effort and understanding, even if incomplete
- Point out what could be added or clarified, in a soft tone
- If a point was missed, mention the point.
- If something was inaccurate or vague, point it out.
- If the answer was excellent, say why.

Output format:
[
  {
    "score": 1,
    "explanation": "Wonderful! Your answer is spot-on and well explained!"
  },
  {
    "score": 0.5,
    "explanation": "Nice try! You mentioned part of the answer, just missed a small detail. You're close!"
  },
  {
    "score": 0,
    "explanation": "Thanks for attempting! The main concept is missing, but keep practicing—you’ll get it!"
  }
]
`;

  for (let i = 0; i < questions.length; i++) {
    prompt += `Q${i + 1}: ${questions[i]}
Student Answer: ${studentAnswers[i]}
Key Answer: ${keyAnswers[i]}

`;
  }

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const match = raw.match(/\[\s*{[\s\S]*?}\s*\]/);
    if (match) {
      const detailedScores = JSON.parse(match[0]);
      const scores = detailedScores.map((item) => item.score || 0);
      return { scores, detailedScores };
    }
    return { scores: Array(questions.length).fill(0), detailedScores: [] };
  } catch (err) {
    console.error("Gemini Error:", err.message);
    return { scores: Array(questions.length).fill(0), detailedScores: [] };
  }
};

app.post("/evaluate", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      const finalResults = [];

      for (const student of results) {
        const name = student["Name"];
        const answers = [];

        for (let i = 0; i < questions.length; i++) {
          answers.push(student[(i + 1).toString()] || "");
        }

        const { scores, detailedScores } = await evaluateAllAnswers(answers);
        finalResults.push({
          name,
          scores,
          total: scores.reduce((a, b) => a + b, 0),
          detailedScores,
        });
      }

      fs.unlinkSync(filePath);
      res.json(finalResults);
    });
});

app.listen(port, () => {
  console.log("Server running on port 3500");
});

