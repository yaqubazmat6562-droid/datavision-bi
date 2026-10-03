// static/js/utils/api.js

/**
 * API helper for DATAVISION BI
 */

const API = {
    
    async postForm(url, formData) {
        const response = await fetch(url, {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Server error: ${response.status}`);
        }
        
        return response.json();
    },
    
    async postJSON(url, data) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Server error: ${response.status}`);
        }
        
        return response.json();
    },
    
    async get(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return response.json();
    }
};


// UI Helpers
const UI = {
    
    showMessage(text, type = "info") {
        const message = document.getElementById("message");
        if (!message) return;
        
        message.innerText = text;
        message.classList.remove("hidden");
        
        const colors = {
            success: { bg: "#dcfce7", color: "#166534" },
            error: { bg: "#fee2e2", color: "#991b1b" },
            info: { bg: "#dbeafe", color: "#1e40af" },
            warning: { bg: "#fef3c7", color: "#92400e" }
        };
        
        const style = colors[type] || colors.info;
        message.style.background = style.bg;
        message.style.color = style.color;
    },
    
    showLoading() {
        const loading = document.getElementById("loading");
        if (loading) loading.classList.remove("hidden");
    },
    
    hideLoading() {
        const loading = document.getElementById("loading");
        if (loading) loading.classList.add("hidden");
    },
    
    scrollTo(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    },
    
    formatCurrency(value) {
        if (value === null || value === undefined) return "N/A";
        return "₹ " + Number(value).toLocaleString("en-IN", {
            maximumFractionDigits: 0
        });
    },
    
    formatNumber(value) {
        if (value === null || value === undefined) return "N/A";
        return Number(value).toLocaleString("en-IN");
    },
    
    formatPercent(value) {
        if (value === null || value === undefined) return "N/A";
        return Number(value).toFixed(1) + "%";
    },
    
    escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
};