const db = require('../config/database');
const bcrypt = require('bcrypt');

const getLoginPage = (req, res) => {
    res.render('loginPage.ejs');
}
const getRegisterPage = (req, res) => {
    res.render('registerPage.ejs');
}
const getHomePage = (req, res) => {
    res.render('homePage.ejs');
}
const handleLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const [rows] = await db.execute("SELECT * FROM users WHERE user_email = ?", [email]);

        if(rows.length === 0) {
            return res.render('loginPage', {
                title: 'Sign In - ChronosFlow',
                error: 'Account does not exist!'
            });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.user_password);
        
        if(!isMatch) {
            return res.render('loginPage', {
                title: 'Sign In - ChronosFlow',
                error: 'Incorrect Password!'
            })
        }
        return res.redirect('/homePage');
    } catch (err) {
        console.error('❌ Lỗi handleLogin:', err);
        return res.status(500).send('Lỗi hệ thống máy chủ.');
    }
}

const handleRegister = async (req, res) => {
    const {email, password, confirmPassword} = req.body;

    if (password !== confirmPassword) {
        return res.render('registerPage', { 
            title: 'Sign Up - ChronosFlow', 
            error: 'Passwords do not match!' 
        });
    }
    try {
        const [existingUser] = await db.execute('SELECT * FROM users WHERE user_email = ?', [email]);
        
        if (existingUser.length > 0) {
            return res.render('registerPage', { 
                title: 'Sign Up - ChronosFlow', 
                error: 'Email is already registered!' 
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.execute(
            'INSERT INTO users (user_email, user_password) VALUES (?, ?)',
            [email, hashedPassword]
        );

        return res.redirect('/login');
    } catch (err) {
        console.error('❌ Lỗi handleRegister:', err);
        return res.status(500).send('Lỗi hệ thống máy chủ.');
    }
}

module.exports = {
    getLoginPage, 
    getRegisterPage, 
    getHomePage,
    handleLogin, 
    handleRegister
}

