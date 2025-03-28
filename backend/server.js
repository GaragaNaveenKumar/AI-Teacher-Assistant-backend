require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    const result = await model.generateContent(" Assume you are teacher Please review this text and provide feedback and grade in range of 5:\n\n"+text);
    console.log(result);
    return result.response.text();
  } catch (error) {
    console.error('AI Error:', error);
    return 'Error generating feedback';
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

  const pdfBuffer = fs.readFileSync(req.file.path);
  pdfParse(pdfBuffer)
    .then(async (data) => {
      const extractedText = data.text;
      
      const feedback = await getFeedback(extractedText);

      // fs.unlink('./uploads/'+req.file.path)

      // Save submission details
      const submission = {
        id: Date.now(),
        filename: req.file.filename,
        feedback,
        teacherComments: '',
      };
      saveSubmission(submission);

      res.json({ message: 'File Uploaded Successfully', feedback });
    })
    .catch((err) => {
      console.error('PDF Parsing Error:', err);
      res.status(500).json({ message: 'Error extracting text from PDF' });
    });
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
