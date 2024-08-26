import express from "express";
import multer from "multer";
import path, { parse } from "path";
import { parsePdf } from "./pdfParser.js";

const port = 3000;
const app = express();
const upload = multer({dest: 'uploads/'})

app.get('/', (req, res) => {
    res.render('index.ejs');
})

app.post('/upload', upload.single('pdfFile'), async (req, res) => {
    // res.send('File uploaded successfully');
    
    const pdfText = await parsePdf(req.file.path);
    res.render('pdfText.ejs', {pdfText});

})

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
})