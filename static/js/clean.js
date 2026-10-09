// ==========================================================
// DATAVISION BI - ADVANCED DATA CLEAN
// Chunk 2: Cleaning Options + Impact Preview
// ==========================================================

(function() {
    "use strict";

    var cleanData = null;
    var activeFilter = "all";

    // ============================================
    // OPTION DEFINITIONS
    // ============================================
    var OPTION_KEYS = [
        "remove_empty_rows",
        "remove_empty_columns",
        "remove_duplicates",
        "standardize_nulls",
        "trim_whitespace",
        "lowercase_text",
        "uppercase_text",
        "parse_numeric",
        "parse_dates",
        "remove_outliers",
        "remove_negatives",
        "fill_missing"
    ];

    // ============================================
    // FORMATTERS
    // ============================================
    function formatNumber(n) {
        if (n === null || n === undefined) return "0";
        return Number(n).toLocaleString();
    }

    function formatPercent(n) {
        if (n === null || n === undefined) return "0%";
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

    // ============================================
    // LOAD DATA
    // ============================================
    async function loadCleanInfo() {
        try {
            var response = await fetch("/api/clean-info", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: window.CLEAN_FILENAME })
            });

            var data = await response.json();

            if (!data.success) {
                document.getElementById("cleanLoadingMsg").textContent = "❌ " + (data.message || "Failed");
                return;
            }

            cleanData = data;
            renderAll();
            updateOptionsImpact();

            document.getElementById("cleanLoading").style.display = "none";
            document.getElementById("cleanContainer").style.display = "flex";

            document.getElementById("cleanLastUpdated").textContent =
                "Updated: " + new Date().toLocaleString();

        } catch (error) {
            console.error("Load error:", error);
            document.getElementById("cleanLoadingMsg").textContent = "❌ " + error.message;
        }
    }

    // ============================================
    // RENDER ALL
    // ============================================
    function renderAll() {
        renderOverview();
        renderQualityScore();
        renderColumnProfiles();
        attachOptionListeners();
    }

    // ============================================
    // OVERVIEW
    // ============================================
    function renderOverview() {
        var container = document.getElementById("cleanOverview");
        if (!container || !cleanData) return;

        var stats = [
            { label: "Total Rows", value: formatNumber(cleanData.rows), color: "#00b4d8" },
            { label: "Total Columns", value: formatNumber(cleanData.columns), color: "#0b1f3a" },
            { label: "Total Cells", value: formatNumber(cleanData.total_cells), color: "#8b5cf6" },
            { label: "Missing Values", value: formatNumber(cleanData.total_missing), color: "#f59e0b" },
            { label: "Duplicate Rows", value: formatNumber(cleanData.duplicate_rows), color: "#dc2626" },
            { label: "Numeric Columns", value: formatNumber(cleanData.column_profiles.filter(function(c) { return c.type === "numeric"; }).length), color: "#16a34a" }
        ];

        container.innerHTML = stats.map(function(s) {
            return '<div class="clean-stat-card" style="border-left-color:' + s.color + ';">' +
                '<div class="clean-stat-label">' + s.label + '</div>' +
                '<div class="clean-stat-value">' + s.value + '</div>' +
                '</div>';
        }).join("");
    }

    // ============================================
    // QUALITY SCORE
    // ============================================
    function renderQualityScore() {
        var container = document.getElementById("cleanQualityScore");
        if (!container || !cleanData) return;

        var score = cleanData.quality_score || 0;
        var color = score >= 80 ? "#16a34a" : (score >= 50 ? "#f59e0b" : "#dc2626");
        var label = score >= 80 ? "Excellent" : (score >= 50 ? "Good" : "Needs Improvement");

        container.innerHTML =
            '<div class="clean-quality-score" style="color:' + color + ';">' +
                score.toFixed(1) + '%' +
            '</div>' +
            '<div class="clean-quality-label">' + label + ' Quality</div>' +
            '<div class="clean-quality-bar">' +
                '<div class="clean-quality-fill" style="width:' + score + '%;background:' + color + ';"></div>' +
            '</div>';
    }

    // ============================================
    // COLUMN PROFILES
    // ============================================
    function renderColumnProfiles() {
        var container = document.getElementById("cleanColumnProfiles");
        if (!container || !cleanData) return;

        var profiles = cleanData.column_profiles || [];

        if (activeFilter !== "all") {
            if (activeFilter === "issues") {
                profiles = profiles.filter(function(p) {
                    return p.missing > 0 || p.unique === 1;
                });
            } else {
                profiles = profiles.filter(function(p) {
                    return p.type === activeFilter;
                });
            }
        }

        if (profiles.length === 0) {
            container.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;">No columns match this filter</div>';
            return;
        }

        var html = '<table class="clean-table"><thead><tr>' +
            '<th>#</th>' +
            '<th>Column</th>' +
            '<th>Type</th>' +
            '<th>Missing</th>' +
            '<th>Completeness</th>' +
            '<th>Unique</th>' +
            '<th>Total</th>' +
            '</tr></thead><tbody>';

        profiles.forEach(function(p, index) {
            var missingClass = p.missing_pct === 0 ? "missing-good" : (p.missing_pct < 10 ? "missing-warn" : "missing-danger");
            var completeness = 100 - p.missing_pct;
            var barClass = completeness >= 90 ? "" : (completeness >= 70 ? "warn" : "danger");

            html += '<tr>' +
                '<td>' + (index + 1) + '</td>' +
                '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
                '<td><span class="type-badge type-' + p.type + '">' + p.type + '</span></td>' +
                '<td><span class="missing-badge ' + missingClass + '">' + p.missing + ' (' + formatPercent(p.missing_pct) + ')</span></td>' +
                '<td>' +
                    '<span class="mini-bar"><span class="mini-bar-fill ' + barClass + '" style="width:' + completeness + '%;"></span></span>' +
                    completeness.toFixed(1) + '%' +
                '</td>' +
                '<td>' + formatNumber(p.unique) + '</td>' +
                '<td>' + formatNumber(p.total) + '</td>' +
                '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ============================================
    // ATTACH OPTION LISTENERS
    // ============================================
    function attachOptionListeners() {
        OPTION_KEYS.forEach(function(key) {
            var checkbox = document.getElementById("opt_" + key);
            if (checkbox) {
                checkbox.addEventListener("change", updateOptionsImpact);
            }
        });
        updateOptionsImpact();
    }

    // ============================================
    // UPDATE OPTIONS IMPACT
    // ============================================
    function updateOptionsImpact() {
        if (!cleanData) return;

        var selectedCount = 0;
        var rowsChange = 0;
        var colsChange = 0;
        var cellsChange = 0;

        // Get per-option impact
        var impacts = calculateImpacts();

        OPTION_KEYS.forEach(function(key) {
            var checkbox = document.getElementById("opt_" + key);
            var impactEl = document.getElementById("impact_" + key);
            var isChecked = checkbox && checkbox.checked;

            if (isChecked) selectedCount++;

            // Show per-option impact on the card
            if (impactEl) {
                var impact = impacts[key];
                if (impact && impact.value > 0) {
                    impactEl.textContent = impact.text;
                    impactEl.className = "clean-option-impact " + (impact.severity || "");
                } else if (impact) {
                    impactEl.textContent = impact.text || "0";
                    impactEl.className = "clean-option-impact empty";
                } else {
                    impactEl.textContent = "--";
                    impactEl.className = "clean-option-impact empty";
                }
            }

            // Accumulate totals only for selected options
            if (isChecked && impacts[key]) {
                rowsChange += impacts[key].rows || 0;
                colsChange += impacts[key].cols || 0;
                cellsChange += impacts[key].cells || 0;
            }
        });

        // Cap at max
        rowsChange = Math.min(rowsChange, cleanData.rows);
        colsChange = Math.min(colsChange, cleanData.columns);
        cellsChange = Math.min(cellsChange, cleanData.total_cells);

        // Update summary
        document.getElementById("cleanOptionsCount").textContent = selectedCount + " selected";

        document.getElementById("impactRowsChange").textContent = formatNumber(rowsChange);
        document.getElementById("impactRowsChangePct").textContent =
            cleanData.rows > 0 ? ((rowsChange / cleanData.rows) * 100).toFixed(1) + "%" : "0%";

        document.getElementById("impactColsChange").textContent = formatNumber(colsChange);
        document.getElementById("impactColsChangePct").textContent =
            cleanData.columns > 0 ? ((colsChange / cleanData.columns) * 100).toFixed(1) + "%" : "0%";

        document.getElementById("impactCellsChange").textContent = formatNumber(cellsChange);
        document.getElementById("impactCellsChangePct").textContent =
            cleanData.total_cells > 0 ? ((cellsChange / cleanData.total_cells) * 100).toFixed(1) + "%" : "0%";
    }

    // ============================================
    // CALCULATE PER-OPTION IMPACT
    // ============================================
    function calculateImpacts() {
        if (!cleanData) return {};

        var rows = cleanData.rows || 0;
        var cols = cleanData.columns || 0;
        var totalCells = cleanData.total_cells || 0;
        var totalMissing = cleanData.total_missing || 0;
        var duplicateRows = cleanData.duplicate_rows || 0;

        var profiles = cleanData.column_profiles || [];

        // Count by type
        var textCols = profiles.filter(function(p) { return p.type === "text"; });
        var numericCols = profiles.filter(function(p) { return p.type === "numeric"; });
        var dateCols = profiles.filter(function(p) { return p.type === "date"; });

        var textCells = textCols.reduce(function(sum, p) { return sum + p.total; }, 0);
        var numericCells = numericCols.reduce(function(sum, p) { return sum + p.total; }, 0);

        return {
            remove_empty_rows: {
                value: 0,  // We don't know until we scan
                rows: 0,
                cols: 0,
                cells: 0,
                text: "~" + Math.min(rows, 5),
                severity: ""
            },
            remove_empty_columns: {
                value: 0,
                rows: 0,
                cols: 0,
                cells: 0,
                text: "~1-2",
                severity: ""
            },
            remove_duplicates: {
                value: duplicateRows,
                rows: duplicateRows,
                cols: 0,
                cells: duplicateRows * cols,
                text: formatNumber(duplicateRows) + " rows",
                severity: duplicateRows > 0 ? "" : ""
            },
            standardize_nulls: {
                value: totalMissing,
                rows: 0,
                cols: 0,
                cells: totalMissing,
                text: formatNumber(totalMissing) + " cells",
                severity: ""
            },
            trim_whitespace: {
                value: textCells,
                rows: 0,
                cols: 0,
                cells: Math.floor(textCells * 0.1),
                text: "~" + formatNumber(Math.floor(textCells * 0.1)) + " cells",
                severity: ""
            },
            lowercase_text: {
                value: textCells,
                rows: 0,
                cols: 0,
                cells: textCells,
                text: textCols.length + " cols",
                severity: ""
            },
            uppercase_text: {
                value: textCells,
                rows: 0,
                cols: 0,
                cells: textCells,
                text: textCols.length + " cols",
                severity: ""
            },
            parse_numeric: {
                value: textCells,
                rows: 0,
                cols: 0,
                cells: Math.floor(textCells * 0.2),
                text: "~" + formatNumber(Math.floor(textCells * 0.2)) + " cells",
                severity: ""
            },
            parse_dates: {
                value: 0,
                rows: 0,
                cols: 0,
                cells: 0,
                text: dateCols.length + " cols",
                severity: ""
            },
            remove_outliers: {
                value: numericCells,
                rows: Math.floor(rows * 0.02),
                cols: 0,
                cells: Math.floor(numericCells * 0.02),
                text: "~" + Math.floor(rows * 0.02) + " rows",
                severity: "warn"
            },
            remove_negatives: {
                value: numericCells,
                rows: Math.floor(rows * 0.01),
                cols: 0,
                cells: Math.floor(numericCells * 0.01),
                text: "~" + Math.floor(rows * 0.01) + " rows",
                severity: "warn"
            },
            fill_missing: {
                value: totalMissing,
                rows: 0,
                cols: 0,
                cells: totalMissing,
                text: formatNumber(totalMissing) + " cells",
                severity: ""
            }
        };
    }

    // ============================================
    // FILTER COLUMNS
    // ============================================
    function filterColumns(type) {
        activeFilter = type;

        document.querySelectorAll(".clean-filter-btn").forEach(function(btn) {
            btn.classList.remove("active");
            if (btn.dataset.filter === type) {
                btn.classList.add("active");
            }
        });

        renderColumnProfiles();
    }

    // ============================================
    // OPTION BUTTONS
    // ============================================
    function selectSafeOptions() {
        var safeKeys = [
            "remove_empty_rows", "remove_empty_columns", "remove_duplicates",
            "standardize_nulls", "trim_whitespace", "parse_numeric", "parse_dates"
        ];
        OPTION_KEYS.forEach(function(key) {
            var cb = document.getElementById("opt_" + key);
            if (cb) cb.checked = safeKeys.indexOf(key) !== -1;
        });
        updateOptionsImpact();
    }

    function selectAllOptions() {
        OPTION_KEYS.forEach(function(key) {
            var cb = document.getElementById("opt_" + key);
            if (cb) cb.checked = true;
        });
        updateOptionsImpact();
    }

    function clearAllOptions() {
        OPTION_KEYS.forEach(function(key) {
            var cb = document.getElementById("opt_" + key);
            if (cb) cb.checked = false;
        });
        updateOptionsImpact();
    }

    // ============================================
    // REFRESH
    // ============================================
    function refreshCleanInfo() {
        document.getElementById("cleanContainer").style.display = "none";
        document.getElementById("cleanLoading").style.display = "flex";
        loadCleanInfo();
    }

    // ============================================
    // INIT
    // ============================================
    document.addEventListener("DOMContentLoaded", function() {
        loadCleanInfo();
    });

    // Expose globally
    window.filterColumns = filterColumns;
    window.refreshCleanInfo = refreshCleanInfo;
    window.selectSafeOptions = selectSafeOptions;
    window.selectAllOptions = selectAllOptions;
    window.clearAllOptions = clearAllOptions;

})();