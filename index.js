import express from "express";
import multer from "multer";

const port = 3000;
const app = express();
const upload = multer({dest: 'uploads/'})

app.get('/', (req, res) => {
    res.render('index.ejs');
})

app.post('/upload', upload.single('pdfFile'), (req, res) => {
    res.send('File uploaded successfully');
    console.log(req.file, req.body);
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
})