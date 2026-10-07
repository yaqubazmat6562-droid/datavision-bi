// ==========================================================
// DATAVISION BI - SMART SUMMARY
// ==========================================================

(function() {
    "use strict";

    var summaryData = null;

    // Formatters
    function formatCurrency(n) {
        if (n === null || n === undefined) return "N/A";
        var abs = Math.abs(n);
        if (abs >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
        if (abs >= 1000) return "$" + (n / 1000).toFixed(1) + "K";
        return "$" + Number(n).toFixed(2);
    }

    function formatNumber(n) {
        if (n === null || n === undefined) return "N/A";
        var abs = Math.abs(n);
        if (abs >= 1000000) return (n / 1000000).toFixed(2) + "M";
        if (abs >= 1000) return (n / 1000).toFixed(1) + "K";
        return Number(n).toLocaleString();
    }

    function formatPercent(n) {
        if (n === null || n === undefined) return "N/A";
        return Number(n).toFixed(2) + "%";
    }

    function escapeHtml(v) {
        return String(v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Load Summary
    async function loadSummary() {
        try {
            var response = await fetch("/dashboard/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: window.SUMMARY_FILENAME })
            });

            var data = await response.json();

            if (!data.success) {
                document.getElementById("summaryLoadingMsg").textContent = "❌ " + (data.message || "Failed to load");
                return;
            }

            summaryData = data;
            renderAll(data);

            document.getElementById("summaryLoading").style.display = "none";
            document.getElementById("summaryContainer").style.display = "flex";

            document.getElementById("summaryLastUpdated").textContent =
                "Generated: " + new Date().toLocaleString();

        } catch (error) {
            console.error("Load error:", error);
            document.getElementById("summaryLoadingMsg").textContent = "❌ " + error.message;
        }
    }

    // Render All
    function renderAll(data) {
        renderOverview(data);
        renderKPIs(data);
        renderInsights(data);
        renderWarnings(data);
        renderRecommendations(data);
        renderTopPerformers(data);
        renderQualityScore(data);
    }

    // Overview
    function renderOverview(data) {
        var container = document.getElementById("summaryOverview");
        if (!container) return;

        var kpis = data.kpis || {};

        var items = [
            { label: "Total Rows", value: formatNumber(kpis.rows) },
            { label: "Total Columns", value: formatNumber(kpis.columns) },
            { label: "Missing Values", value: formatNumber(kpis.missing_values) },
            { label: "Duplicate Rows", value: formatNumber(kpis.duplicate_rows) }
        ];

        container.innerHTML = items.map(function(item) {
            return '<div class="summary-stat-card">' +
                '<div class="summary-stat-label">' + item.label + '</div>' +
                '<div class="summary-stat-value">' + item.value + '</div>' +
                '</div>';
        }).join("");
    }

    // KPIs
    function renderKPIs(data) {
        var container = document.getElementById("summaryKPIs");
        if (!container) return;

        var kpis = data.kpis || {};

        var items = [
            { icon: "💰", label: "Total Sales", value: formatCurrency(kpis.total_sales) },
            { icon: "💳", label: "Total Cost", value: formatCurrency(kpis.total_cost) },
            { icon: "📈", label: "Gross Profit", value: formatCurrency(kpis.profit) },
            { icon: "🎯", label: "Profit Margin", value: formatPercent(kpis.profit_margin) },
            { icon: "🧾", label: "Total Orders", value: formatNumber(kpis.total_orders) },
            { icon: "📦", label: "Units Sold", value: formatNumber(kpis.total_units) },
            { icon: "🛒", label: "Avg Order Value", value: formatCurrency(kpis.average_order_value) },
            { icon: "👥", label: "Unique Customers", value: formatNumber(kpis.unique_customers) }
        ];

        container.innerHTML = items.map(function(item) {
            return '<div class="summary-kpi-card">' +
                '<div class="summary-kpi-icon">' + item.icon + '</div>' +
                '<div class="summary-kpi-label">' + item.label + '</div>' +
                '<div class="summary-kpi-value">' + item.value + '</div>' +
                '</div>';
        }).join("");
    }

    // Insights
    function renderInsights(data) {
        var container = document.getElementById("summaryInsights");
        var section = document.getElementById("insightsSection");
        if (!container) return;

        var insights = data.insights || [];

        if (insights.length === 0) {
            if (section) section.style.display = "none";
            return;
        }

        container.innerHTML = insights.map(function(text) {
            return '<div class="summary-insight-item">' +
                '<span class="summary-item-icon">💡</span>' +
                '<span>' + escapeHtml(text) + '</span>' +
                '</div>';
        }).join("");
    }

    // Warnings
    function renderWarnings(data) {
        var container = document.getElementById("summaryWarnings");
        var section = document.getElementById("warningsSection");
        if (!container) return;

        var warnings = data.warnings || [];

        if (warnings.length === 0) {
            if (section) section.style.display = "none";
            return;
        }

        container.innerHTML = warnings.map(function(text) {
            return '<div class="summary-warning-item">' +
                '<span class="summary-item-icon">⚠️</span>' +
                '<span>' + escapeHtml(text) + '</span>' +
                '</div>';
        }).join("");
    }

    // Recommendations
    function renderRecommendations(data) {
        var container = document.getElementById("summaryRecommendations");
        var section = document.getElementById("recommendationsSection");
        if (!container) return;

        var recs = data.recommendations || [];

        if (recs.length === 0) {
            if (section) section.style.display = "none";
            return;
        }

        container.innerHTML = recs.map(function(text) {
            return '<div class="summary-recommendation-item">' +
                '<span class="summary-item-icon">✅</span>' +
                '<span>' + escapeHtml(text) + '</span>' +
                '</div>';
        }).join("");
    }

    // Top Performers
    function renderTopPerformers(data) {
        var container = document.getElementById("summaryTopPerformers");
        var section = document.getElementById("topPerformersSection");
        if (!container) return;

        var kpis = data.kpis || {};

        // Extract top performers from insights
        var performers = [];
        var insights = data.insights || [];

        insights.forEach(function(text) {
            if (text.indexOf("Top product") === 0) {
                performers.push({ icon: "🏆", label: "Top Product", text: text });
            } else if (text.indexOf("Top category") === 0) {
                performers.push({ icon: "📦", label: "Top Category", text: text });
            }
        });

        // Fallback: generic performers
        if (performers.length === 0) {
            if (kpis.total_sales) {
                performers.push({ icon: "💰", label: "Total Sales", text: "Sales reached " + formatCurrency(kpis.total_sales) });
            }
            if (kpis.profit) {
                performers.push({ icon: "📈", label: "Profit", text: "Profit is " + formatCurrency(kpis.profit) });
            }
        }

        if (performers.length === 0) {
            if (section) section.style.display = "none";
            return;
        }

        container.innerHTML = performers.map(function(p) {
            var cleanText = p.text.replace(/^Top product by sales:\s*/i, "").replace(/^Top category by sales:\s*/i, "");
            return '<div class="summary-performer-card">' +
                '<div class="summary-performer-label">' + p.icon + ' ' + p.label + '</div>' +
                '<div class="summary-performer-name">' + escapeHtml(cleanText) + '</div>' +
                '</div>';
        }).join("");
    }

    // Quality Score
    function renderQualityScore(data) {
        var container = document.getElementById("summaryQualityScore");
        if (!container) return;

        var kpis = data.kpis || {};
        var rows = kpis.rows || 0;
        var missing = kpis.missing_values || 0;
        var duplicates = kpis.duplicate_rows || 0;

        var totalCells = rows * (kpis.columns || 1);
        var qualityScore = 100;

        if (totalCells > 0) {
            var missingRatio = missing / totalCells;
            var dupRatio = duplicates / Math.max(rows, 1);
            qualityScore = Math.max(0, Math.min(100, 100 - (missingRatio * 50 + dupRatio * 50)));
        }

        var color = qualityScore >= 80 ? "#16a34a" : (qualityScore >= 50 ? "#f59e0b" : "#dc2626");
        var label = qualityScore >= 80 ? "Excellent" : (qualityScore >= 50 ? "Good" : "Needs Improvement");

        container.innerHTML =
            '<div class="summary-quality-score" style="color:' + color + ';">' +
                qualityScore.toFixed(1) + '%' +
            '</div>' +
            '<div class="summary-quality-label">' + label + ' Quality</div>' +
            '<div class="summary-quality-bar">' +
                '<div class="summary-quality-fill" style="width:' + qualityScore + '%;background:' + color + ';"></div>' +
            '</div>';
    }

    // Download PDF
    function downloadSummaryPDF() {
        var container = document.getElementById("summaryContainer");
        if (!container) return;

        var filename = (window.SUMMARY_FILENAME || "summary").replace(/\.[^/.]+$/, "");
        var now = new Date();
        var ts = now.getFullYear() + String(now.getMonth()+1).padStart(2,"0") + String(now.getDate()).padStart(2,"0");

        var options = {
            margin: [10, 10, 10, 10],
            filename: filename + "_summary_" + ts + ".pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] }
        };

        html2pdf().set(options).from(container).save();
    }

    // Init
    document.addEventListener("DOMContentLoaded", function() {
        loadSummary();
    });

    window.downloadSummaryPDF = downloadSummaryPDF;

})();