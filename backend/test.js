const Tesseract = require('tesseract.js');
const pdfPoppler = require('pdf-poppler');
const axios = require('axios');
const fs = require('fs');

async function processHandwrittenPDF(pdfPath) {
  // Step 1: Convert PDF to image
  const imagePath = await pdfPoppler.convert(pdfPath, {
    format: 'png',
    out_dir: './',
    out_prefix: 'output',
    page: 1,
  }).then(() => './output-1.png');

  // Step 2: Extract text with OCR
  const { data: { text } } = await Tesseract.recognize(
    imagePath,
    'eng',
    { logger: (m) => console.log(m) }
  );
  console.log('Extracted Text:', text);

  // Step 3: Send to AI
  // const aiResponse = await axios.post(
  //   'https://api.example.com/ai-endpoint',
  //   { text: text },
  //   {
  //     headers: {
  //       'Authorization': 'Bearer YOUR_API_KEY',
  //       'Content-Type': 'application/json',
  //     },
  //   }
  // );
  // console.log('AI Response:', aiResponse.data);

  // Clean up (optional)
  fs.unlinkSync(imagePath); // Remove temporary image
}

processHandwrittenPDF('./compiler design unit 5.pdf').catch(console.error);