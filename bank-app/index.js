const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// In-memory user "database"
const users = {
    alice: { password: 'alice', balance: 1000, coupons: [
        { id: 'Black-Friday-Coupon', percent: 5 },
        { id: 'Summer-Sale-Coupon', percent: 10 }
    ] },
    bob: { password: 'bob', balance: 1000, coupons: [] },
    attacker: { password: 'attacker', balance: 200, coupons: [] }
};

// Session settings
app.use(session({
    secret: 'secret@909',
    resave: false,                 // Don’t save unless session data is modified.
    saveUninitialized: false,      // Don’t create session until something is added to it.
    cookie: { 
        httpOnly: true             // Cannot be stolen by javascript.
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

// Redirect home page to the login page
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Show the login page
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
    const userData = users[user] || {}; 
    const balance = userData.balance ?? 0;
    const coupons = userData.coupons || [];
    let alert = '';
    if (req.query.error) { // transfer?error=1
        alert = '<div class="alert">Invalid recipient or insufficient funds.</div>';
    } else if (req.query.success_deleted) { // transfer?success_deleted=1
        alert = '<div class="alert success">Successfully deleted coupon.</div>';
    } else if (req.query.success) { // transfer?success=1
        alert = `<div class="alert success">Transfer completed successfully! Your remaining balance is ₹${balance}</div>`;
    }

    const couponBox = coupons.map(coupon => `
        <div class="coupon">
            <span>${coupon.id} - ${coupon.percent}% Cashback</span>
            <div>
                <form action="/coupon/delete" method="GET" style="display:inline;">
                    <input type="hidden" name="couponId" value="${coupon.id}">
                    <button type="submit" style="background-color:#f87171;">Delete</button>
                </form>
            </div>
        </div>
    `).join('');        

    const content = renderTemplate(path.join(__dirname, 'views', 'transfer.html'), {
        alertBox: alert,
        couponBox: couponBox
    });

    res.send(content);
});

// Transfer POST request
app.post('/transfer', (req, res) => {
    const sender = req.session.user;
    if (!sender) {
        return res.redirect('/login?error=2');
    }
    const { recipient, amount } = req.body;
    const amt = parseFloat(amount);

    if (!users[sender] || !users[recipient] || users[sender].balance < amt || amt <= 0) {
        return res.redirect('/transfer?error=1');
    }

    users[sender].balance -= amt;
    users[recipient].balance += amt;

    console.log(`Transferred amount ${amount}$ from ${sender} to ${recipient}!!!`)

    res.redirect('/transfer?success=1');
});

// GET request to delete the coupon
app.get('/coupon/delete', (req, res) => {
    const username = req.session.user;
    if (!username) {
        return res.redirect('/login?error=2');
    }
    
    const couponId = req.query.couponId;
    const user = users[username];
    
    user.coupons = user.coupons.filter(coupon => coupon.id !== couponId); // Remove coupon by filtering it out

    res.redirect('/transfer?success_deleted=1');
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
  