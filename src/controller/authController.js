const db = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const getLoginPage = (req, res) => {
    res.render('registerPage.ejs'); // Giữ nguyên đúng tên file vật lý của Tuấn
}
const getRegisterPage = (req, res) => {
    res.render('registerPage.ejs');
}
const getHomePage = (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    res.render('homePage.ejs');
}

const handleLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const [rows] = await db.execute("SELECT * FROM users WHERE user_email = ?", [email]);

        if(rows.length === 0) {
            // 🟢 Đã sửa thành registerPage.ejs chuẩn ký tự hoa để tránh lỗi Linux
            return res.render('registerPage.ejs', {
                title: 'Sign In - ChronosFlow',
                error: 'Account does not exist!'
            });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.user_password);
        
        if(!isMatch) {
            return res.render('registerPage.ejs', {
                title: 'Sign In - ChronosFlow',
                error: 'Incorrect Password!'
            })
        }
        req.session.user = {
            id: user.id,
            email: user.user_email
        };
        return res.redirect('/homePage');
    } catch (err) {
        console.error('❌ Lỗi handleLogin:', err);
        return res.status(500).send(`Lỗi hệ thống máy chủ: ${err.message}`);
    }
}

const handleRegister = async (req, res) => {
    const {email, password, confirmPassword} = req.body;

    if (password !== confirmPassword) {
        // 🟢 Đã sửa đồng bộ sang chữ P viết hoa cho khớp tên file views
        return res.render('registerPage.ejs', { 
            title: 'Sign Up - ChronosFlow', 
            error: 'Passwords do not match!' 
        });
    }
    try {
        const [existingUser] = await db.execute('SELECT * FROM users WHERE user_email = ?', [email]);
        
        if (existingUser.length > 0) {
            return res.render('registerPage.ejs', { 
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
        console.error('❌ Lỗi handleRegister chí mạng:', err);
        // Ép văng lỗi chi tiết ra màn hình nếu database mây bị trục trặc cấu hình bảng
        return res.status(500).send(`Lỗi hệ thống máy chủ khi ghi nhận data: ${err.message}`);
    }
}

const renderForgotPassword = (req, res) => {
    res.render('forgot-password');
};

const handleForgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE user_email = ?', [email]);
        
        if (users.length === 0) {
            return res.send('<script>alert("Email address not found!"); window.history.back();</script>');
        }

        const token = crypto.randomBytes(16).toString('hex');
        const expires = new Date(Date.now() + 15 * 60 * 1000); 

        await db.execute(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE user_email = ?',
            [token, expires, email]
        );

        // 🟢 Bọc thép link động: Tự động nhận diện domain Render khi chạy production hoặc localhost khi chạy dưới máy
        const baseUrl = req.get('host').includes('localhost') ? `http://localhost:${process.env.PORT || 3000}` : `https://${req.get('host')}`;
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD 
            }
        });

        const mailOptions = {
            from: `"ChronosFlow Team" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔒 Reset Your ChronosFlow Password',
            html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #0F2854; text-align: center;">ChronosFlow</h2>
                    <p>Hi there,</p>
                    <p>We received a request to reset your password for your ChronosFlow account. Click the button below to set up a new password:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${resetLink}" style="background-color: #1C4D8D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #64748b; font-size: 12px;">This link will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.send('<script>alert("A password reset link has been sent to your email!"); window.location.href = "/login";</script>');

    } catch (error) {
        console.error("🚨 Forgot Password Controller Error:", error);
        res.status(500).send("Internal Server Error");
    }
}

const renderResetPassword = async (req, res) => {
    const { token } = req.query;

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.send('<script>alert("Password reset token is invalid or has expired!"); window.location.href = "/login";</script>');
        }

        res.render('reset-password', { token });
    } catch (error) {
        console.error("🚨 Render Reset Password Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

const handleResetPassword = async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send('<script>alert("Passwords do not match!"); window.history.back();</script>');
    }

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.send('<script>alert("Token expired or invalid transaction!"); window.location.href = "/login";</script>');
        }

        const userEmail = users[0].user_email;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds); 

        await db.execute(
            'UPDATE users SET user_password = ?, reset_token = NULL, reset_token_expires = NULL WHERE user_email = ?',
            [hashedPassword, userEmail]
        );

        res.send('<script>alert("Password updated successfully! Please log in with your new password."); window.location.href = "/login";</script>');
    } catch (error) {
        console.error("🚨 Handle Reset Password Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    getLoginPage,
    getRegisterPage,
    getHomePage,
    handleRegister,
    handleLogin,
    renderForgotPassword,
    handleForgotPassword,
    renderResetPassword, 
    handleResetPassword  
};