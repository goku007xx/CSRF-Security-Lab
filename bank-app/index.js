const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// In-memory user "database"
const users = {
    alice: { password: 'alice', balance: 1000 },
    bob: { password: 'bob', balance: 1000 },
    attacker: { password: 'attacker', balance: 200 }
};

// Session settings
app.use(session({
    secret: 'secret@909',
    resave: false,                 // Don’t save unless session data is modified.
    saveUninitialized: false,      // Don’t create session until something is added to it.
    cookie: { 
        httpOnly: true 
    }
}));

// The req.body object will contain values of any type instead of just strings.
app.use(bodyParser.urlencoded({ extended: true }));

// Utility to render HTML with replacement
function renderTemplate(filePath, replacements = {}) {
    let template = fs.readFileSync(filePath, 'utf8');
    for (const key in replacements) {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), replacements[key]);
    }
    return template;
}

// Login page
app.get('/login', (req, res) => {
    const error_code = req.query.error;
    let error = '';

    if (error_code === '1') {
        error = 'Invalid credentials. Please try again.';
    } else if (error_code === '2') {
        error = 'You have not logged in. Please login.';
    }
    const content = renderTemplate(path.join(__dirname, 'views', 'login.html'), {
        alertBox: error ? `<div id="alert" class="alert">${error}</div>` : ''
    });
    res.send(content);
});

// Login POST request
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!users[username] || users[username].password !== password) {
        return res.redirect('/login?error=1');
    }
    req.session.user = username;
    res.redirect('/transfer');
});

// Transfer form page
app.get('/transfer', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect('/login?error=2');
    }
    const balance = users[user]?.balance ?? 0;
    const alert = req.query.error
        ? '<div class="alert">Invalid recipient or insufficient funds.</div>'
        : req.query.success
        ? `<div class="alert success">Transfer completed successfully! Your remaining balance is ${balance}$</div>`
        : '';

    const content = renderTemplate(path.join(__dirname, 'views', 'transfer.html'), {
        alertBox: alert
    });

    res.send(content);
});

// Transfer POST request
app.post('/transfer', (req, res) => {
    const sender = req.session.user;
    const { recipient, amount } = req.body;
    const amt = parseFloat(amount);

    if (!users[sender] || !users[recipient] || users[sender].balance < amt || amt <= 0) {
        return res.redirect('/transfer?error=1');
    }

    users[sender].balance -= amt;
    users[recipient].balance += amt;

    res.redirect('/transfer?success=1');
});

// Logout POST request
app.post('/logout', (req, res) => {
    req.session.destroy(err => {    // Remove the session from the server side.
        if (err) {
            return res.send('There was an error in logging out');
        }
        res.clearCookie('connect.sid'); // Remove the cookie on the client side
        res.redirect('/login');
    });
});

// Listen on Port 3000
app.listen(PORT, () => {
    console.log(`Bank app is running at http://localhost:${PORT}`);
});
  