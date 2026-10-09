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
        renderColumnCleaningGrid();
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
    // COLUMN-WISE CLEANING
    // ============================================

    // Available cleaning actions per column type
    var COLUMN_ACTIONS = {
        numeric: [
            { key: "parse_numeric", label: "🔢 Convert to number" },
            { key: "fill_missing_num", label: "🩹 Fill missing (median)" },
            { key: "remove_negatives_col", label: "➖ Remove negatives" },
            { key: "remove_outliers_col", label: "📊 Remove outliers (IQR)" }
        ],
        text: [
            { key: "trim_whitespace_col", label: "✂️ Trim whitespace" },
            { key: "lowercase_col", label: "🔡 Lowercase" },
            { key: "uppercase_col", label: "🔠 Uppercase" },
            { key: "fill_missing_text", label: "🩹 Fill missing (mode)" }
        ],
        date: [
            { key: "parse_date_col", label: "📅 Parse as date" },
            { key: "fill_missing_date", label: "🩹 Fill missing (forward-fill)" }
        ]
    };

    // Store selected actions per column
    var columnActions = {};

    // ============================================
    // RENDER COLUMN CLEANING GRID
    // ============================================
    function renderColumnCleaningGrid() {
        var container = document.getElementById("columnCleaningGrid");
        if (!container || !cleanData) return;

        var profiles = cleanData.column_profiles || [];
        container.innerHTML = "";
        columnActions = {};

        profiles.forEach(function(p) {
            var actions = COLUMN_ACTIONS[p.type] || [];
            if (actions.length === 0) return;

            columnActions[p.name] = {
                type: p.type,
                selected: false,
                actions: {}
            };

            // Initialize all actions to false
            actions.forEach(function(a) {
                columnActions[p.name].actions[a.key] = false;
            });

            var card = document.createElement("div");
            card.className = "column-card";
            card.dataset.column = p.name;

            var typeClass = "type-" + p.type;
            var typeLabel = p.type;

            var actionsHTML = "";
            actions.forEach(function(a) {
                actionsHTML +=
                    '<div class="column-action-row">' +
                        '<input type="checkbox" id="ca_' + encodeURIComponent(p.name) + '_' + a.key + '" data-column="' + escapeHtml(p.name) + '" data-action="' + a.key + '">' +
                        '<label for="ca_' + encodeURIComponent(p.name) + '_' + a.key + '">' + a.label + '</label>' +
                    '</div>';
            });

            card.innerHTML =
                '<div class="column-card-header">' +
                    '<input type="checkbox" class="column-card-check" data-column="' + escapeHtml(p.name) + '">' +
                    '<div class="column-card-name" title="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + '</div>' +
                    '<span class="type-badge ' + typeClass + ' column-card-type">' + typeLabel + '</span>' +
                '</div>' +
                '<div class="column-card-actions">' +
                    actionsHTML +
                '</div>' +
                '<div class="column-type-note">' +
                    'Missing: ' + p.missing + ' (' + p.missing_pct.toFixed(1) + '%) · Unique: ' + p.unique +
                '</div>';

            container.appendChild(card);
        });

        // Attach event listeners
        attachColumnActionListeners();
        updateColumnSummary();
    }

    function attachColumnActionListeners() {
        // Column selection checkbox
        document.querySelectorAll(".column-card-check").forEach(function(cb) {
            cb.addEventListener("change", function() {
                var column = this.dataset.column;
                var card = this.closest(".column-card");

                if (this.checked) {
                    card.classList.add("selected");
                    columnActions[column].selected = true;
                } else {
                    card.classList.remove("selected");
                    columnActions[column].selected = false;
                    // Uncheck all actions
                    document.querySelectorAll('.column-card[data-column="' + CSS.escape(column) + '"] .column-card-actions input[type="checkbox"]').forEach(function(ac) {
                        ac.checked = false;
                        columnActions[column].actions[ac.dataset.action] = false;
                    });
                }
                updateColumnSummary();
            });
        });

        // Action checkboxes
        document.querySelectorAll(".column-card-actions input[type='checkbox']").forEach(function(cb) {
            cb.addEventListener("change", function() {
                var column = this.dataset.column;
                var action = this.dataset.action;

                if (!columnActions[column]) return;

                columnActions[column].actions[action] = this.checked;

                // Auto-select the column if any action is checked
                if (this.checked) {
                    var card = this.closest(".column-card");
                    var mainCheck = card.querySelector(".column-card-check");
                    if (!mainCheck.checked) {
                        mainCheck.checked = true;
                        card.classList.add("selected");
                        columnActions[column].selected = true;
                    }
                }

                updateColumnSummary();
            });
        });
    }

    // ============================================
    // UPDATE COLUMN SUMMARY
    // ============================================
    function updateColumnSummary() {
        var summary = document.getElementById("columnCleaningSummary");
        if (!summary) return;

        var selectedCols = 0;
        var totalActions = 0;

        Object.keys(columnActions).forEach(function(col) {
            var cfg = columnActions[col];
            if (cfg.selected) {
                selectedCols++;
                Object.keys(cfg.actions).forEach(function(k) {
                    if (cfg.actions[k]) totalActions++;
                });
            }
        });

        if (selectedCols === 0) {
            summary.style.display = "none";
            return;
        }

        summary.style.display = "flex";
        document.getElementById("columnSummaryTitle").textContent =
            selectedCols + " column(s) selected";
        document.getElementById("columnSummaryDesc").textContent =
            totalActions + " cleaning action(s) will be applied";
    }

    // ============================================
    // SELECT ALL / NONE
    // ============================================
    function selectAllColumns() {
        document.querySelectorAll(".column-card-check").forEach(function(cb) {
            cb.checked = true;
            cb.dispatchEvent(new Event("change"));
        });
        document.querySelectorAll(".column-card-actions input[type='checkbox']").forEach(function(cb) {
            cb.checked = true;
            cb.dispatchEvent(new Event("change"));
        });
    }

    function selectNoColumns() {
        document.querySelectorAll(".column-card-check").forEach(function(cb) {
            cb.checked = false;
            cb.dispatchEvent(new Event("change"));
        });
        document.querySelectorAll(".column-card-actions input[type='checkbox']").forEach(function(cb) {
            cb.checked = false;
        });

        // Reset columnActions
        Object.keys(columnActions).forEach(function(col) {
            columnActions[col].selected = false;
            Object.keys(columnActions[col].actions).forEach(function(k) {
                columnActions[col].actions[k] = false;
            });
        });

        updateColumnSummary();
    }

    // ============================================
    // APPLY COLUMN CLEANING
    // ============================================
    async function applyColumnCleaning() {
        if (!cleanData) return;

        // Build column options
        var columnOptions = {};
        var totalSelected = 0;

        Object.keys(columnActions).forEach(function(col) {
            var cfg = columnActions[col];
            if (!cfg.selected) return;

            var activeActions = Object.keys(cfg.actions).filter(function(k) { return cfg.actions[k]; });
            if (activeActions.length === 0) return;

            columnOptions[col] = activeActions;
            totalSelected++;
        });

        if (totalSelected === 0) {
            alert("Please select at least one column and one action.");
            return;
        }

        var btn = event && event.target;
        if (btn) {
            btn.disabled = true;
            btn.textContent = "⏳ Applying...";
        }

        try {
            var response = await fetch("/api/clean-column", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: window.CLEAN_FILENAME,
                    column_options: columnOptions
                })
            });

            var data = await response.json();

            if (!data.success) {
                alert("Column cleaning failed: " + (data.message || "Unknown error"));
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "✅ Apply Column Cleaning";
                }
                return;
            }

            // Store for download
            window.__cleanedFile = data;

            // Show result modal
            renderColumnResultModal(data);
            document.getElementById("cleanResultModal").classList.remove("hidden");

            if (btn) {
                btn.disabled = false;
                btn.textContent = "✅ Apply Column Cleaning";
            }

        } catch (error) {
            console.error("Apply column cleaning error:", error);
            alert("Failed: " + error.message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = "✅ Apply Column Cleaning";
            }
        }
    }

    // ============================================
    // RENDER COLUMN RESULT MODAL
    // ============================================
    function renderColumnResultModal(data) {
        document.getElementById("resultRows").textContent =
            formatNumber(data.original_rows) + " → " + formatNumber(data.cleaned_rows);
        document.getElementById("resultCols").textContent =
            formatNumber(data.original_columns) + " → " + formatNumber(data.cleaned_columns);

        var totalChanges = 0;
        (data.log || []).forEach(function(item) {
            if (item.changed) totalChanges += item.changed;
            if (item.removed) totalChanges += item.removed;
        });
        document.getElementById("resultChanges").textContent = formatNumber(totalChanges);

        document.getElementById("resultFilename").textContent = data.cleaned_filename;

        var ext = data.cleaned_filename.split(".").pop().toUpperCase();
        document.getElementById("downloadFileFormat").textContent = ext;

        // Show log in modal
        var logHTML = '<div class="clean-log-list" style="max-height:200px;overflow-y:auto;">';
        (data.log || []).forEach(function(item) {
            var badge = "";
            if (item.changed !== undefined) {
                badge = '<span class="clean-log-badge">' + formatNumber(item.changed) + ' changed</span>';
            } else if (item.removed !== undefined) {
                badge = '<span class="clean-log-badge">' + formatNumber(item.removed) + ' removed</span>';
            } else {
                badge = '<span class="clean-log-badge gray">-</span>';
            }
            logHTML += '<div class="clean-log-item">' +
                '<span class="clean-log-icon">' + (item.icon || "✅") + '</span>' +
                '<div class="clean-log-body">' +
                    '<div class="clean-log-step">' + escapeHtml(item.step) + '</div>' +
                    '<div class="clean-log-detail">' + escapeHtml(item.detail) + '</div>' +
                '</div>' +
                badge +
                '</div>';
        });
        logHTML += '</div>';
        document.getElementById("cleanResultPreviewTable").innerHTML = logHTML;
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
    // PREVIEW CLEANING (DRY RUN)
    // ============================================
    async function previewCleaning() {
        if (!cleanData) return;

        // Collect selected options
        var options = {};
        OPTION_KEYS.forEach(function(key) {
            var cb = document.getElementById("opt_" + key);
            options[key] = cb ? cb.checked : false;
        });

        var selectedCount = Object.keys(options).filter(function(k) { return options[k]; }).length;
        if (selectedCount === 0) {
            alert("Please select at least one cleaning option.");
            return;
        }

        // Show loading
        var btn = event && event.target;
        if (btn) {
            btn.disabled = true;
            btn.textContent = "⏳ Previewing...";
        }

        try {
            var response = await fetch("/api/clean-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: window.CLEAN_FILENAME,
                    options: options
                })
            });

            var data = await response.json();

            if (!data.success) {
                alert("Preview failed: " + (data.message || "Unknown error"));
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "👁️ Preview Cleaning";
                }
                return;
            }

            renderPreview(data);

            if (btn) {
                btn.disabled = false;
                btn.textContent = "👁️ Preview Cleaning";
            }

            // Scroll to preview
            setTimeout(function() {
                document.getElementById("previewSection").scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);

        } catch (error) {
            console.error("Preview error:", error);
            alert("Preview failed: " + error.message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = "👁️ Preview Cleaning";
            }
        }
    }

    // ============================================
    // RENDER PREVIEW
    // ============================================
    function renderPreview(data) {
        var section = document.getElementById("previewSection");
        section.style.display = "block";

        // Before stats
        document.getElementById("baBeforeRows").textContent = formatNumber(data.before.rows);
        document.getElementById("baBeforeCols").textContent = formatNumber(data.before.columns);
        document.getElementById("baBeforeMissing").textContent = formatNumber(data.before.missing);
        document.getElementById("baBeforeDup").textContent = formatNumber(data.before.duplicates);

        // After stats
        document.getElementById("baAfterRows").textContent = formatNumber(data.after.rows);
        document.getElementById("baAfterCols").textContent = formatNumber(data.after.columns);
        document.getElementById("baAfterMissing").textContent = formatNumber(data.after.missing);
        document.getElementById("baAfterDup").textContent = formatNumber(data.after.duplicates);

        // Deltas
        setDelta("baAfterRowsDelta", data.before.rows, data.after.rows, true);
        setDelta("baAfterColsDelta", data.before.columns, data.after.columns, true);
        setDelta("baAfterMissingDelta", data.before.missing, data.after.missing, true);
        setDelta("baAfterDupDelta", data.before.duplicates, data.after.duplicates, true);

        // Log
        renderCleaningLog(data.log || []);

        // Preview table
        renderPreviewTable(data.preview || [], data.columns || []);

        // Store preview data globally for Apply
        window.__cleanPreviewData = data;
    }

    function setDelta(elementId, before, after, lowerIsBetter) {
        var el = document.getElementById(elementId);
        if (!el) return;

        var delta = after - before;
        if (delta === 0) {
            el.textContent = "no change";
            el.className = "delta-neutral";
            return;
        }

        var isGood = lowerIsBetter ? (delta < 0) : (delta > 0);
        var symbol = delta > 0 ? "+" : "";
        el.textContent = symbol + formatNumber(delta);
        el.className = isGood ? "delta-good" : "delta-bad";
    }

    // ============================================
    // RENDER CLEANING LOG
    // ============================================
    function renderCleaningLog(log) {
        var container = document.getElementById("cleanLogList");
        if (!container) return;

        if (!log || log.length === 0) {
            container.innerHTML = '<div class="clean-log-item empty">No changes applied</div>';
            return;
        }

        container.innerHTML = log.map(function(item) {
            var badge = "";
            if (item.changed !== undefined && item.changed > 0) {
                badge = '<span class="clean-log-badge">' + formatNumber(item.changed) + ' changed</span>';
            } else if (item.removed !== undefined && item.removed > 0) {
                badge = '<span class="clean-log-badge">' + formatNumber(item.removed) + ' removed</span>';
            } else {
                badge = '<span class="clean-log-badge gray">no change</span>';
            }

            return '<div class="clean-log-item' + (item.changed === 0 && item.removed === 0 ? ' empty' : '') + '">' +
                '<span class="clean-log-icon">' + (item.icon || "✅") + '</span>' +
                '<div class="clean-log-body">' +
                    '<div class="clean-log-step">' + escapeHtml(item.step) + '</div>' +
                    '<div class="clean-log-detail">' + escapeHtml(item.detail) + '</div>' +
                '</div>' +
                badge +
                '</div>';
        }).join("");
    }

    // ============================================
    // RENDER PREVIEW TABLE
    // ============================================
    function renderPreviewTable(preview, columns) {
        var container = document.getElementById("cleanPreviewTable");
        var count = document.getElementById("cleanPreviewCount");
        if (!container) return;

        if (!preview || preview.length === 0) {
            container.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;">No data to preview</div>';
            return;
        }

        if (count) {
            count.textContent = "(" + preview.length + " rows shown)";
        }

        var html = '<table class="clean-table"><thead><tr>';
        columns.forEach(function(col) {
            html += '<th>' + escapeHtml(col) + '</th>';
        });
        html += '</tr></thead><tbody>';

        preview.forEach(function(row) {
            html += '<tr>';
            columns.forEach(function(col) {
                var val = row[col];
                html += '<td>' + escapeHtml(val !== undefined && val !== null ? val : "") + '</td>';
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // ============================================
    // HIDE PREVIEW
    // ============================================
    function hidePreview() {
        document.getElementById("previewSection").style.display = "none";
    }

    // ============================================
    // APPLY CLEANING (will be fully done in Chunk 4)
    // ============================================
        // ============================================
    // APPLY CLEANING (REAL)
    // ============================================
    async function applyCleaning() {
        if (!cleanData) return;

        var options = {};
        OPTION_KEYS.forEach(function(key) {
            var cb = document.getElementById("opt_" + key);
            options[key] = cb ? cb.checked : false;
        });

        var selectedCount = Object.keys(options).filter(function(k) { return options[k]; }).length;
        if (selectedCount === 0) {
            alert("Please select at least one cleaning option.");
            return;
        }

        var btns = document.querySelectorAll(".clean-preview-actions button");
        btns.forEach(function(b) { b.disabled = true; });

        try {
            var response = await fetch("/api/clean-apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: window.CLEAN_FILENAME,
                    options: options
                })
            });

            var data = await response.json();

            if (!data.success) {
                alert("Cleaning failed: " + (data.message || "Unknown error"));
                btns.forEach(function(b) { b.disabled = false; });
                return;
            }

            // Store for download
            window.__cleanedFile = data;

            // Render result modal
            renderResultModal(data);
            document.getElementById("cleanResultModal").classList.remove("hidden");

            btns.forEach(function(b) { b.disabled = false; });

        } catch (error) {
            console.error("Apply error:", error);
            alert("Cleaning failed: " + error.message);
            btns.forEach(function(b) { b.disabled = false; });
        }
    }

    // ============================================
    // RENDER RESULT MODAL
    // ============================================
    function renderResultModal(data) {
        document.getElementById("resultRows").textContent =
            formatNumber(data.original_rows) + " → " + formatNumber(data.cleaned_rows);
        document.getElementById("resultCols").textContent =
            formatNumber(data.original_columns) + " → " + formatNumber(data.cleaned_columns);

        // Total changes (sum of log)
        var totalChanges = 0;
        (data.log || []).forEach(function(item) {
            if (item.changed) totalChanges += item.changed;
            if (item.removed) totalChanges += item.removed;
        });
        document.getElementById("resultChanges").textContent = formatNumber(totalChanges);

        document.getElementById("resultFilename").textContent = data.cleaned_filename;

        // Format label
        var ext = data.cleaned_filename.split(".").pop().toUpperCase();
        document.getElementById("downloadFileFormat").textContent = ext;

        // Preview table (first 20 rows)
        if (window.__cleanPreviewData && window.__cleanPreviewData.preview) {
            renderPreviewTable(
                window.__cleanPreviewData.preview,
                window.__cleanPreviewData.columns
            );
            // Move to result modal preview container
            var table = document.querySelector("#cleanPreviewTable");
            if (table) {
                document.getElementById("cleanResultPreviewTable").innerHTML = table.innerHTML;
            }
        }
    }

    // ============================================
    // CLOSE RESULT MODAL
    // ============================================
    function closeCleanResultModal() {
        document.getElementById("cleanResultModal").classList.add("hidden");
    }

    // ============================================
    // DOWNLOAD CLEANED FILE
    // ============================================
    function downloadCleanedFile() {
        if (!window.__cleanedFile || !window.__cleanedFile.cleaned_filename) {
            alert("No cleaned file available. Please clean data first.");
            return;
        }
        var url = "/api/clean-download/" + encodeURIComponent(window.__cleanedFile.cleaned_filename);
        window.open(url, "_blank");
    }

    // ============================================
    // USE CLEANED FILE IN DASHBOARD
    // ============================================
    function useCleanedFile() {
        if (!window.__cleanedFile || !window.__cleanedFile.cleaned_filename) {
            alert("No cleaned file available.");
            return;
        }

        var filename = window.__cleanedFile.cleaned_filename;

        // Store in localStorage so main page can pick it up
        try {
            localStorage.setItem("datavision_pending_file", filename);
        } catch (e) {}

        // Open main app in new tab
        var url = "/?use_file=" + encodeURIComponent(filename);
        window.open(url, "_blank");
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
    window.previewCleaning = previewCleaning;
    window.hidePreview = hidePreview;
    window.applyCleaning = applyCleaning;
    window.closeCleanResultModal = closeCleanResultModal;
    window.downloadCleanedFile = downloadCleanedFile;
    window.useCleanedFile = useCleanedFile;
    window.selectAllColumns = selectAllColumns;
    window.selectNoColumns = selectNoColumns;
    window.applyColumnCleaning = applyColumnCleaning;

})();