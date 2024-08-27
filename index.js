import express from "express";
import multer from "multer";
import path, { parse } from "path";
import { parsePdf } from "./pdfParser.js";
import axios from "axios";

const port = 3000;
const app = express();
const upload = multer({dest: 'uploads/'})

app.get('/', (req, res) => {
    res.render('index.ejs');
})

app.post('/upload', upload.single('pdfFile'), async (req, res) => {
    try {
        const pdfText = await parsePdf(req.file.path);

        // send POST to Flask API using axios
        const response = await axios.post('http://localhost:5001/parse', pdfText, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        const data = response.data;
        res.render('pdfText.ejs', { transactions: data});

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error')
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
})