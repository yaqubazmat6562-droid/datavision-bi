        // ==========================================================
    // CURRENCY SYSTEM
    // ==========================================================
    var CURRENCY_SYMBOLS = {
        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        PKR: "₨",
        AED: "د.إ",
        SAR: "﷼",
        JPY: "¥",
        CNY: "¥",
        CAD: "C$",
        AUD: "A$",
        SGD: "S$",
        MYR: "RM",
        BDT: "৳",
        NPR: "₨",
        LKR: "Rs",
        ZAR: "R",
        BRL: "R$",
        RUB: "₽",
        TRY: "₺"
    };

    var CURRENCY_LOCALES = {
        INR: "en-IN",
        USD: "en-US",
        EUR: "de-DE",
        GBP: "en-GB",
        PKR: "en-PK",
        AED: "ar-AE",
        SAR: "ar-SA",
        JPY: "ja-JP",
        CNY: "zh-CN",
        CAD: "en-CA",
        AUD: "en-AU",
        SGD: "en-SG",
        MYR: "ms-MY",
        BDT: "bn-BD",
        NPR: "ne-NP",
        LKR: "si-LK",
        ZAR: "en-ZA",
        BRL: "pt-BR",
        RUB: "ru-RU",
        TRY: "tr-TR"
    };

    var currentCurrency = "INR"; // Default
        // Filter field configuration
    var FILTER_CONFIG = {
        date_from: { label: "From Date", type: "date" },
        date_to: { label: "To Date", type: "date" },
        product: { label: "Product", type: "select", placeholder: "All Products" },
        category: { label: "Category", type: "select", placeholder: "All Categories" },
        state: { label: "State", type: "select", placeholder: "All States" },
        city: { label: "City", type: "select", placeholder: "All Cities" },
        order_type: { label: "Order Type", type: "select", placeholder: "All Order Types" },
        customer: { label: "Customer", type: "select", placeholder: "All Customers" }
    };
    // ==========================================================
    // CHART TYPE PREFERENCES (store user choices)
    // ==========================================================
    var chartTypePreferences = {
    salesTrendChart: "line",
    productChart: "bar",
    categoryChart: "doughnut",
    profitTrendChart: "line",
    orderTypeChart: "doughnut",
    stateChart: "horizontalBar",
    customerChart: "horizontalBar"
};

// Saare 10 chart types ka config
var CHART_TYPE_MAP = {
    line:          { jsType: "line",       indexAxis: "x", fill: false, legend: true },
    area:          { jsType: "line",       indexAxis: "x", fill: true,  legend: true },
    bar:           { jsType: "bar",        indexAxis: "x", fill: false, legend: false },
    horizontalBar: { jsType: "bar",        indexAxis: "y", fill: false, legend: false },
    stackedBar:    { jsType: "bar",        indexAxis: "x", fill: false, legend: true, stacked: true },
    pie:           { jsType: "pie",        indexAxis: "x", fill: false, legend: true },
    doughnut:      { jsType: "doughnut",   indexAxis: "x", fill: false, legend: true },
    polarArea:     { jsType: "polarArea",  indexAxis: "x", fill: false, legend: true },
    radar:         { jsType: "radar",      indexAxis: "x", fill: true,  legend: true },
    scatter:       { jsType: "scatter",    indexAxis: "x", fill: false, legend: true },
    bubble:        { jsType: "bubble",     indexAxis: "x", fill: false, legend: true }
};

// Color palette for pie/doughnut/polar charts
var CHART_COLORS = [
    "#00b4d8", "#0b1f3a", "#16a34a", "#f59e0b",
    "#dc2626", "#8b5cf6", "#06b6d4", "#84cc16",
    "#ec4899", "#f97316", "#14b8a6", "#a855f7"
];
// DATAVISION BI - Main JavaScript
// Clean minimal version

(function() {
    "use strict";

    // ==========================================================
    // GLOBAL STATE
    // ==========================================================
    var appState = {
        currentFilename: "",
        dashboardFilename: "",
        dashboardData: null,
        explorerFilename: "",
        queryFilename: "",
        dashboardFilterOptions: {}
    };

    // ==========================================================
    // UTILITIES
    // ==========================================================
    function showMessage(text, type) {
        type = type || "info";
        var message = document.getElementById("message");
        if (!message) return;

        message.innerText = text;
        message.classList.remove("hidden");

        var colors = {
            success: ["#dcfce7", "#166534"],
            error: ["#fee2e2", "#991b1b"],
            info: ["#dbeafe", "#1e40af"],
            warning: ["#fef3c7", "#92400e"]
        };
        var c = colors[type] || colors.info;
        message.style.background = c[0];
        message.style.color = c[1];
    }

    function showLoading() {
        var el = document.getElementById("loading");
        if (el) el.classList.remove("hidden");
    }

    function hideLoading() {
        var el = document.getElementById("loading");
        if (el) el.classList.add("hidden");
    }

        function formatCurrency(value) {
        if (value === null || value === undefined) return "N/A";

        var symbol = CURRENCY_SYMBOLS[currentCurrency] || "₹";
        var locale = CURRENCY_LOCALES[currentCurrency] || "en-IN";

        try {
            return symbol + " " + Number(value).toLocaleString(locale, {
                maximumFractionDigits: 0
            });
        } catch (e) {
            return symbol + " " + Number(value).toLocaleString("en-US", {
                maximumFractionDigits: 0
            });
        }
    }

    function changeCurrency(code) {
        currentCurrency = code;
        try {
            localStorage.setItem("datavision_currency", code);
        } catch (e) {}

        // Re-render dashboard with new currency
        if (appState.dashboardData) {
            renderDashboard(appState.dashboardData);
        }
    }

    function loadSavedCurrency() {
        try {
            var saved = localStorage.getItem("datavision_currency");
            if (saved && CURRENCY_SYMBOLS[saved]) {
                currentCurrency = saved;
                var selector = document.getElementById("currencySelector");
                if (selector) selector.value = saved;
            }
        } catch (e) {}
    }

    function formatNumber(value) {
        if (value === null || value === undefined) return "N/A";
        return Number(value).toLocaleString("en-IN");
    }

    function formatPercent(value) {
        if (value === null || value === undefined) return "N/A";
        return Number(value).toFixed(1) + "%";
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // ==========================================================
    // FILE UPLOAD
    // ==========================================================
    async function uploadFile(file) {
        var formData = new FormData();
        formData.append("file", file);

        showLoading();

        try {
            var response = await fetch("/upload", { method: "POST", body: formData });
            var data = await response.json();
            hideLoading();

            if (!data.success) {
                showMessage(data.message, "error");
                return;
            }

            appState.currentFilename = data.filename;
            showMessage(data.message, "success");
            displayProfile(data);
            displayPreview(data.preview);

        } catch (error) {
            hideLoading();
            showMessage("Upload failed: " + error.message, "error");
        }
    }

    function displayProfile(data) {
        var section = document.getElementById("profileSection");
        if (!section) return;
        section.classList.remove("hidden");

        document.getElementById("fileName").innerText = data.filename;
        document.getElementById("rowCount").innerText = data.rows.toLocaleString();
        document.getElementById("columnCount").innerText = data.columns;
        document.getElementById("missingCount").innerText = data.missing_values;
        document.getElementById("duplicateCount").innerText = data.duplicate_rows;

        displayTags("numericColumns", data.numeric_columns);
        displayTags("dateColumns", data.date_columns);
        displayTags("textColumns", data.text_columns);
    }

    function displayTags(elementId, items) {
        var container = document.getElementById(elementId);
        if (!container) return;
        container.innerHTML = "";
        if (!items || items.length === 0) {
            container.innerHTML = "<span>No columns detected</span>";
            return;
        }
        items.forEach(function(item) {
            var tag = document.createElement("span");
            tag.className = "tag";
            tag.innerText = item;
            container.appendChild(tag);
        });
    }

    function displayPreview(data) {
        var container = document.getElementById("tableContainer");
        if (!container || !data || data.length === 0) return;

        container.innerHTML = "";
        var table = document.createElement("table");
        var thead = document.createElement("thead");
        var tbody = document.createElement("tbody");
        var headerRow = document.createElement("tr");

        Object.keys(data[0]).forEach(function(column) {
            var th = document.createElement("th");
            th.innerText = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        data.forEach(function(row) {
            var tr = document.createElement("tr");
            Object.values(row).forEach(function(value) {
                var td = document.createElement("td");
                td.innerText = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    // ==========================================================
    // CLEAN DATA
    // ==========================================================
    async function cleanData() {
        var fileElement = document.getElementById("fileName");
        if (!fileElement) {
            alert("Please upload a file first.");
            return;
        }

        var filename = fileElement.innerText.trim();
        if (!filename || filename === "File") {
            alert("Please upload a file first.");
            return;
        }

        showLoading();
        var formData = new FormData();
        formData.append("filename", filename);

        try {
            var response = await fetch("/clean", { method: "POST", body: formData });
            var data = await response.json();
            hideLoading();

            if (!data.success) {
                showMessage(data.message, "error");
                return;
            }

            showMessage(data.message, "success");
            displayCleaningReport(data.report);

        } catch (error) {
            hideLoading();
            showMessage("Cleaning failed: " + error.message, "error");
        }
    }

    function displayCleaningReport(report) {
        var existing = document.getElementById("cleaningReport");
        if (existing) existing.remove();

        var section = document.createElement("section");
        section.id = "cleaningReport";
        section.className = "preview-section";
        section.style.marginTop = "25px";

        section.innerHTML =
            '<div class="preview-header"><div><h2>Data Cleaning Report</h2><span>Automatic quality analysis</span></div></div>' +
            '<div class="stats-grid">' +
                '<div class="stat-card"><span class="stat-label">Data Quality</span><strong>' + report.quality_score + '%</strong></div>' +
                '<div class="stat-card"><span class="stat-label">Rows Removed</span><strong>' + report.empty_rows_removed + '</strong></div>' +
                '<div class="stat-card"><span class="stat-label">Duplicate Rows</span><strong>' + report.duplicate_rows + '</strong></div>' +
                '<div class="stat-card"><span class="stat-label">Missing Values</span><strong>' + report.total_missing + '</strong></div>' +
            '</div>' +
            '<div class="preview-section"><div class="preview-header"><h2>Cleaned Data Preview</h2><span>First 10 rows</span></div><div id="cleanedTable" class="table-container"></div></div>';

        document.getElementById("profileSection").appendChild(section);

        if (report.preview && report.preview.length > 0) {
            displayPreviewToElement(report.preview, "cleanedTable");
        }
    }

    function displayPreviewToElement(data, elementId) {
        var container = document.getElementById(elementId);
        if (!container || !data || data.length === 0) return;

        container.innerHTML = "";
        var table = document.createElement("table");
        var thead = document.createElement("thead");
        var tbody = document.createElement("tbody");
        var headerRow = document.createElement("tr");

        Object.keys(data[0]).forEach(function(column) {
            var th = document.createElement("th");
            th.innerText = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        data.forEach(function(row) {
            var tr = document.createElement("tr");
            Object.values(row).forEach(function(value) {
                var td = document.createElement("td");
                td.innerText = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    // ==========================================================
    // EXPLORE DATA
    // ==========================================================
    async function exploreData() {
        var fileElement = document.getElementById("fileName");
        if (!fileElement) {
            alert("Please upload a file first.");
            return;
        }

        appState.explorerFilename = fileElement.innerText.trim();
        if (!appState.explorerFilename || appState.explorerFilename === "File") {
            alert("Please upload a file first.");
            return;
        }

        var section = document.getElementById("explorerSection");
        if (!section) {
            alert("Explorer section not found.");
            return;
        }

        section.classList.remove("hidden");
        section.scrollIntoView({ behavior: "smooth" });

        await loadExplorerOverview();
        await loadExplorerProfile();
    }

    async function loadExplorerOverview() {
        var formData = new FormData();
        formData.append("filename", appState.explorerFilename);

        try {
            var response = await fetch("/explorer/overview", { method: "POST", body: formData });
            var result = await response.json();
            if (!result.success) return;
            displayExplorerStats(result.data);
        } catch (error) { console.error(error); }
    }

    function displayExplorerStats(data) {
        var container = document.getElementById("explorerStats");
        if (!container) return;

        container.innerHTML =
            '<div class="stat-card"><span class="stat-label">Total Rows</span><strong>' + data.rows.toLocaleString() + '</strong></div>' +
            '<div class="stat-card"><span class="stat-label">Columns</span><strong>' + data.columns + '</strong></div>' +
            '<div class="stat-card"><span class="stat-label">Missing Values</span><strong>' + data.missing_values.toLocaleString() + '</strong></div>' +
            '<div class="stat-card"><span class="stat-label">Duplicate Rows</span><strong>' + data.duplicate_rows.toLocaleString() + '</strong></div>';
    }

    async function loadExplorerProfile() {
        var formData = new FormData();
        formData.append("filename", appState.explorerFilename);

        try {
            var response = await fetch("/explorer/profile", { method: "POST", body: formData });
            var result = await response.json();
            if (!result.success) return;
            displayColumnProfile(result.profile);
            populateExplorerColumns(result.profile);
        } catch (error) { console.error(error); }
    }

    function displayColumnProfile(profile) {
        var container = document.getElementById("columnProfile");
        if (!container) return;
        container.innerHTML = "";

        profile.forEach(function(column) {
            var details = "";
            if (column.min !== undefined) {
                details =
                    '<p>Min: <strong>' + column.min + '</strong></p>' +
                    '<p>Max: <strong>' + column.max + '</strong></p>' +
                    '<p>Average: <strong>' + column.mean + '</strong></p>' +
                    '<p>Outliers: <strong>' + (column.outliers || 0) + '</strong></p>';
            } else {
                details = '<p>Unique Values: <strong>' + column.unique + '</strong></p>';
            }

            var card = document.createElement("div");
            card.className = "analysis-card";
            card.innerHTML =
                '<h3>' + column.column + '</h3>' +
                '<p>Type: <strong>' + column.data_type + '</strong></p>' +
                '<p>Missing: <strong>' + column.missing + '</strong></p>' +
                details;
            container.appendChild(card);
        });
    }

    function populateExplorerColumns(profile) {
        var select = document.getElementById("explorerColumn");
        if (!select) return;
        select.innerHTML = '<option value="">Select Column</option>';
        profile.forEach(function(column) {
            var option = document.createElement("option");
            option.value = column.column;
            option.innerText = column.column;
            select.appendChild(option);
        });
    }

    async function runExplorerSearch() {
        var columnEl = document.getElementById("explorerColumn");
        var searchEl = document.getElementById("explorerSearch");
        if (!columnEl || !searchEl) return;

        var column = columnEl.value;
        var search = searchEl.value;

        if (!column) {
            alert("Please select a column.");
            return;
        }

        var formData = new FormData();
        formData.append("filename", appState.explorerFilename);
        formData.append("column", column);
        formData.append("search", search);

        try {
            var response = await fetch("/explorer/filter", { method: "POST", body: formData });
            var result = await response.json();
            if (!result.success) return;
            displayExplorerTable(result.data);
        } catch (error) { console.error(error); }
    }

    function displayExplorerTable(data) {
        var container = document.getElementById("explorerTable");
        var count = document.getElementById("explorerResultCount");
        if (!container) return;

        container.innerHTML = "";
        if (count) count.innerText = data.length + " rows";

        if (!data || data.length === 0) {
            container.innerHTML = "<p>No records found.</p>";
            return;
        }

        var table = document.createElement("table");
        var thead = document.createElement("thead");
        var tbody = document.createElement("tbody");
        var header = document.createElement("tr");

        Object.keys(data[0]).forEach(function(column) {
            var th = document.createElement("th");
            th.innerText = column;
            header.appendChild(th);
        });
        thead.appendChild(header);

        data.forEach(function(row) {
            var tr = document.createElement("tr");
            Object.values(row).forEach(function(value) {
                var td = document.createElement("td");
                td.innerText = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    // ==========================================================
    // DASHBOARD
    // ==========================================================
        function renderDashboard(data) {
        // Reset all chart instances before rebuilding
        window.salesTrendChartInstance = null;
        window.productChartInstance = null;
        window.categoryChartInstance = null;
        window.profitTrendChartInstance = null;
        window.orderTypeChartInstance = null;
        window.stateChartInstance = null;
        window.customerChartInstance = null;

        renderDashboardKPIs(data.kpis);
        renderDataModel(data);
        renderSalesTrend(data.monthly_trend || []);
        renderProductChart(data.products || []);
        renderCategoryChart(data.categories || []);
        renderProfitTrend(data.monthly_trend || []);
        renderOrderTypeChart(data.order_types || []);
        renderStateChart(data.states || []);
        renderCustomerChart(data.customers || []);
        generateDashboardInsights(data);
    }
    function renderDashboard(data) {
    renderDashboardKPIs(data.kpis);
    renderDataModel(data);
    renderSalesTrend(data.monthly_trend || []);
    renderProductChart(data.products || []);
    renderCategoryChart(data.categories || []);
    renderProfitTrend(data.monthly_trend || []);
    renderOrderTypeChart(data.order_types || []);
    renderStateChart(data.states || []);
    renderCustomerChart(data.customers || []);

    generateDashboardInsights(data);

    // Phase 3: Apply layout after render
    setTimeout(function() {
        if (typeof applyChartLayout === "function") {
            applyChartLayout();
        }
    }, 200);
}
        // ==========================================================
    // EXPORT ENGINE
    // ==========================================================

    function toggleExportMenu(event) {
        if (event) event.stopPropagation();
        var menu = document.getElementById("exportMenu");
        if (!menu) return;
        menu.classList.toggle("hidden");
    }

    // Close export menu when clicking outside
    document.addEventListener("click", function(e) {
        var menu = document.getElementById("exportMenu");
        if (!menu) return;
        if (!menu.classList.contains("hidden")) {
            var dropdown = menu.closest(".export-dropdown");
            if (dropdown && !dropdown.contains(e.target)) {
                menu.classList.add("hidden");
            }
        }
    });


        async function exportDashboard(format) {
        // Close menu
        var menu = document.getElementById("exportMenu");
        if (menu) menu.classList.add("hidden");

        if (!appState.dashboardFilename) {
            alert("Please upload a file and build a dashboard first.");
            return;
        }

        // PDF export
        if (format === "pdf") {
            await exportToPDF();
            return;
        }

        // Print → browser native
        if (format === "print") {
            window.print();
            return;
        }

        // Get current filters
        var filters = {};
        var dateFrom = getFilterValue("filterDateFrom");
        var dateTo = getFilterValue("filterDateTo");
        var product = getFilterValue("filterProduct");
        var category = getFilterValue("filterCategory");
        var state = getFilterValue("filterState");
        var city = getFilterValue("filterCity");
        var orderType = getFilterValue("filterOrderType");
        var customer = getFilterValue("filterCustomer");

        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (product) filters.product = [product];
        if (category) filters.category = [category];
        if (state) filters.state = [state];
        if (city) filters.city = [city];
        if (orderType) filters.order_type = [orderType];
        if (customer) filters.customer = [customer];

        var requestData = {
            filename: appState.dashboardFilename,
            filters: filters
        };

        showMessage("Preparing " + format.toUpperCase() + " export...", "info");

        try {
            var response = await fetch("/export/" + format, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                var errData = await response.json().catch(function() { return {}; });
                throw new Error(errData.message || "Export failed");
            }

            if (format === "json") {
                var jsonData = await response.json();
                var jsonStr = JSON.stringify(jsonData, null, 2);
                downloadBlob(
                    new Blob([jsonStr], { type: "application/json" }),
                    getExportFilename("json")
                );
            } else {
                var blob = await response.blob();
                downloadBlob(blob, getExportFilename(format));
            }

            showMessage("✅ Export ready! Check your Downloads folder.", "success");

            setTimeout(function() {
                var msg = document.getElementById("message");
                if (msg) msg.classList.add("hidden");
            }, 4000);

        } catch (error) {
            console.error("Export error:", error);
            showMessage("❌ Export failed: " + error.message, "error");
        }
    }
    // ==========================================================
    // PDF EXPORT — Full Visual Report with Charts
    // ==========================================================
        // ==========================================================
    // PDF EXPORT — Server-side generation
    // ==========================================================
    async function exportToPDF() {
        var menu = document.getElementById("exportMenu");
        if (menu) menu.classList.add("hidden");

        if (!appState.dashboardFilename) {
            alert("Please upload a file and build a dashboard first.");
            return;
        }

        // Get filters
        var filters = {};
        var dateFrom = getFilterValue("filterDateFrom");
        var dateTo = getFilterValue("filterDateTo");
        var product = getFilterValue("filterProduct");
        var category = getFilterValue("filterCategory");
        var state = getFilterValue("filterState");
        var city = getFilterValue("filterCity");
        var orderType = getFilterValue("filterOrderType");
        var customer = getFilterValue("filterCustomer");

        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (product) filters.product = [product];
        if (category) filters.category = [category];
        if (state) filters.state = [state];
        if (city) filters.city = [city];
        if (orderType) filters.order_type = [orderType];
        if (customer) filters.customer = [customer];

        showMessage("Generating PDF report... Please wait.", "info");

        try {
            var response = await fetch("/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: appState.dashboardFilename,
                    filters: filters
                })
            });

            if (!response.ok) {
                var errData = await response.json().catch(function() { return {}; });
                throw new Error(errData.message || "PDF export failed");
            }

            var blob = await response.blob();
            downloadBlob(blob, getExportFilename("pdf"));

            showMessage("PDF report downloaded! Check Downloads folder.", "success");

            setTimeout(function() {
                var msg = document.getElementById("message");
                if (msg) msg.classList.add("hidden");
            }, 4000);

        } catch (error) {
            console.error("PDF export error:", error);
            showMessage("PDF failed: " + error.message, "error");
        }
    
        // ==========================================
        // HEADER
        // ==========================================
        var now = new Date();
        var timestamp = now.toLocaleString("en-IN");

        reportContainer.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:3px solid #00b4d8;margin-bottom:30px;">' +
                '<div>' +
                    '<h1 style="margin:0;color:#0b1f3a;font-size:28px;">DATAVISION BI</h1>' +
                    '<p style="margin:5px 0 0;color:#64748b;font-size:14px;">Business Intelligence Report</p>' +
                '</div>' +
                '<div style="text-align:right;font-size:12px;color:#64748b;">' +
                    '<p style="margin:0;"><strong>Generated:</strong> ' + timestamp + '</p>' +
                    '<p style="margin:5px 0 0;"><strong>Source:</strong> ' + appState.dashboardFilename + '</p>' +
                '</div>' +
            '</div>';

        // ==========================================
        // KPI SECTION
        // ==========================================
        var kpis = appState.dashboardData.kpis || {};

        var kpiHTML =
            '<h2 style="font-size:20px;margin:30px 0 15px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">📊 Key Performance Indicators</h2>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:30px;">';

        var kpiItems = [
            { title: "Total Sales", value: formatCurrency(kpis.total_sales) },
            { title: "Total Cost", value: formatCurrency(kpis.total_cost) },
            { title: "Gross Profit", value: formatCurrency(kpis.profit) },
            { title: "Profit Margin", value: formatPercent(kpis.profit_margin) },
            { title: "Total Orders", value: formatNumber(kpis.total_orders) },
            { title: "Units Sold", value: formatNumber(kpis.total_units) },
            { title: "Avg Order Value", value: formatCurrency(kpis.average_order_value) },
            { title: "Unique Customers", value: formatNumber(kpis.unique_customers) }
        ];

        kpiItems.forEach(function(kpi) {
            kpiHTML +=
                '<div style="background:#f8fafc;border-left:4px solid #00b4d8;border-radius:10px;padding:15px;">' +
                    '<div style="font-size:12px;color:#64748b;margin-bottom:6px;">' + kpi.title + '</div>' +
                    '<div style="font-size:22px;font-weight:800;color:#0b1f3a;">' + kpi.value + '</div>' +
                '</div>';
        });
        kpiHTML += '</div>';
        reportContainer.innerHTML += kpiHTML;

        // ==========================================
        // CHARTS
        // ==========================================
        // Give charts a moment to render canvas
        await new Promise(function(r) { setTimeout(r, 500); });

        var chartIds = [
            { id: "salesTrendChart", title: "Sales & Profit Trend", wide: true },
            { id: "productChart", title: "Product Performance", wide: false },
            { id: "categoryChart", title: "Category Performance", wide: false },
            { id: "profitTrendChart", title: "Sales vs Profit", wide: true },
            { id: "orderTypeChart", title: "Order Type Distribution", wide: false },
            { id: "stateChart", title: "State Performance", wide: false },
            { id: "customerChart", title: "Top Customers", wide: true }
        ];

        reportContainer.innerHTML +=
            '<h2 style="font-size:20px;margin:30px 0 15px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">📈 Analytics & Visualizations</h2>' +
            '<div id="pdfChartsArea" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;"></div>';

        // Wait a bit more for the container to be in DOM
        document.body.appendChild(reportContainer);
        await new Promise(function(r) { setTimeout(r, 300); });

        var chartsArea = document.getElementById("pdfChartsArea");

        chartIds.forEach(function(chartInfo) {
            var originalCanvas = document.getElementById(chartInfo.id);
            if (!originalCanvas) return;

            var wrapper = document.createElement("div");
            wrapper.style.gridColumn = chartInfo.wide ? "span 2" : "span 1";
            wrapper.style.background = "#ffffff";
            wrapper.style.border = "1px solid #e2e8f0";
            wrapper.style.borderRadius = "12px";
            wrapper.style.padding = "15px";

            var titleEl = document.createElement("h3");
            titleEl.style.margin = "0 0 12px 0";
            titleEl.style.fontSize = "15px";
            titleEl.style.color = "#0b1f3a";
            titleEl.textContent = chartInfo.title;
            wrapper.appendChild(titleEl);

            // Convert original canvas to image
            try {
                var img = document.createElement("img");
                img.src = originalCanvas.toDataURL("image/png", 1.0);
                img.style.width = "100%";
                img.style.height = "auto";
                img.style.display = "block";
                img.style.borderRadius = "8px";
                wrapper.appendChild(img);
            } catch (err) {
                console.error("Chart capture failed:", chartInfo.id, err);
                wrapper.innerHTML += '<p style="color:#dc2626;font-size:12px;">Chart not available</p>';
            }

            chartsArea.appendChild(wrapper);
        });

        // ==========================================
        // TOP PRODUCTS TABLE
        // ==========================================
        var data = appState.dashboardData;
        var business = data.business_columns || {};

        if (data.products && data.products.length > 0 && business.product) {
            var tableHTML =
                '<h2 style="font-size:20px;margin:30px 0 15px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">🏆 Top Products</h2>' +
                '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="background:#0b1f3a;color:white;">' +
                '<th style="padding:10px;text-align:left;">Product</th>' +
                '<th style="padding:10px;text-align:right;">Sales</th>' +
                '</tr></thead><tbody>';

            data.products.slice(0, 10).forEach(function(item, idx) {
                var bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                tableHTML +=
                    '<tr style="background:' + bg + ';">' +
                    '<td style="padding:10px;border-bottom:1px solid #e2e8f0;">' + (item[business.product] || "") + '</td>' +
                    '<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">' +
                        formatCurrency(item[business.sales] || 0) +
                    '</td>' +
                    '</tr>';
            });

            tableHTML += '</tbody></table>';
            reportContainer.innerHTML += tableHTML;
        }

        // ==========================================
        // TOP CATEGORIES
        // ==========================================
        if (data.categories && data.categories.length > 0 && business.category) {
            var catHTML =
                '<h2 style="font-size:20px;margin:30px 0 15px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">📦 Top Categories</h2>' +
                '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="background:#0b1f3a;color:white;">' +
                '<th style="padding:10px;text-align:left;">Category</th>' +
                '<th style="padding:10px;text-align:right;">Sales</th>' +
                '</tr></thead><tbody>';

            data.categories.slice(0, 10).forEach(function(item, idx) {
                var bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                catHTML +=
                    '<tr style="background:' + bg + ';">' +
                    '<td style="padding:10px;border-bottom:1px solid #e2e8f0;">' + (item[business.category] || "") + '</td>' +
                    '<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">' +
                        formatCurrency(item[business.sales] || 0) +
                    '</td>' +
                    '</tr>';
            });

            catHTML += '</tbody></table>';
            reportContainer.innerHTML += catHTML;
        }

        // ==========================================
        // FOOTER
        // ==========================================
        reportContainer.innerHTML +=
            '<div style="margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">' +
                'Generated by DATAVISION BI © ' + now.getFullYear() + ' • ' + timestamp +
            '</div>';

        // ==========================================
        // GENERATE PDF
        // ==========================================
        try {
            var pdfOptions = {
                margin: [10, 10, 10, 10],
                filename: getExportFilename("pdf"),
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: { mode: ["avoid-all", "css", "legacy"] }
            };

            await html2pdf().set(pdfOptions).from(reportContainer).save();

            showMessage("✅ PDF report downloaded!", "success");

        } catch (err) {
            console.error("PDF generation error:", err);
            showMessage("❌ PDF failed: " + err.message, "error");
        } finally {
            // Cleanup
            if (reportContainer.parentNode) {
                reportContainer.parentNode.removeChild(reportContainer);
            }

            setTimeout(function() {
                var msg = document.getElementById("message");
                if (msg) msg.classList.add("hidden");
            }, 4000);
        }
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }


    function getExportFilename(format) {
        var base = appState.dashboardFilename || "dashboard";
        base = base.replace(/\.[^/.]+$/, ""); // remove extension

        var now = new Date();
        var ts = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0") + "_" +
            String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0");

        var ext = format === "excel" ? "xlsx" : (format === "pdf" ? "pdf" : format);
        return base + "_report_" + ts + "." + ext;
    }
    async function createDashboard() {
        var fileElement = document.getElementById("fileName");
        if (!fileElement) {
            alert("Please upload a file first.");
            return;
        }

        appState.dashboardFilename = fileElement.innerText.trim();
        if (!appState.dashboardFilename || appState.dashboardFilename === "File") {
            alert("Please upload a file first.");
            return;
        }

        var dashboardSection = document.getElementById("dashboardSection");
        if (!dashboardSection) {
            alert("Dashboard section not found.");
            return;
        }

        dashboardSection.classList.remove("hidden");
        dashboardSection.scrollIntoView({ behavior: "smooth" });

        try {
            await loadDashboardFilters();
            await generateDashboard();
        } catch (error) {
            console.error("Dashboard error:", error);
            showMessage("Dashboard creation failed: " + error.message, "error");
        }
    }

    async function generateDashboard() {
        if (!appState.dashboardFilename) return;

        var formData = new FormData();
        formData.append("filename", appState.dashboardFilename);

        showLoading();

        try {
            var response = await fetch("/dashboard/build", { method: "POST", body: formData });
            var result = await response.json();
            hideLoading();

            if (!result.success) {
                alert(result.message);
                return;
            }

            appState.dashboardData = result.dashboard;
            renderDashboard(appState.dashboardData);

        } catch (error) {
            hideLoading();
            console.error(error);
            alert("Dashboard generation failed: " + error.message);
        }
    }

    function renderDashboard(data) {
        renderDashboardKPIs(data.kpis);
        renderDataModel(data);
        renderSalesTrend(data.monthly_trend || []);
        renderProductChart(data.products || []);
        renderCategoryChart(data.categories || []);
    }
    function renderDashboard(data) {
    renderDashboardKPIs(data.kpis);
    renderDataModel(data);
    renderSalesTrend(data.monthly_trend || []);
    renderProductChart(data.products || []);
    renderCategoryChart(data.categories || []);

    // NEW: Additional charts
    renderProfitTrend(data.monthly_trend || []);
    renderOrderTypeChart(data.order_types || []);
    renderStateChart(data.states || []);
    renderCustomerChart(data.customers || []);

    generateDashboardInsights(data);
}
    function renderDashboardKPIs(kpis) {
    var container = document.getElementById("dashboardKPIs");
    if (!container) return;
    container.innerHTML = "";

    if (!kpis) {
        container.innerHTML = "<p>No KPI data available.</p>";
        return;
    }

    // Load customization
    if (!kpiCustomization.length) loadKPICustomization();

    // Calculate values from kpis
    var totalSales = Number(kpis.total_sales || 0);
    var totalCost = Number(kpis.total_cost || 0);
    var profit = Number(kpis.profit !== undefined ? kpis.profit : (totalSales - totalCost));
    var profitMargin = Number(kpis.profit_margin !== undefined ? kpis.profit_margin : (totalSales !== 0 ? (profit / totalSales) * 100 : 0));
    var totalOrders = Number(kpis.total_orders || 0);
    var totalUnits = Number(kpis.total_units || 0);
    var aov = Number(kpis.average_order_value !== undefined ? kpis.average_order_value : (totalOrders !== 0 ? totalSales / totalOrders : 0));
    var uniqueCustomers = Number(kpis.unique_customers || 0);

    var kpiValues = [
        formatCurrency(totalSales),
        formatCurrency(totalCost),
        formatCurrency(profit),
        formatPercent(profitMargin),
        formatNumber(totalOrders),
        formatNumber(totalUnits),
        formatCurrency(aov),
        formatNumber(uniqueCustomers)
    ];

    // Render each KPI card (in saved order)
    kpiCustomization.forEach(function(config, index) {
        if (!config.visible) return;

        var card = document.createElement("div");
        card.className = "stat-card dashboard-kpi advanced-kpi-card";

        if (config.highlighted) {
            card.classList.add("kpi-highlighted");
        }

        card.style.borderLeftColor = config.color;
        card.style.borderLeftWidth = "5px";

        card.innerHTML =
            '<button class="kpi-edit-btn" onclick="openKPIModal(' + index + ')" title="Customize">✏️</button>' +
            '<div class="kpi-top">' +
                '<div class="kpi-icon" style="background:' + hexToRgba(config.color, 0.15) + ';color:' + config.color + ';">' + config.icon + '</div>' +
                '<span class="kpi-status" style="background:' + hexToRgba(config.color, 0.15) + ';color:' + config.color + ';">Live</span>' +
            '</div>' +
            '<div class="kpi-title">' + escapeHtml(config.title) + '</div>' +
            '<div class="kpi-value">' + kpiValues[index] + '</div>';

        container.appendChild(card);
    });

    if (container.children.length === 0) {
        container.innerHTML = '<div class="filter-item" style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:20px;">All KPI cards are hidden. Click "Reset KPIs" to restore.</div>';
    }
}

// Helper: Convert hex to rgba
function hexToRgba(hex, alpha) {
    if (!hex) return "rgba(0,180,216," + alpha + ")";
    var h = hex.replace("#", "");
    if (h.length === 3) {
        h = h.split("").map(function(c) { return c + c; }).join("");
    }
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

    function renderDataModel(data) {
        var container = document.getElementById("dashboardDataModel");
        if (!container) return;

        var business = data.business_columns || {};
        container.innerHTML =
            '<div class="analysis-card"><h3>Detection</h3>' +
            '<p>Sales: <strong>' + (business.sales || "Not detected") + '</strong></p>' +
            '<p>Cost: <strong>' + (business.cost || "Not detected") + '</strong></p>' +
            '<p>Product: <strong>' + (business.product || "Not detected") + '</strong></p>' +
            '<p>Category: <strong>' + (business.category || "Not detected") + '</strong></p></div>';
    }

        function renderSalesTrend(data, chartType) {
    chartType = chartType || chartTypePreferences.salesTrendChart || "line";

    var canvas = document.getElementById("salesTrendChart");
    if (!canvas || !data.length) return;
    if (window.salesTrendChartInstance) window.salesTrendChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var salesCol = business.sales;
    var costCol = business.cost;

    var labels = data.map(function(item) { return item.Year_Month || item.month || ""; });
    var salesValues = data.map(function(item) { return Number(item[salesCol] || 0); });
    var costValues = data.map(function(item) { return Number(item[costCol] || 0); });
    var profitValues = salesValues.map(function(s, i) { return s - costValues[i]; });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.line;
    var chartJsType = config.jsType;

    // Prepare datasets
    var datasets = [
        {
            label: "Sales",
            data: salesValues,
            tension: 0.35,
            borderWidth: 3,
            borderColor: "#00b4d8",
            backgroundColor: "rgba(0, 180, 216, 0.5)",
            fill: config.fill,
            pointRadius: 3,
            pointHoverRadius: 6
        },
        {
            label: "Profit",
            data: profitValues,
            tension: 0.35,
            borderWidth: 3,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22, 163, 74, 0.5)",
            fill: config.fill,
            pointRadius: 3,
            pointHoverRadius: 6
        }
    ];

    // For pie/doughnut/polar, only use Sales
    if (["pie", "doughnut", "polarArea"].includes(chartType)) {
        datasets = [{
            label: "Sales",
            data: salesValues,
            backgroundColor: CHART_COLORS
        }];
    }

    // For scatter, use {x, y} format
    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [
            {
                label: "Sales vs Profit",
                data: salesValues.map(function(s, i) {
                    return { x: s, y: profitValues[i] };
                }),
                backgroundColor: "#00b4d8",
                pointRadius: 6
            }
        ];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: config.legend, position: "top" }
        },
        indexAxis: config.indexAxis
    };

    if (config.stacked && (chartType === "stackedBar")) {
        options.scales = {
            x: { stacked: true },
            y: { stacked: true }
        };
    }

    if (chartType === "scatter" || chartType === "bubble") {
        options.scales = {
            x: { type: "linear", position: "bottom", title: { display: true, text: "Sales" } },
            y: { title: { display: true, text: "Profit" } }
        };
    }

    window.salesTrendChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}
     function renderProductChart(data, chartType) {
    chartType = chartType || chartTypePreferences.productChart || "bar";

    var canvas = document.getElementById("productChart");
    if (!canvas || !data.length) return;
    if (window.productChartInstance) window.productChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var productCol = business.product;
    var salesCol = business.sales;

    var labels = data.map(function(item) { return item[productCol]; });
    var values = data.map(function(item) { return Number(item[salesCol] || 0); });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.bar;
    var chartJsType = config.jsType;

    var datasets = [{
        label: "Sales",
        data: values,
        backgroundColor: CHART_COLORS,
        borderColor: "#ffffff",
        borderWidth: 2
    }];

    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [{
            label: "Sales",
            data: values.map(function(v, i) { return { x: i + 1, y: v }; }),
            backgroundColor: "#00b4d8",
            pointRadius: 8
        }];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.legend, position: "bottom" } },
        indexAxis: config.indexAxis
    };

    if (chartType === "scatter" || chartType === "bubble") {
        options.scales = {
            x: { type: "linear", title: { display: true, text: "Product Index" } },
            y: { title: { display: true, text: "Sales" } }
        };
        // Scatter labels hide
        options.plugins.tooltip = {
            callbacks: {
                label: function(ctx) {
                    return labels[ctx.dataIndex] + ": " + ctx.parsed.y.toLocaleString();
                }
            }
        };
    }

    window.productChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}

      function renderCategoryChart(data, chartType) {
    chartType = chartType || chartTypePreferences.categoryChart || "doughnut";

    var canvas = document.getElementById("categoryChart");
    if (!canvas || !data.length) return;
    if (window.categoryChartInstance) window.categoryChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var categoryCol = business.category;
    var salesCol = business.sales;

    var labels = data.map(function(item) { return item[categoryCol]; });
    var values = data.map(function(item) { return Number(item[salesCol] || 0); });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.doughnut;
    var chartJsType = config.jsType;

    var datasets = [{
        label: "Sales",
        data: values,
        backgroundColor: CHART_COLORS,
        borderColor: "#ffffff",
        borderWidth: 2
    }];

    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [{
            label: "Sales",
            data: values.map(function(v, i) { return { x: i + 1, y: v }; }),
            backgroundColor: "#00b4d8",
            pointRadius: 8
        }];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.legend, position: "bottom" } },
        indexAxis: config.indexAxis
    };

    window.categoryChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}
        // ==========================================================
    // CHANGE CHART TYPE (Dynamic Chart Switcher)
    // ==========================================================
    function changeChartType(chartId, newType) {
    chartTypePreferences[chartId] = newType;

    if (!appState.dashboardData) return;
    var data = appState.dashboardData;

    try {
        switch (chartId) {
            case "salesTrendChart":
                renderSalesTrend(data.monthly_trend || [], newType);
                break;
            case "productChart":
                renderProductChart(data.products || [], newType);
                break;
            case "categoryChart":
                renderCategoryChart(data.categories || [], newType);
                break;
            case "profitTrendChart":
                renderProfitTrend(data.monthly_trend || [], newType);
                break;
            case "orderTypeChart":
                renderOrderTypeChart(data.order_types || [], newType);
                break;
            case "stateChart":
                renderStateChart(data.states || [], newType);
                break;
            case "customerChart":
                renderCustomerChart(data.customers || [], newType);
                break;
        }
        console.log("✅ Chart " + chartId + " switched to: " + newType);
    } catch (error) {
        console.error("Chart switch error:", error);
    }
}
    // ==========================================================
    // DASHBOARD FILTERS
    // ==========================================================
        async function loadDashboardFilters() {
        if (!appState.dashboardFilename) return;

        var formData = new FormData();
        formData.append("filename", appState.dashboardFilename);

        try {
            var response = await fetch("/dashboard/filter-options", { method: "POST", body: formData });
            var result = await response.json();

            if (!result.success) return;

            appState.dashboardFilterOptions = result.options || {};

            // Build filters dynamically
            buildDynamicFilters(appState.dashboardFilterOptions);

        } catch (error) {
            console.error("Filter options error:", error);
        }
    }
    function buildDynamicFilters(options) {
        var grid = document.getElementById("dynamicFilterGrid");
        if (!grid) return;

        grid.innerHTML = "";

        // Build list of filters to show (only those with data)
        var filtersToShow = [];

        // Date filter (if available)
        if (options.date_min || options.date_max) {
            filtersToShow.push({
                key: "date_from",
                label: "From Date",
                type: "date",
                value: options.date_min || ""
            });
            filtersToShow.push({
                key: "date_to",
                label: "To Date",
                type: "date",
                value: options.date_max || ""
            });
        }

        // Categorical filters (only if data exists)
        var categoricalKeys = ["product", "category", "state", "city", "order_type", "customer"];

        categoricalKeys.forEach(function(key) {
            var values = options[key];
            if (values && Array.isArray(values) && values.length > 0) {
                filtersToShow.push({
                    key: key,
                    label: FILTER_CONFIG[key].label,
                    type: "select",
                    placeholder: FILTER_CONFIG[key].placeholder,
                    values: values
                });
            }
        });

        // If no filters available, show message
        if (filtersToShow.length === 0) {
            grid.innerHTML = '<div class="filter-item" style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">No filters available for this dataset</div>';
            return;
        }

        // Render each filter
        filtersToShow.forEach(function(filterCfg) {
            var item = document.createElement("div");
            item.className = "filter-item";

            var label = document.createElement("label");
            label.textContent = filterCfg.label;
            item.appendChild(label);

            if (filterCfg.type === "date") {
                var input = document.createElement("input");
                input.type = "date";
                input.id = "filter" + capitalize(filterCfg.key);
                if (filterCfg.value) input.value = filterCfg.value;
                input.addEventListener("change", applyDashboardFilters);
                item.appendChild(input);
            } else {
                var select = document.createElement("select");
                select.id = "filter" + capitalize(filterCfg.key);

                var defaultOpt = document.createElement("option");
                defaultOpt.value = "";
                defaultOpt.textContent = filterCfg.placeholder;
                select.appendChild(defaultOpt);

                filterCfg.values.forEach(function(val) {
                    var opt = document.createElement("option");
                    opt.value = String(val);
                    opt.textContent = String(val);
                    select.appendChild(opt);
                });

                select.addEventListener("change", applyDashboardFilters);
                item.appendChild(select);
            }

            grid.appendChild(item);
        });

        console.log("Built " + filtersToShow.length + " dynamic filters");
    }


    function capitalize(str) {
        // "date_from" → "DateFrom"
        return str.split("_").map(function(w) {
            return w.charAt(0).toUpperCase() + w.slice(1);
        }).join("");
    }
    function populateFilter(elementId, values, defaultText) {
        var select = document.getElementById(elementId);
        if (!select) return;
        select.innerHTML = '<option value="">' + defaultText + '</option>';
        if (!Array.isArray(values)) return;
        values.forEach(function(value) {
            if (value === null || value === undefined || value === "") return;
            var option = document.createElement("option");
            option.value = String(value);
            option.textContent = String(value);
            select.appendChild(option);
        });
    }

    function getFilterValue(id) {
        var element = document.getElementById(id);
        if (!element) return "";
        return element.value.trim();
    }

    async function applyDashboardFilters() {
        if (!appState.dashboardFilename) return;

        var filters = {};
        var dateFrom = getFilterValue("filterDateFrom");
        var dateTo = getFilterValue("filterDateTo");
        var product = getFilterValue("filterProduct");
        var category = getFilterValue("filterCategory");
        var state = getFilterValue("filterState");
        var city = getFilterValue("filterCity");
        var orderType = getFilterValue("filterOrderType");
        var customer = getFilterValue("filterCustomer");

        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (product) filters.product = [product];
        if (category) filters.category = [category];
        if (state) filters.state = [state];
        if (city) filters.city = [city];
        if (orderType) filters.order_type = [orderType];
        if (customer) filters.customer = [customer];

        var requestData = Object.assign({ filename: appState.dashboardFilename }, filters);

        try {
            showLoading();
            var response = await fetch("/dashboard/filter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });
            var result = await response.json();
            hideLoading();

            if (!result.success) {
                alert(result.message);
                return;
            }

            appState.dashboardData = result.dashboard;
            renderDashboard(appState.dashboardData);
        } catch (error) {
            hideLoading();
            console.error(error);
        }
    }

       async function resetDashboardFilters() {
        var ids = ["filterDateFrom", "filterDateTo", "filterProduct",
                   "filterCategory", "filterState", "filterCity",
                   "filterOrderType", "filterCustomer"];

        ids.forEach(function(id) {
            var element = document.getElementById(id);
            if (element) element.value = "";
        });

        await generateDashboard();
        await loadDashboardFilters(); // Reload filter options
    }

    async function refreshDashboard() {
        if (!appState.dashboardFilename) {
            alert("Please upload a file first.");
            return;
        }
        await generateDashboard();
        await loadDashboardFilters();
    }

    // ==========================================================
    // POWER QUERY
    // ==========================================================
    async function openQueryEditor() {
        var fileElement = document.getElementById("fileName");
        if (!fileElement) {
            alert("Please upload a file first.");
            return;
        }

        appState.queryFilename = fileElement.innerText.trim();
        if (!appState.queryFilename || appState.queryFilename === "File") {
            alert("Please upload a file first.");
            return;
        }

        var querySection = document.getElementById("querySection");
        if (!querySection) {
            alert("Query section not found.");
            return;
        }

        querySection.classList.remove("hidden");
        querySection.scrollIntoView({ behavior: "smooth" });
        await startQuery();
    }

    async function startQuery() {
        if (!appState.queryFilename) return;
        try {
            var response = await fetch("/query/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename })
            });
            var result = await response.json();
            if (!result.success) {
                alert(result.message);
                return;
            }
            updateQueryColumns(result.columns);
            displayQueryTable(result.preview);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    async function refreshQueryPreview() {
        if (!appState.queryFilename) return;
        try {
            var response = await fetch("/query/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename })
            });
            var result = await response.json();
            if (!result.success) return;
            updateQueryColumns(result.columns);
            displayQueryTable(result.preview);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    async function queryRemoveEmptyRows() {
        if (!appState.queryFilename) return;
        try {
            var response = await fetch("/query/remove-empty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename })
            });
            var result = await response.json();
            if (!result.success) return;
            displayQueryTable(result.preview);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    async function queryRemoveDuplicates() {
        if (!appState.queryFilename) return;
        try {
            var response = await fetch("/query/remove-duplicates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename })
            });
            var result = await response.json();
            if (!result.success) return;
            displayQueryTable(result.preview);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    function openRemoveColumns() {
        if (!appState.queryFilename) return;
        var list = document.getElementById("removeColumnsList");
        if (!list) return;
        list.innerHTML = "";
        document.querySelectorAll("#queryColumns .query-column").forEach(function(element) {
            var column = element.dataset.column;
            var label = document.createElement("label");
            label.className = "remove-column-item";
            label.innerHTML = '<input type="checkbox" value="' + escapeHtml(column) + '"><span>' + escapeHtml(column) + '</span>';
            list.appendChild(label);
        });
        var modal = document.getElementById("removeColumnsModal");
        if (modal) modal.classList.remove("hidden");
    }

    function closeRemoveColumns() {
        var modal = document.getElementById("removeColumnsModal");
        if (modal) modal.classList.add("hidden");
    }

    async function confirmRemoveColumns() {
        var checked = document.querySelectorAll("#removeColumnsList input:checked");
        var columns = Array.from(checked).map(function(input) { return input.value; });
        if (columns.length === 0) {
            alert("Please select at least one column.");
            return;
        }
        try {
            var response = await fetch("/query/remove-columns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename, columns: columns })
            });
            var result = await response.json();
            if (!result.success) return;
            closeRemoveColumns();
            displayQueryTable(result.preview);
            updateQueryColumns(result.columns);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    function openRenameColumn() {
        if (!appState.queryFilename) return;
        var select = document.getElementById("renameColumnSelect");
        if (!select) return;
        select.innerHTML = '<option value="">Select Column</option>';
        document.querySelectorAll("#queryColumns .query-column").forEach(function(element) {
            var column = element.dataset.column;
            var option = document.createElement("option");
            option.value = column;
            option.textContent = column;
            select.appendChild(option);
        });
        var modal = document.getElementById("renameColumnModal");
        if (modal) modal.classList.remove("hidden");
    }

    function closeRenameColumn() {
        var modal = document.getElementById("renameColumnModal");
        if (modal) modal.classList.add("hidden");
    }

    async function confirmRenameColumn() {
        var selectEl = document.getElementById("renameColumnSelect");
        var nameEl = document.getElementById("newColumnName");
        if (!selectEl || !nameEl) return;
        var oldName = selectEl.value;
        var newName = nameEl.value.trim();
        if (!oldName || !newName) {
            alert("Please fill both fields.");
            return;
        }
        try {
            var response = await fetch("/query/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename, old_name: oldName, new_name: newName })
            });
            var result = await response.json();
            if (!result.success) return;
            closeRenameColumn();
            displayQueryTable(result.preview);
            updateQueryColumns(result.columns);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    async function resetQuery() {
        if (!appState.queryFilename) return;
        if (!confirm("Reset all query transformations?")) return;
        try {
            var response = await fetch("/query/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: appState.queryFilename })
            });
            var result = await response.json();
            if (!result.success) return;
            displayQueryTable(result.preview);
            updateQueryColumns(result.columns);
            displayQuerySteps(result.steps);
        } catch (error) { console.error(error); }
    }

    function updateQueryColumns(columns) {
        var container = document.getElementById("queryColumns");
        if (!container) return;
        container.innerHTML = "";
        if (!columns || columns.length === 0) {
            container.innerHTML = "<span>No columns</span>";
            return;
        }
        columns.forEach(function(column) {
            var element = document.createElement("div");
            element.className = "query-column";
            element.dataset.column = column;
            element.innerHTML = '<strong>' + escapeHtml(column) + '</strong>';
            container.appendChild(element);
        });
    }

    function displayQueryTable(data) {
        var container = document.getElementById("queryTable");
        var rowCount = document.getElementById("queryRowCount");
        if (!container) return;
        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="query-empty"><h3>No records found</h3></div>';
            if (rowCount) rowCount.innerText = "0 rows";
            return;
        }

        if (rowCount) rowCount.innerText = data.length + " preview rows";

        var table = document.createElement("table");
        table.className = "query-preview-table";
        var thead = document.createElement("thead");
        var tbody = document.createElement("tbody");
        var headerRow = document.createElement("tr");

        Object.keys(data[0]).forEach(function(column) {
            var th = document.createElement("th");
            th.textContent = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        data.forEach(function(row) {
            var tr = document.createElement("tr");
            Object.values(row).forEach(function(value) {
                var td = document.createElement("td");
                td.textContent = (value === null || value === undefined) ? "" : value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    function displayQuerySteps(steps) {
        var container = document.getElementById("querySteps");
        var count = document.getElementById("queryStepCount");
        if (!container) return;
        container.innerHTML = "";

        var sourceStep = document.createElement("div");
        sourceStep.className = "query-step active";
        sourceStep.innerHTML = "<span>1</span><strong>Source</strong>";
        container.appendChild(sourceStep);

        if (steps && steps.length > 0) {
            steps.forEach(function(step, index) {
                var element = document.createElement("div");
                element.className = "query-step";
                var stepName = typeof step === "string" ? step : (step.name || "Step");
                element.innerHTML = "<span>" + (index + 2) + "</span><strong>" + escapeHtml(stepName) + "</strong>";
                container.appendChild(element);
            });
        }

        if (count) {
            var total = (steps ? steps.length : 0) + 1;
            count.innerText = total + " step" + (total === 1 ? "" : "s");
        }
    }

   
    // ==========================================================
    // EXPOSE FUNCTIONS GLOBALLY (for onclick handlers)
    // ==========================================================
    window.uploadFile = uploadFile;
    window.cleanData = cleanData;
    window.exploreData = exploreData;
    window.createDashboard = createDashboard;
    window.generateDashboard = generateDashboard;
    window.refreshDashboard = refreshDashboard;
    window.resetDashboardFilters = resetDashboardFilters;
    window.applyDashboardFilters = applyDashboardFilters;
    window.openQueryEditor = openQueryEditor;
    window.startQuery = startQuery;
    window.refreshQueryPreview = refreshQueryPreview;
    window.queryRemoveEmptyRows = queryRemoveEmptyRows;
    window.queryRemoveDuplicates = queryRemoveDuplicates;
    window.openRemoveColumns = openRemoveColumns;
    window.closeRemoveColumns = closeRemoveColumns;
    window.confirmRemoveColumns = confirmRemoveColumns;
    window.openRenameColumn = openRenameColumn;
    window.closeRenameColumn = closeRenameColumn;
    window.confirmRenameColumn = confirmRenameColumn;
    window.resetQuery = resetQuery;
    window.runExplorerSearch = runExplorerSearch;
    window.loadExplorerProfile = loadExplorerProfile;
    // ==========================================================
    // ADDITIONAL CHARTS
    // ==========================================================

       function renderProfitTrend(data, chartType) {
    chartType = chartType || chartTypePreferences.profitTrendChart || "line";

    var canvas = document.getElementById("profitTrendChart");
    if (!canvas || !data.length) return;
    if (window.profitTrendChartInstance) window.profitTrendChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var salesCol = business.sales;
    var costCol = business.cost;

    var labels = data.map(function(item) { return item.Year_Month || ""; });
    var sales = data.map(function(item) { return Number(item[salesCol] || 0); });
    var costs = data.map(function(item) { return Number(item[costCol] || 0); });
    var profit = sales.map(function(v, i) { return v - costs[i]; });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.line;
    var chartJsType = config.jsType;

    var datasets = [
        {
            label: "Sales",
            data: sales,
            tension: 0.3,
            borderColor: "#00b4d8",
            backgroundColor: "rgba(0, 180, 216, 0.5)",
            borderWidth: 3,
            fill: config.fill
        },
        {
            label: "Profit",
            data: profit,
            tension: 0.3,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22, 163, 74, 0.5)",
            borderWidth: 3,
            fill: config.fill
        }
    ];

    if (["pie", "doughnut", "polarArea"].includes(chartType)) {
        datasets = [{
            label: "Sales",
            data: sales,
            backgroundColor: CHART_COLORS
        }];
    }

    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [{
            label: "Sales vs Profit",
            data: sales.map(function(s, i) { return { x: s, y: profit[i] }; }),
            backgroundColor: "#00b4d8",
            pointRadius: 6
        }];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.legend, position: "top" } },
        indexAxis: config.indexAxis
    };

    if (config.stacked) {
        options.scales = { x: { stacked: true }, y: { stacked: true } };
    }

    window.profitTrendChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}
       function renderOrderTypeChart(data, chartType) {
    chartType = chartType || chartTypePreferences.orderTypeChart || "doughnut";

    var canvas = document.getElementById("orderTypeChart");
    if (!canvas || !data.length) return;
    if (window.orderTypeChartInstance) window.orderTypeChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var col = business.order_type;
    var salesCol = business.sales;

    if (!col) return;

    var labels = data.map(function(item) { return item[col]; });
    var values = data.map(function(item) { return Number(item[salesCol] || 0); });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.doughnut;
    var chartJsType = config.jsType;

    var datasets = [{
        label: "Sales",
        data: values,
        backgroundColor: CHART_COLORS,
        borderColor: "#ffffff",
        borderWidth: 2
    }];

    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [{
            label: "Sales",
            data: values.map(function(v, i) { return { x: i + 1, y: v }; }),
            backgroundColor: "#00b4d8",
            pointRadius: 8
        }];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.legend, position: "bottom" } },
        indexAxis: config.indexAxis
    };

    window.orderTypeChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}
       function renderStateChart(data, chartType) {
    chartType = chartType || chartTypePreferences.stateChart || "horizontalBar";

    var canvas = document.getElementById("stateChart");
    if (!canvas || !data.length) return;
    if (window.stateChartInstance) window.stateChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var col = business.state;
    var salesCol = business.sales;

    if (!col) return;

    var labels = data.map(function(item) { return item[col]; });
    var values = data.map(function(item) { return Number(item[salesCol] || 0); });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.horizontalBar;
    var chartJsType = config.jsType;

    var datasets = [{
        label: "Sales",
        data: values,
        backgroundColor: CHART_COLORS,
        borderColor: "#ffffff",
        borderWidth: 2
    }];

    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [{
            label: "Sales",
            data: values.map(function(v, i) { return { x: i + 1, y: v }; }),
            backgroundColor: "#00b4d8",
            pointRadius: 8
        }];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.legend, position: "bottom" } },
        indexAxis: config.indexAxis
    };

    window.stateChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}

      function renderCustomerChart(data, chartType) {
    chartType = chartType || chartTypePreferences.customerChart || "horizontalBar";

    var canvas = document.getElementById("customerChart");
    if (!canvas || !data.length) return;
    if (window.customerChartInstance) window.customerChartInstance.destroy();

    var business = appState.dashboardData.business_columns || {};
    var col = business.customer;
    var salesCol = business.sales;

    if (!col) return;

    var labels = data.map(function(item) { return item[col]; });
    var values = data.map(function(item) { return Number(item[salesCol] || 0); });

    var config = CHART_TYPE_MAP[chartType] || CHART_TYPE_MAP.horizontalBar;
    var chartJsType = config.jsType;

    var datasets = [{
        label: "Revenue",
        data: values,
        backgroundColor: CHART_COLORS,
        borderColor: "#ffffff",
        borderWidth: 2
    }];

    if (chartType === "scatter" || chartType === "bubble") {
        datasets = [{
            label: "Revenue",
            data: values.map(function(v, i) { return { x: i + 1, y: v }; }),
            backgroundColor: "#00b4d8",
            pointRadius: 8
        }];
    }

    var options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.legend, position: "bottom" } },
        indexAxis: config.indexAxis
    };

    window.customerChartInstance = new Chart(canvas, {
        type: chartJsType,
        data: { labels: labels, datasets: datasets },
        options: options
    });
}
    function generateDashboardInsights(data) {
        var container = document.getElementById("dashboardInsights");
        if (!container) return;

        var insights = [];
        var business = data.business_columns || {};
        var salesCol = business.sales;

        if (data.products && data.products.length > 0 && business.product && salesCol) {
            var best = data.products[0];
            insights.push({
                title: "Best Product",
                text: best[business.product] + " is the top seller with " + formatCurrency(best[salesCol]) + " revenue."
            });
        }

        if (data.categories && data.categories.length > 0 && business.category && salesCol) {
            var bestCat = data.categories[0];
            insights.push({
                title: "Best Category",
                text: bestCat[business.category] + " generated the highest revenue."
            });
        }

        if (data.kpis && data.kpis.profit !== null) {
            insights.push({
                title: "Profitability",
                text: "Gross profit is " + formatCurrency(data.kpis.profit) + " with " + formatPercent(data.kpis.profit_margin) + " margin."
            });
        }

        if (data.kpis && data.kpis.total_orders) {
            insights.push({
                title: "Order Performance",
                text: formatNumber(data.kpis.total_orders) + " orders with average value " + formatCurrency(data.kpis.average_order_value) + "."
            });
        }

        if (insights.length === 0) {
            insights.push({
                title: "Data Loaded",
                text: "Dashboard ready with " + data.rows + " rows and " + data.columns + " columns."
            });
        }

        container.innerHTML = "";
        insights.forEach(function(insight) {
            var card = document.createElement("div");
            card.className = "analysis-card";
            card.innerHTML = "<h3>" + insight.title + "</h3><p>" + insight.text + "</p>";
            container.appendChild(card);
        });
    }
        // At the end, add these:
    window.renderProfitTrend = renderProfitTrend;
    window.renderOrderTypeChart = renderOrderTypeChart;
    window.renderStateChart = renderStateChart;
    window.renderCustomerChart = renderCustomerChart;
    window.generateDashboardInsights = generateDashboardInsights;
    window.changeChartType = changeChartType;
    window.toggleExportMenu = toggleExportMenu;
    window.exportDashboard = exportDashboard;
    window.exportToPDF = exportToPDF;
    window.changeCurrency = changeCurrency;
    window.buildDynamicFilters = buildDynamicFilters;
    // Phase 2 - KPI Customization
window.openKPIModal = openKPIModal;
window.closeKPIModal = closeKPIModal;
window.saveKPICustomization = saveKPICustomization;
window.resetKPICustomization = resetKPICustomization;
window.pickEmoji = pickEmoji;
window.pickColor = pickColor;
// Phase 3 - Chart Layout
window.changeChartSize = changeChartSize;
window.hideChart = hideChart;
window.restoreChart = restoreChart;
window.resetChartLayout = resetChartLayout;
// ==========================================================
// PHASE 2 - KPI CUSTOMIZATION ENGINE
// ==========================================================

var KPI_STORAGE_KEY = "datavision_kpi_customization";

// Default KPI definitions (index-based mapping)
var DEFAULT_KPI_CONFIG = [
    { id: "kpi_0", title: "Total Sales",        icon: "💰", color: "#00b4d8", visible: true, highlighted: false },
    { id: "kpi_1", title: "Total Cost",         icon: "💳", color: "#0b1f3a", visible: true, highlighted: false },
    { id: "kpi_2", title: "Gross Profit",       icon: "📈", color: "#16a34a", visible: true, highlighted: false },
    { id: "kpi_3", title: "Profit Margin",      icon: "🎯", color: "#f59e0b", visible: true, highlighted: false },
    { id: "kpi_4", title: "Total Orders",       icon: "🧾", color: "#8b5cf6", visible: true, highlighted: false },
    { id: "kpi_5", title: "Units Sold",         icon: "📦", color: "#06b6d4", visible: true, highlighted: false },
    { id: "kpi_6", title: "Average Order Value", icon: "🛒", color: "#ec4899", visible: true, highlighted: false },
    { id: "kpi_7", title: "Unique Customers",   icon: "👥", color: "#f97316", visible: true, highlighted: false }
];

var kpiCustomization = [];
var currentEditingKpiIndex = null;

// Load saved customization from localStorage
function loadKPICustomization() {
    try {
        var saved = localStorage.getItem(KPI_STORAGE_KEY);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === DEFAULT_KPI_CONFIG.length) {
                kpiCustomization = parsed;
                return;
            }
        }
    } catch (e) {
        console.error("Load KPI custom error:", e);
    }
    // Fallback to defaults
    kpiCustomization = JSON.parse(JSON.stringify(DEFAULT_KPI_CONFIG));
}

// Save customization to localStorage
function saveKPICustomizationToStorage() {
    try {
        localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(kpiCustomization));
    } catch (e) {
        console.error("Save KPI custom error:", e);
    }
}

// Reset all KPI customizations
function resetKPICustomization() {
    if (!confirm("Reset all KPI customizations to default?")) return;
    kpiCustomization = JSON.parse(JSON.stringify(DEFAULT_KPI_CONFIG));
    saveKPICustomizationToStorage();
    if (appState.dashboardData) {
        renderDashboardKPIs(appState.dashboardData.kpis);
    }
    showMessage("✅ KPI customization reset!", "success");
    setTimeout(function() {
        var msg = document.getElementById("message");
        if (msg) msg.classList.add("hidden");
    }, 2000);
}

// Open KPI customize modal
function openKPIModal(index) {
    currentEditingKpiIndex = index;
    var config = kpiCustomization[index];
    if (!config) return;

    document.getElementById("kpiEditTitle").value = config.title;
    document.getElementById("kpiEditIcon").value = config.icon;
    document.getElementById("kpiEditColor").value = config.color;
    document.getElementById("kpiEditVisible").checked = config.visible !== false;
    document.getElementById("kpiEditHighlight").checked = config.highlighted === true;

    // Highlight selected color dot
    document.querySelectorAll(".kpi-color-dot").forEach(function(dot) {
        dot.classList.remove("selected");
        if (dot.dataset.color.toLowerCase() === config.color.toLowerCase()) {
            dot.classList.add("selected");
        }
    });

    document.getElementById("kpiCustomizeModal").classList.remove("hidden");
}

// Close KPI modal
function closeKPIModal() {
    document.getElementById("kpiCustomizeModal").classList.add("hidden");
    currentEditingKpiIndex = null;
}

// Pick emoji
function pickEmoji(emoji) {
    document.getElementById("kpiEditIcon").value = emoji;
}

// Pick color
function pickColor(color) {
    document.getElementById("kpiEditColor").value = color;
    document.querySelectorAll(".kpi-color-dot").forEach(function(dot) {
        dot.classList.remove("selected");
        if (dot.dataset.color.toLowerCase() === color.toLowerCase()) {
            dot.classList.add("selected");
        }
    });
}

// Save KPI customization
function saveKPICustomization() {
    if (currentEditingKpiIndex === null) return;

    var title = document.getElementById("kpiEditTitle").value.trim();
    var icon = document.getElementById("kpiEditIcon").value.trim() || "📊";
    var color = document.getElementById("kpiEditColor").value;
    var visible = document.getElementById("kpiEditVisible").checked;
    var highlighted = document.getElementById("kpiEditHighlight").checked;

    if (!title) {
        alert("Please enter a title.");
        return;
    }

    kpiCustomization[currentEditingKpiIndex] = {
        id: "kpi_" + currentEditingKpiIndex,
        title: title,
        icon: icon,
        color: color,
        visible: visible,
        highlighted: highlighted
    };

    saveKPICustomizationToStorage();
    closeKPIModal();

    if (appState.dashboardData) {
        renderDashboardKPIs(appState.dashboardData.kpis);
    }
    showMessage("✅ KPI updated!", "success");
    setTimeout(function() {
        var msg = document.getElementById("message");
        if (msg) msg.classList.add("hidden");
    }, 2000);
}
// ==========================================================
// PHASE 3 - CHART LAYOUT CUSTOMIZATION ENGINE
// ==========================================================

var LAYOUT_STORAGE_KEY = "datavision_chart_layout";

var DEFAULT_CHART_LAYOUT = [
    { id: "salesTrendChart",  size: "wide",   visible: true, order: 0 },
    { id: "productChart",     size: "small",  visible: true, order: 1 },
    { id: "categoryChart",    size: "small",  visible: true, order: 2 },
    { id: "profitTrendChart", size: "wide",   visible: true, order: 3 },
    { id: "orderTypeChart",   size: "small",  visible: true, order: 4 },
    { id: "stateChart",       size: "small",  visible: true, order: 5 },
    { id: "customerChart",    size: "wide",   visible: true, order: 6 }
];

var chartLayout = [];
var draggedChartId = null;

// Load layout from localStorage
function loadChartLayout() {
    try {
        var saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === DEFAULT_CHART_LAYOUT.length) {
                chartLayout = parsed;
                return;
            }
        }
    } catch (e) {
        console.error("Load layout error:", e);
    }
    chartLayout = JSON.parse(JSON.stringify(DEFAULT_CHART_LAYOUT));
}

// Save layout to localStorage
function saveChartLayout() {
    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(chartLayout));
    } catch (e) {
        console.error("Save layout error:", e);
    }
}

// Apply layout to DOM
function applyChartLayout() {
    var grid = document.querySelector(".dashboard-grid");
    if (!grid) return;

    // Sort by order
    var sorted = chartLayout.slice().sort(function(a, b) {
        return a.order - b.order;
    });

    // Apply each chart's properties
    sorted.forEach(function(cfg) {
        var card = grid.querySelector('[data-chart-id="' + cfg.id + '"]');
        if (!card) return;

        // Size
        card.classList.remove("size-small", "size-medium", "size-wide", "size-full");
        card.classList.add("size-" + cfg.size);

        // Visible
        if (cfg.visible) {
            card.classList.remove("hidden-chart");
        } else {
            card.classList.add("hidden-chart");
        }

        // Update size selector
        var sizeSelector = card.querySelector(".chart-size-selector");
        if (sizeSelector) sizeSelector.value = cfg.size;

        // Reorder in DOM
        grid.appendChild(card);
    });

    // Update hidden charts panel
    updateHiddenChartsPanel();

    // Resize all visible charts after layout change
    setTimeout(function() {
        window.dispatchEvent(new Event("resize"));
    }, 100);
}

// Change chart size
function changeChartSize(chartId, newSize) {
    var cfg = chartLayout.find(function(c) { return c.id === chartId; });
    if (!cfg) return;

    cfg.size = newSize;
    saveChartLayout();
    applyChartLayout();

    // Resize charts after layout change
    setTimeout(function() {
        window.dispatchEvent(new Event("resize"));
    }, 150);
}

// Hide chart
function hideChart(chartId) {
    var cfg = chartLayout.find(function(c) { return c.id === chartId; });
    if (!cfg) return;

    cfg.visible = false;
    saveChartLayout();
    applyChartLayout();

    showMessage("Chart hidden. Find it in the Hidden Charts panel below.", "info");
    setTimeout(function() {
        var msg = document.getElementById("message");
        if (msg) msg.classList.add("hidden");
    }, 2500);
}

// Restore chart
function restoreChart(chartId) {
    var cfg = chartLayout.find(function(c) { return c.id === chartId; });
    if (!cfg) return;

    cfg.visible = true;
    saveChartLayout();
    applyChartLayout();

    showMessage("Chart restored!", "success");
    setTimeout(function() {
        var msg = document.getElementById("message");
        if (msg) msg.classList.add("hidden");
    }, 2000);
}

// Update hidden charts panel
function updateHiddenChartsPanel() {
    var panel = document.getElementById("hiddenChartsPanel");
    var list = document.getElementById("hiddenChartsList");
    if (!panel || !list) return;

    var hiddenCharts = chartLayout.filter(function(c) { return !c.visible; });

    if (hiddenCharts.length === 0) {
        panel.classList.add("hidden");
        return;
    }

    panel.classList.remove("hidden");
    list.innerHTML = "";

    var CHART_NAMES = {
        salesTrendChart: "📈 Sales & Profit Trend",
        productChart: "📦 Product Performance",
        categoryChart: "📊 Category Performance",
        profitTrendChart: "💰 Sales vs Profit",
        orderTypeChart: "🧾 Order Type Distribution",
        stateChart: "📍 State Performance",
        customerChart: "👥 Top Customers"
    };

    hiddenCharts.forEach(function(cfg) {
        var item = document.createElement("div");
        item.className = "hidden-chart-item";
        item.onclick = function() { restoreChart(cfg.id); };
        item.innerHTML = '<span>' + (CHART_NAMES[cfg.id] || cfg.id) + '</span><span>↩ Restore</span>';
        list.appendChild(item);
    });
}

// Reset chart layout
function resetChartLayout() {
    if (!confirm("Reset all charts to default layout?")) return;

    chartLayout = JSON.parse(JSON.stringify(DEFAULT_CHART_LAYOUT));
    saveChartLayout();
    applyChartLayout();

    showMessage("✅ Chart layout reset to default!", "success");
    setTimeout(function() {
        var msg = document.getElementById("message");
        if (msg) msg.classList.add("hidden");
    }, 2000);
}

// ==========================================================
// DRAG AND DROP
// ==========================================================

function initializeDragAndDrop() {
    var grid = document.querySelector(".dashboard-grid");
    if (!grid) return;

    var cards = grid.querySelectorAll(".chart-card");

    cards.forEach(function(card) {
        // Drag start
        card.addEventListener("dragstart", function(e) {
            // Only allow drag from handle
            if (!e.target.classList.contains("drag-handle") && !e.target.closest(".drag-handle")) {
                e.preventDefault();
                return;
            }

            draggedChartId = card.dataset.chartId;
            card.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", draggedChartId);
        });

        // Drag end
        card.addEventListener("dragend", function() {
            card.classList.remove("dragging");
            grid.querySelectorAll(".chart-card").forEach(function(c) {
                c.classList.remove("drag-over");
            });
            draggedChartId = null;
        });

        // Drag over
        card.addEventListener("dragover", function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (card.dataset.chartId !== draggedChartId) {
                card.classList.add("drag-over");
            }
        });

        // Drag leave
        card.addEventListener("dragleave", function() {
            card.classList.remove("drag-over");
        });

        // Drop
        card.addEventListener("drop", function(e) {
            e.preventDefault();
            card.classList.remove("drag-over");

            var targetId = card.dataset.chartId;
            if (!draggedChartId || draggedChartId === targetId) return;

            // Swap orders
            var sourceCfg = chartLayout.find(function(c) { return c.id === draggedChartId; });
            var targetCfg = chartLayout.find(function(c) { return c.id === targetId; });

            if (sourceCfg && targetCfg) {
                var tempOrder = sourceCfg.order;
                sourceCfg.order = targetCfg.order;
                targetCfg.order = tempOrder;

                saveChartLayout();
                applyChartLayout();

                showMessage("Chart moved!", "success");
                setTimeout(function() {
                    var msg = document.getElementById("message");
                    if (msg) msg.classList.add("hidden");
                }, 1500);
            }
        });
    });
}

// ==========================================================
// INITIALIZE PHASE 3
// ==========================================================

document.addEventListener("DOMContentLoaded", function() {
    loadChartLayout();
    initializeDragAndDrop();
});
})();
// ==========================================================
// AUTH STATE CHECK (Header Buttons)
// ==========================================================
document.addEventListener("DOMContentLoaded", function() {
    checkAuthState();
    loadKPICustomization();
});

async function checkAuthState() {
    try {
        var response = await fetch("/api/auth/me");
        var data = await response.json();

        var authButtons = document.getElementById("authButtons");
        var userInfo = document.getElementById("userInfo");
        var userName = document.getElementById("userName");

        if (data.authenticated && data.user) {
            // User logged in
            if (authButtons) authButtons.classList.add("hidden");
            if (userInfo) userInfo.classList.remove("hidden");
            if (userName) userName.textContent = data.user.full_name || "User";
        } else {
            // User not logged in
            if (authButtons) authButtons.classList.remove("hidden");
            if (userInfo) userInfo.classList.add("hidden");
        }
    } catch (error) {
        console.log("Auth check skipped:", error.message);
    }
}
