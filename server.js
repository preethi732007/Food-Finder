const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// 1. Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Nodemailer Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// Helper function to send email notifications
async function sendEmailAlert(subjectText, bodyText) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'jeyapreetha7307@gmail.com', 
            subject: subjectText,
            text: bodyText
        });
        console.log('Email alert sent successfully!');
    } catch (err) {
        console.error('Email Error:', err.message);
    }
}

// 3. SIGNUP API ROUTE (Saves to Supabase & Sends Email Alert)
app.post('/api/signup', async (req, res) => {
    try {
        const { name, last_name, email, password, role } = req.body;

        const { data, error } = await supabase
            .from('profiles')
            .insert([{ name, last_name, email, password, role }]);

        if (error) {
            console.error('Supabase DB Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // Trigger Email Alert
        await sendEmailAlert(
            'New FoodBridge Registration!', 
            `A new user just registered on FoodBridge:\n\nName: ${name} ${last_name || ''}\nEmail: ${email}\nRole: ${role}`
        );

        res.status(200).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Server Signup Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. CONTACT API ROUTE (Saves to Supabase & Sends Email Alert)
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message, subject } = req.body;

        const { data, error } = await supabase
            .from('contacts')
            .insert([{ name, email, message, subject }]);

        if (error) {
            console.error('Supabase Contact Error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // Trigger Email Alert
        await sendEmailAlert(
            `New Contact Message: ${subject || 'General Inquiry'}`, 
            `You received a new message from your contact form:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
        );

        res.status(200).json({ message: 'Message saved successfully!' });
    } catch (err) {
        console.error('Server Contact Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. LOGIN API ROUTE (Verifies email and password)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .limit(1);

        if (error) {
            console.error('Supabase query error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(400).json({ error: 'User not found with this email.' });
        }

        const user = data[0];

        // Verify password
        if (user.password !== password) {
            return res.status(400).json({ error: 'Incorrect password!' });
        }

        // Optional email alert wrapped safely
        try {
            await sendEmailAlert(
                'FoodBridge User Logged In',
                `User ${user.name || 'Member'} (${email}) just logged into their account.`
            );
        } catch (emailErr) {
            console.error('Email alert skipped:', emailErr.message);
        }

        return res.status(200).json({ message: 'Login successful!', user });

    } catch (err) {
        console.error('Server Login Exception:', err.message);
        return res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FoodBridge backend server running on port ${PORT}`);
});