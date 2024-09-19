import express from "express";
import multer from "multer";
import path from "path";
import { parsePdf } from "./pdfParser.js";
import axios from "axios";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from 'dotenv';
import pool from "./db.js";

dotenv.config(); // load environment variables

const port = 3000;
const app = express();
const upload = multer({dest: 'uploads/'})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

// sets up session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // check if the user exists
            let [rows] = await pool.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);
            let user = rows[0];

            if (!user) {
                const [result] = await pool.query('INSERT INTO users (google_id, email, username) VALUES (?, ?, ?)',
                    [profile.id, profile.emails[0].value, profile.displayName]);
                
                user = {
                    id: result.insertId,
                    google_id: profile.id,
                    email: profile.emails[0].value,
                    username: profile.displayName
                };
            }
            return done(null, user);

        } catch {
            console.error('database error:', error);
            return done(error, null);
        }

    }
));

// test the database connection
app.get('/db-test', async (req, res) => {
    try {
        const username = 'sampleuser2';
        const email = 'sampleuser2@example.com';

        // insert sample user into users table

        const [result] = await pool.query(
            'INSERT INTO users (username, email) VALUES (?, ?)',
            [username, email]
        );
        res.send(`User inserted with ID: ${result.insertId}`);
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).send('Database connection failed.');
    }
});

// serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user);
}); 

// deserialize user from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/auth/google',
    passport.authenticate('google', {scope: ['profile', 'email']})
);

app.get('/google/callback',
    passport.authenticate('google', {failureRedirect: '/login'}),
    (req, res) => {
        res.redirect('/');
    }
)

app.use(express.json());

app.post('/update-description', async(req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({message: 'You must be logged in to update descriptions'});
    }

    const { pdfId, transactionId, description } = req.body;

    if (!pdfId || !transactionId || typeof description !== 'string') {
        return res.status(400).json({ message: 'Invalid input.' });
    }

    try {
        const [pdfRows] = await pool.query(
            'SELECT id FROM pdfs WHERE id = ? AND user_id = ?',
            [pdfId, req.user.id]
        );
        
        if (pdfRows.length === 0) {
            return res.status(404).json({ message: 'PDF not found or you do not have permission to update it. '});

        }

        const [result] = await pool.query(
            'UPDATE transactions SET user_description = ? WHERE pdf_id = ? AND transaction_id = ?',
            [description, pdfId, transactionId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Transaction not found for this PDF.' });
        }

        res.json({ message: 'Description updated successfully.' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'An error occurred while updating the description.' });
    }
})
    

app.get('/', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const [pdfs] = await pool.query(
                'Slect id, filename, upload_date FROM pdfs WHERE user_id = ? ORDER BY upload_date DESC',
                [req.user.id]
            );
            res.render('index.ejs', { user: req.user, pdfs: pdfs });
        } catch (error) {
            console.error('Database erorr:', error);
            res.render('index.ejs', { user: req.user, pdfs: [] });
        }
    } else {
        res.render('index.ejs', { user: null, pdfs: [] });
    }
})

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout', err);
        }
        res.redirect('/');
    })
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
        const isAuthenticated = req.isAuthenticated();
        let pdfId = null;

        // check if user is authenticated
        if (isAuthenticated) {
            try {
                // save pdf metadata and transactions
                const [pdfResult] = await pool.query('INSERT INTO pdfs (user_id, filename, upload_date) VALUES (?, ?, NOW())',
                    [req.user.id, req.file.filename]);  

                pdfId = pdfResult.insertId;

                // save transactions
                for (let transaction of data) {
                    await pool.query(`
                        INSERT INTO transactions 
                        (pdf_id, transaction_date, posting_date, description, transaction_id, amount) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            pdfId,
                            convertDate(transaction['Transaction Date']),
                            convertDate(transaction['Posting Date']),
                            transaction['Description'],
                            transaction['Transaction ID'],
                            parseFloat(transaction['Amount'].replace('$', ''))
                        ]
                    );            
                }

            } catch (dbError) {
                console.error('Database error:', dbError);
            }
        }

        res.render('pdfText.ejs', { 
            transactions: data,
            isAuthenticated: isAuthenticated, // pass this to template
            pdfId: pdfId
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error')
    }
})

app.get('/view-pdf:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
})

function convertDate(dateString) {
    const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    const [month, day] = dateString.split(' ');
    const year = new Date().getFullYear(); // Assumes current year, adjust if needed
    return `${year}-${months[month]}-${day.padStart(2, '0')}`;
}