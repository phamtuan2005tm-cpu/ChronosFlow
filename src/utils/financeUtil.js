const FinanceUtil = {
    // Chuyển đổi chuỗi dạng "50k", "100" thành số nguyên thô 50000, 100000
    parseInput: (input) => {
        if (!input) return 0;
        let clean = input.toString().toLowerCase().trim();
        let multiplier = 1;

        if (clean.endsWith('k')) {
            multiplier = 1000;
            clean = clean.slice(0, -1).trim();
        }

        const value = parseFloat(clean);
        return isNaN(value) ? 0 : Math.round(value * multiplier);
    },

    // Chuyển ngược số từ DB (50000) thành chuỗi hiển thị dạng "50k"
    formatDisplay: (amount) => {
        const num = parseFloat(amount);
        if (isNaN(num) || num === 0) return "0k";
        return (num / 1000) + "k";
    }
};

module.exports = FinanceUtil;