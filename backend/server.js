require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Tesseract = require('tesseract.js');
const Pdf2Pic = require('pdf2pic');



const app = express();
app.use(cors());
app.use(express.json());

const SUBMISSIONS_FILE = './submissions.json';

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Initialize Gemini AI API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to get AI feedback
async function getFeedback(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-pro-002' });
    const result = await model.generateContent(
      "Assume you are a teacher. Review this text and provide feedback and a grade (1-5):\n\n" + text
    );
    console.log(result);
    return result.response.text();
  } catch (error) {
    console.error('AI Error:', error);
    return 'Error generating feedback';
  }
}

// Convert PDF to Image and Extract Text with Tesseract.js
async function extractTextFromPDF(pdfPath) {
  const outputDir = './converted/';

  // Correct instance creation (use "new Pdf2Pic()")
  const pdfImage = new Pdf2Pic({
    density: 300,
    savePath: outputDir,
    format: 'png',
    width: 1240,
    height: 1754,
  });

  try {
    // Convert first page of PDF to image
    const imageConversion = await pdfImage.convert(pdfPath, 1);
    const imagePath = imageConversion.path; // Correct path extraction

    // Extract text using Tesseract.js
    const extractedText = await Tesseract.recognize(imagePath, 'eng');
    return extractedText.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    return 'Error extracting text from PDF';
  }
}

// Save submission data to a file
function saveSubmission(submission) {
  let submissions = [];
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE));
  }
  submissions.push(submission);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

// Upload Route
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const extractedText = await extractTextFromPDF(req.file.path);
  const feedback = await getFeedback(extractedText);

  // Save submission details
  const submission = {
    id: Date.now(),
    filename: req.file.filename,
    feedback,
    teacherComments: '',
  };
  saveSubmission(submission);

  res.json({ message: 'File Uploaded Successfully', feedback });
});

// Fetch all submissions for Teacher Dashboard
app.get('/submissions', (req, res) => {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    res.json(JSON.parse(fs.readFileSync(SUBMISSIONS_FILE)));
  } else {
    res.json([]);
  }
});

// Update teacher comments on a submission
app.post('/update-comment', (req, res) => {
  const { id, teacherComments } = req.body;
  let submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE));

  submissions = submissions.map((submission) =>
    submission.id === id ? { ...submission, teacherComments } : submission
  );

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
  res.json({ message: 'Comment Updated Successfully' });
});

// Start Server
app.listen(5000, () => console.log('Server running on port 5000'));
