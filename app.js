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
    

app.get('/', (req, res) => {
    res.render('index.ejs', {user: req.user});
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
        res.render('pdfText.ejs', { transactions: data});

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error')
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
})
