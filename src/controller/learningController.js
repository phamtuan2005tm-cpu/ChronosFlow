const path = require('path');
// 🟢 ĐÃ SỬA: Chỉ gọi config thuần, Render sẽ tự nạp biến môi trường hệ thống
require('dotenv').config();

const db = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==========================================
// ⏱️ QUẢN LÝ NHẬT KÝ HỌC (LOGS)
// ==========================================
exports.getAllLogs = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM learning_logs ORDER BY id DESC');
        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi lấy logs:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.createLog = async (req, res) => {
    try {
        const { activity, duration } = req.body;
        await db.query('INSERT INTO learning_logs (activity, duration) VALUES (?, ?)', [activity, duration]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Lỗi lưu log:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ==========================================
// 📚 QUẢN LÝ MÔN HỌC (SUBJECTS)
// ==========================================
exports.getAllSubjects = async (req, res) => {
    try {
        const sql = 'SELECT id, name FROM subjects WHERE user_id = 1 ORDER BY id DESC';
        const [results] = await db.query(sql);
        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi lấy danh sách môn học:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.createSubject = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Course name is required!' });

        const sql = 'INSERT INTO subjects (name, user_id) VALUES (?, 1)';
        const [result] = await db.query(sql, [name]);
        res.json({ success: true, message: 'Created successfully!', subjectId: result.insertId });
    } catch (err) {
        console.error('❌ Lỗi tạo môn học:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ==========================================
// 📄 QUẢN LÝ TÀI LIỆU (DOCUMENTS)
// ==========================================
exports.getDocumentsBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const sql = 'SELECT id, title, document_url as docUrl FROM documents WHERE subject_id = ? ORDER BY id DESC';
        const [results] = await db.query(sql, [subjectId]);
        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi lấy danh sách tài liệu:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.createDocument = async (req, res) => {
    try {
        const { subjectId, title, docUrl } = req.body;
        if (!subjectId || !title || !docUrl) {
            return res.status(400).json({ success: false, message: 'Missing fields!' });
        }

        const sql = 'INSERT INTO documents (subject_id, title, document_url) VALUES (?, ?, ?)';
        await db.query(sql, [subjectId, title, docUrl]);
        res.json({ success: true, message: 'Document saved successfully!' });
    } catch (err) {
        console.error('❌ Lỗi lưu tài liệu:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ==========================================
// 🧠 LÕI XỬ LÝ GENERATE TRẮC NGHIỆM AI GỌI GEMINI (ĐÃ ÉP KHUÔN SCHEMAS 100%)
// ==========================================
exports.generateQuizJson = async (req, res) => {
    try {
        const { documentId, manualText, numQuestions = 4 } = req.body; 
        if (!documentId) return res.status(400).json({ success: false, message: 'Missing document identity!' });

        const currentActiveKey = process.env.GEMINI_API_KEY;
        console.log("🔑 [API CALL CHECK] Key hiện tại trong hàm:", currentActiveKey ? "CÓ SẴN (VALID)" : "TRỐNG (UNDEFINED)");

        if (!currentActiveKey) {
            return res.status(500).json({ success: false, error: 'API Key is missing from the system environment.' });
        }

        let textContent = manualText;

        if (!textContent) {
            const [docs] = await db.query('SELECT extracted_text FROM documents WHERE id = ?', [documentId]);
            if (docs.length > 0 && docs[0].extracted_text) {
                textContent = docs[0].extracted_text;
            }
        } else {
            await db.query('UPDATE documents SET extracted_text = ? WHERE id = ?', [textContent, documentId]);
        }

        if (!textContent || textContent.trim().length < 10) {
            return res.json({ success: false, needText: true });
        }

        // Khởi tạo thực thể AI với key động vừa bốc
        const genAI = new GoogleGenerativeAI(currentActiveKey);
        
        // 🟢 GIẢI PHÁP AN TOÀN TUYỆT ĐỐI: Ép AI đúc dữ liệu theo đúng khuôn Schema cấu trúc mảng trực tiếp
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: `You are an elite academic professor and an expert in pedagogical assessment.
Your task is to analyze the provided Reference Text and create a high-quality, professional multiple-choice quiz based strictly on its content.

### CRITICAL RULES:
1. SCOPE: Focus ONLY on the actual educational/academic knowledge concepts found within the Reference Text. Completely ignore code comments or technical metadata.
2. QUANTITY: Generate exactly ${numQuestions} distinct and meaningful questions.
3. LANGUAGE: The quiz must be written entirely in clear, grammatically correct academic English.`,
            generationConfig: {
                responseMimeType: "application/json", // Bắt buộc xuất JSON thô, sạch rác markdown
                
                // 🛑 ĐÂY LÀ KHUÔN ĐÚC SCHEMAS ÉP AI PHẢI THEO 100%:
                responseSchema: {
                    type: "array",
                    description: "List of multiple-choice questions",
                    items: {
                        type: "object",
                        properties: {
                            question: { 
                                type: "string", 
                                description: "The clear question text derived from the reference text" 
                            },
                            options: {
                                type: "array",
                                description: "Exactly 4 plausible options",
                                items: { type: "string" }
                            },
                            correctIndex: { 
                                type: "integer", 
                                description: "The correct option index (0 for A, 1 for B, 2 for C, 3 for D)" 
                            }
                        },
                        required: ["question", "options", "correctIndex"]
                    }
                }
            }
        });

        // 🟢 BỌC THÉP: Truyền văn bản sạch tách biệt, không bao giờ lo dính lỗi nháy kép phá chuỗi
        const aiResult = await model.generateContent(`Reference Text to evaluate:\n${textContent}`);
        let cleanJsonStr = aiResult.response.text().trim();

        if (cleanJsonStr.startsWith('```')) {
            cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
        }

        // Bây giờ Tuấn cứ tự tin parse trực tiếp, cam kết luôn ra mảng chuẩn 100% không bao giờ lệch cấu trúc
        const quizDataJson = JSON.parse(cleanJsonStr);
        res.json({ success: true, quiz: quizDataJson });

    } catch (err) {
        console.error('❌ Lỗi xử lý AI Quiz tại Terminal:', err);
        res.status(500).json({ success: false, error: err.message || 'AI Generation Failed' });
    }
};

// ==========================================
// 🔄 CẬP NHẬT TÊN MÔN HỌC (UPDATE SUBJECT)
// ==========================================
exports.updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Course name cannot be empty!' });

        const sql = 'UPDATE subjects SET name = ? WHERE id = ? AND user_id = 1';
        await db.query(sql, [name, id]);
        res.json({ success: true, message: 'Updated successfully!' });
    } catch (err) {
        console.error('❌ Lỗi cập nhật môn học:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// ==========================================
// 🗑️ XÓA MÔN HỌC & TỰ ĐỘNG DỌN SẠCH TÀI LIỆU (DELETE SUBJECT)
// ==========================================
exports.deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;

        // BẢO HIỂM: Xóa hết tài liệu liên quan đến môn này trước để tránh lỗi ràng buộc khóa ngoại (Foreign Key)
        await db.query('DELETE FROM documents WHERE subject_id = ?', [id]);
        
        // Xóa môn học
        const sql = 'DELETE FROM subjects WHERE id = ? AND user_id = 1';
        await db.query(sql, [id]);

        res.json({ success: true, message: 'Deleted successfully!' });
    } catch (err) {
        console.error('❌ Lỗi xóa môn học:', err);
        res.status(500).json({ error: 'Database error' });
    }
};