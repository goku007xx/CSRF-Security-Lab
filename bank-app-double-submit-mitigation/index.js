const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

// In-memory user "database" with per-user coupons
const users = {
  alice: {
    password: 'alice',
    balance: 1000,
    coupons: [
      { code: 'ALICE50', discount: 0.5, label: '50% off' },
      { code: 'ALICEFREE', discount: 0.9, label: '90% off' }
    ]
  },
  bob: {
    password: 'bob',
    balance: 1000,
    coupons: [
      { code: 'BOB10', discount: 0.1, label: '10% off' }
    ]
  },
  attacker: {
    password: 'attacker',
    balance: 0,
    coupons: []
  }
};

// Middleware
app.use(cookieParser()); // Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: 'csrf-demo-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'views')));

// Helper: Check if user is logged in
const requireLogin = (req, res, next) => {
    if (!req.session.username || !users[req.session.username]) {
        return res.redirect('/login?mustlogin=1');
    }
    next();
};

// CSRF token generation function
function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Generate HMAC-signed CSRF token
/*
function generateSignedCSRF() {
    const token = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
    return `${token}.${signature}`;
}
*/

// CSRF protection middleware
/*
function csrfProtection(req, res, next) {
    const cookie = req.cookies.csrfToken;
    const tokenFromForm = req.body.csrfToken;

    if (!cookie || !tokenFromForm) {
        return res.status(403).send('Missing CSRF token');
    }

    const tokenInCookie = cookie.split('.')[0];
    if (tokenInCookie !== tokenFromForm) {
        return res.status(403).send('CSRF token mismatch');
    }

    // Rebuild the signed token from form's token
    const reconstructedSignedToken = `${tokenFromForm}.${crypto.createHmac('sha256', CSRF_SECRET).update(tokenFromForm).digest('hex')}`;

    if (cookie !== reconstructedSignedToken) {
        return res.status(403).send('Invalid CSRF token');
    }
    console.log('CSRF token verified');
    next();
}
*/
// Routes

// GET /login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Home redirects to login or transfer
app.get('/', (req, res) => {
    if (req.session.username && users[req.session.username]) {
        return res.redirect('/transfer');
    }
    res.redirect('/login');
});

// POST /login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        req.session.username = username;
        const csrfToken = generateCSRFToken();
        res.cookie('csrfToken', csrfToken , {
            httpOnly: false,      // Must be readable by client-side JavaScript
            secure: false         // Set to false due to HTTP
        });
        return res.redirect('/transfer');
    }
    res.redirect('/login?error=1');
});

// GET /transfer
app.get('/transfer', requireLogin, (req, res) => {
    const username = req.session.username;
    const balance = users[username].balance;

    fs.readFile(path.join(__dirname, 'views', 'transfer.html'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error loading page');
        }
        const page = data.replace('{{balance}}', balance);
        res.send(page);
    });
});

// POST /transfer
app.post('/transfer', requireLogin, (req, res) => {
    const sender = req.session.username;
    const { to, amount, coupon } = req.body;

    const cookie = req.cookies.csrfToken;
    const tokenFromForm = req.body.csrfToken;

    // If the cookie or token from form is missing, send the CSRF failed page
    if (!cookie || !tokenFromForm) {
        return res.status(403).sendFile(path.join(__dirname, 'views', 'csrf-failed.html'));
    }

    // If the cookie and token from form do not match, send the CSRF failed page
    if (cookie !== tokenFromForm) {
        return res.status(403).sendFile(path.join(__dirname, 'views', 'csrf-failed.html'));
    }

    let amt = parseInt(amount, 10);

    // Coupon logic: only apply if user has the coupon
    let appliedCoupon = null;
    if (coupon) {
        const userCoupon = users[sender].coupons.find(c => c.code === coupon);
        if (!userCoupon) {
            // Invalid coupon: show error
            return res.redirect('/transfer?error=invalidcoupon');
        }
        amt = Math.ceil(amt * (1 - userCoupon.discount));
        appliedCoupon = userCoupon;
    }

    // Basic validation
    if (
        !to ||
        !users[to] ||
        isNaN(amt) ||
        amt <= 0 ||
        users[sender].balance < amt
    ) {
        return res.redirect('/transfer?error=1');
    }

    // Transfer funds
    users[sender].balance -= amt;
    users[to].balance += amt;

    // Remove coupon after use
    if (appliedCoupon) {
        users[sender].coupons = users[sender].coupons.filter(c => c.code !== appliedCoupon.code);
    }

    let redirectUrl = '/transfer?success=1';
    if (appliedCoupon) {
        redirectUrl += `&coupon=${encodeURIComponent(appliedCoupon.code)}`;
    }
    res.redirect(redirectUrl);
});

// GET /logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login?logout=1');
    });
});

// GET /balance (for demo/debug)
app.get('/balance', requireLogin, (req, res) => {
    const username = req.session.username;
    res.send(
        `<h2>Balance for ${username}: $${users[username].balance}</h2>
        <a href="/transfer">Back to Transfer</a>`
    );
});

// GET /coupons (returns JSON list of coupons for logged-in user)
app.get('/coupons', requireLogin, (req, res) => {
    const username = req.session.username;
    res.json(users[username].coupons);
});

// GET /delete-coupon?code=COUPONCODE
app.get('/delete-coupon', requireLogin, (req, res) => {
    const username = req.session.username;
    const cookie = req.cookies.csrfToken;
    const code = req.query.code;
    const tokenFromForm = req.query.csrfToken;

    // If the cookie or token from form is missing, send the CSRF failed page
    if (!cookie || !tokenFromForm) {
        return res.status(403).sendFile(path.join(__dirname, 'views', 'csrf-failed.html'));
    }

    // If the cookie and token from form do not match, send the CSRF failed page
    if (cookie !== tokenFromForm) {
        return res.status(403).sendFile(path.join(__dirname, 'views', 'csrf-failed.html'));
    }

    if (code) {
        users[username].coupons = users[username].coupons.filter(c => c.code !== code);
        return res.redirect(`/transfer?deletedcoupon=${encodeURIComponent(code)}`);
    }
    res.redirect('/transfer');
});

// Start server
app.listen(PORT, () => {
    console.log(`Double Submit Mitigation Bank app running at http://localhost:${PORT}`);
});