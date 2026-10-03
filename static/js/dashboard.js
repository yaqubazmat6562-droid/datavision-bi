
// ============================================
// DATAVISION BI
// PHASE 1 - UPLOAD ENGINE
// ============================================


const fileInput =
    document.getElementById("fileInput");

const dropZone =
    document.getElementById("dropZone");

const loading =
    document.getElementById("loading");

const message =
    document.getElementById("message");


// ============================================
// FILE SELECT
// ============================================

fileInput.addEventListener(
    "change",
    function () {

        if (this.files.length > 0) {

            uploadFile(this.files[0]);

        }

    }
);


// ============================================
// DRAG & DROP
// ============================================

dropZone.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        dropZone.classList.add("dragging");

    }
);


dropZone.addEventListener(
    "dragleave",
    function () {

        dropZone.classList.remove("dragging");

    }
);


dropZone.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        dropZone.classList.remove("dragging");

        const files =
            event.dataTransfer.files;

        if (files.length > 0) {

            uploadFile(files[0]);

        }

    }
);


// ============================================
// UPLOAD FILE
// ============================================

async function uploadFile(file) {

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );


    // Show loading
    loading.classList.remove("hidden");

    message.innerHTML = "";

    try {

        const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        loading.classList.add("hidden");


        if (!data.success) {

            showMessage(
                data.message,
                "error"
            );

            return;

        }


        showMessage(
            data.message,
            "success"
        );


        displayProfile(data);

        displayPreview(data.preview);


    }

    catch (error) {

        loading.classList.add("hidden");

        showMessage(
            "Upload failed: " +
            error.message,
            "error"
        );

    }

}


// ============================================
// MESSAGE
// ============================================

function showMessage(
    text,
    type
) {

    message.innerText = text;

    if (type === "success") {

        message.style.background =
            "#dcfce7";

        message.style.color =
            "#166534";

    }
    else {

        message.style.background =
            "#fee2e2";

        message.style.color =
            "#991b1b";

    }

}


// ============================================
// DISPLAY PROFILE
// ============================================

function displayProfile(data) {

    const section =
        document.getElementById(
            "profileSection"
        );


    section.classList.remove(
        "hidden"
    );


    document.getElementById(
        "fileName"
    ).innerText =
        data.filename;


    document.getElementById(
        "rowCount"
    ).innerText =
        data.rows.toLocaleString();


    document.getElementById(
        "columnCount"
    ).innerText =
        data.columns;


    document.getElementById(
        "missingCount"
    ).innerText =
        data.missing_values;


    document.getElementById(
        "duplicateCount"
    ).innerText =
        data.duplicate_rows;


    displayTags(
        "numericColumns",
        data.numeric_columns
    );


    displayTags(
        "dateColumns",
        data.date_columns
    );


    displayTags(
        "textColumns",
        data.text_columns
    );

}


// ============================================
// DISPLAY TAGS
// ============================================

function displayTags(
    elementId,
    items
) {

    const container =
        document.getElementById(
            elementId
        );


    container.innerHTML = "";


    if (
        !items ||
        items.length === 0
    ) {

        container.innerHTML =
            "<span>No columns detected</span>";

        return;

    }


    items.forEach(
        function (item) {

            const tag =
                document.createElement(
                    "span"
                );

            tag.className = "tag";

            tag.innerText = item;

            container.appendChild(
                tag
            );

        }
    );

}


// ============================================
// DATA PREVIEW
// ============================================

function displayPreview(data) {

    const container =
        document.getElementById(
            "tableContainer"
        );


    container.innerHTML = "";


    if (
        !data ||
        data.length === 0
    ) {

        container.innerHTML =
            "<p>No preview available.</p>";

        return;

    }


    const table =
        document.createElement(
            "table"
        );


    const thead =
        document.createElement(
            "thead"
        );


    const tbody =
        document.createElement(
            "tbody"
        );


    // Header
    const headerRow =
        document.createElement(
            "tr"
        );


    Object.keys(data[0]).forEach(
        function (column) {

            const th =
                document.createElement(
                    "th"
                );

            th.innerText =
                column;

            headerRow.appendChild(
                th
            );

        }
    );


    thead.appendChild(
        headerRow
    );


    // Rows
    data.forEach(
        function (row) {

            const tr =
                document.createElement(
                    "tr"
                );


            Object.values(row).forEach(
                function (value) {

                    const td =
                        document.createElement(
                            "td"
                        );

                    td.innerText =
                        value;

                    tr.appendChild(
                        td
                    );

                }
            );


            tbody.appendChild(
                tr
            );

        }
    );


    table.appendChild(
        thead
    );

    table.appendChild(
        tbody
    );


    container.appendChild(
        table
    );

}


// ============================================
// FUTURE FEATURES
// ============================================

function createDashboard() {

    alert(
        "Dashboard Engine will be added in Phase 4."
    );

}


function createSummary() {

    alert(
        "Summary Engine will be added in Phase 4."
    );

}



// ============================================
// PHASE 2
// AUTOMATIC DATA CLEANING
// ============================================

async function cleanData() {

    const fileNameElement =
        document.getElementById(
            "fileName"
        );


    if (!fileNameElement) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    const filename =
        fileNameElement.innerText.trim();


    if (
        !filename ||
        filename === "File"
    ) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    loading.classList.remove(
        "hidden"
    );


    message.innerHTML = "";


    const formData =
        new FormData();


    formData.append(
        "filename",
        filename
    );


    try {

        const response =
            await fetch(
                "/clean",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        loading.classList.add(
            "hidden"
        );


        if (!data.success) {

            showMessage(
                data.message,
                "error"
            );

            return;

        }


        showMessage(
            data.message,
            "success"
        );


        displayCleaningReport(
            data.report
        );


    }

    catch (error) {

        loading.classList.add(
            "hidden"
        );


        showMessage(
            "Cleaning failed: " +
            error.message,
            "error"
        );

    }

}


// ============================================
// DISPLAY CLEANING REPORT
// ============================================

function displayCleaningReport(
    report
) {

    let existing =
        document.getElementById(
            "cleaningReport"
        );


    if (existing) {

        existing.remove();

    }


    const section =
        document.createElement(
            "section"
        );


    section.id =
        "cleaningReport";


    section.className =
        "preview-section";


    section.style.marginTop =
        "25px";


    const outlierCount =
        Object.values(
            report.outliers || {}
        )
        .reduce(
            function(total, item) {

                return total +
                    item.count;

            },
            0
        );


    const negativeCount =
        Object.values(
            report.negative_values || {}
        )
        .reduce(
            function(total, count) {

                return total + count;

            },
            0
        );


    section.innerHTML = `

        <div class="preview-header">

            <div>

                <h2>
                    Data Cleaning Report
                </h2>

                <span>
                    Automatic quality analysis
                </span>

            </div>

        </div>


        <div class="stats-grid">


            <div class="stat-card">

                <span class="stat-label">
                    Data Quality
                </span>

                <strong>
                    ${report.quality_score}%
                </strong>

            </div>


            <div class="stat-card">

                <span class="stat-label">
                    Rows Removed
                </span>

                <strong>
                    ${report.empty_rows_removed}
                </strong>

            </div>


            <div class="stat-card">

                <span class="stat-label">
                    Duplicate Rows
                </span>

                <strong>
                    ${report.duplicate_rows}
                </strong>

            </div>


            <div class="stat-card">

                <span class="stat-label">
                    Missing Values
                </span>

                <strong>
                    ${report.total_missing}
                </strong>

            </div>


        </div>


        <div class="analysis-grid">


            <div class="analysis-card">

                <h3>
                    Date Columns
                </h3>

                <div class="tag-container">

                    ${
                        createTags(
                            report.date_columns
                        )
                    }

                </div>

            </div>


            <div class="analysis-card">

                <h3>
                    Outliers
                </h3>

                <p>

                    ${outlierCount}
                    outlier values detected

                </p>

            </div>


            <div class="analysis-card">

                <h3>
                    Negative Values
                </h3>

                <p>

                    ${negativeCount}
                    negative values detected

                </p>

            </div>


            <div class="analysis-card">

                <h3>
                    Duplicate Order Numbers
                </h3>

                <p>

                    ${report.duplicate_order_numbers}

                </p>

            </div>


        </div>


        <div class="preview-section">

            <div class="preview-header">

                <h2>
                    Cleaned Data Preview
                </h2>

                <span>
                    First 10 rows
                </span>

            </div>


            <div
                id="cleanedTable"
                class="table-container"
            ></div>


        </div>


        <div style="
            margin-top:20px;
            padding:15px;
            background:#f1f5f9;
            border-radius:10px;
        ">

            <strong>
                Cleaned File:
            </strong>

            ${report.output_file}

        </div>

    `;


    document
        .getElementById(
            "profileSection"
        )
        .appendChild(
            section
        );


    displayPreviewToElement(
        report.preview,
        "cleanedTable"
    );

}


// ============================================
// CREATE TAGS
// ============================================

function createTags(
    items
) {

    if (
        !items ||
        items.length === 0
    ) {

        return `
            <span>
                No columns detected
            </span>
        `;

    }


    return items
        .map(
            item =>
                `<span class="tag">${item}</span>`
        )
        .join("");

}


// ============================================
// DISPLAY TABLE IN SPECIFIC ELEMENT
// ============================================

function displayPreviewToElement(
    data,
    elementId
) {

    const container =
        document.getElementById(
            elementId
        );


    if (
        !container ||
        !data ||
        data.length === 0
    ) {

        return;

    }


    const table =
        document.createElement(
            "table"
        );


    const thead =
        document.createElement(
            "thead"
        );


    const tbody =
        document.createElement(
            "tbody"
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    Object.keys(
        data[0]
    ).forEach(
        function(column) {

            const th =
                document.createElement(
                    "th"
                );

            th.innerText =
                column;

            headerRow.appendChild(
                th
            );

        }
    );


    thead.appendChild(
        headerRow
    );


    data.forEach(
        function(row) {

            const tr =
                document.createElement(
                    "tr"
                );


            Object.values(
                row
            ).forEach(
                function(value) {

                    const td =
                        document.createElement(
                            "td"
                        );

                    td.innerText =
                        value;

                    tr.appendChild(
                        td
                    );

                }
            );


            tbody.appendChild(
                tr
            );

        }
    );


    table.appendChild(
        thead
    );

    table.appendChild(
        tbody
    );


    container.appendChild(
        table
    );

}




// ==========================================================
// PHASE 3 - ADVANCED DATA EXPLORER
// ==========================================================


let explorerFilename = "";


// ==========================================================
// OPEN EXPLORER
// ==========================================================

async function exploreData() {

    const fileNameElement =
        document.getElementById(
            "fileName"
        );


    if (!fileNameElement) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    explorerFilename =
        fileNameElement.innerText.trim();


    if (
        !explorerFilename ||
        explorerFilename === "File"
    ) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    const section =
        document.getElementById(
            "explorerSection"
        );


    section.classList.remove(
        "hidden"
    );


    section.scrollIntoView({
        behavior: "smooth"
    });


    await loadExplorerOverview();

    await loadExplorerProfile();

}


// ==========================================================
// LOAD OVERVIEW
// ==========================================================

async function loadExplorerOverview() {

    const formData =
        new FormData();


    formData.append(
        "filename",
        explorerFilename
    );


    try {

        const response =
            await fetch(
                "/explorer/overview",
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        displayExplorerStats(
            result.data
        );


    }
    catch (error) {

        console.error(
            error
        );

    }

}


// ==========================================================
// DISPLAY OVERVIEW
// ==========================================================

function displayExplorerStats(
    data
) {

    const container =
        document.getElementById(
            "explorerStats"
        );


    container.innerHTML = `

        <div class="stat-card">

            <span class="stat-label">
                Total Rows
            </span>

            <strong>
                ${data.rows.toLocaleString()}
            </strong>

        </div>


        <div class="stat-card">

            <span class="stat-label">
                Columns
            </span>

            <strong>
                ${data.columns}
            </strong>

        </div>


        <div class="stat-card">

            <span class="stat-label">
                Missing Values
            </span>

            <strong>
                ${data.missing_values.toLocaleString()}
            </strong>

        </div>


        <div class="stat-card">

            <span class="stat-label">
                Duplicate Rows
            </span>

            <strong>
                ${data.duplicate_rows.toLocaleString()}
            </strong>

        </div>

    `;

}


// ==========================================================
// LOAD COLUMN PROFILE
// ==========================================================

async function loadExplorerProfile() {

    const formData =
        new FormData();


    formData.append(
        "filename",
        explorerFilename
    );


    try {

        const response =
            await fetch(
                "/explorer/profile",
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        displayColumnProfile(
            result.profile
        );


        populateExplorerColumns(
            result.profile
        );


    }
    catch (error) {

        console.error(
            error
        );

    }

}


// ==========================================================
// COLUMN PROFILE UI
// ==========================================================

function displayColumnProfile(
    profile
) {

    const container =
        document.getElementById(
            "columnProfile"
        );


    container.innerHTML = "";


    profile.forEach(
        function(column) {

            let details = "";


            if (
                column.min !== undefined
            ) {

                details = `

                    <p>
                        Min:
                        <strong>
                            ${column.min}
                        </strong>
                    </p>

                    <p>
                        Max:
                        <strong>
                            ${column.max}
                        </strong>
                    </p>

                    <p>
                        Average:
                        <strong>
                            ${column.mean}
                        </strong>
                    </p>

                    <p>
                        Median:
                        <strong>
                            ${column.median}
                        </strong>
                    </p>

                    <p>
                        Outliers:
                        <strong>
                            ${column.outliers || 0}
                        </strong>
                    </p>

                `;

            }
            else {

                details = `

                    <p>
                        Unique Values:
                        <strong>
                            ${column.unique}
                        </strong>
                    </p>

                `;

            }


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "analysis-card";


            card.innerHTML = `

                <h3>
                    ${column.column}
                </h3>

                <p>
                    Type:
                    <strong>
                        ${column.data_type}
                    </strong>
                </p>

                <p>
                    Missing:
                    <strong>
                        ${column.missing}
                    </strong>

                    (${column.missing_percent}%)
                </p>

                <p>
                    Unique:
                    <strong>
                        ${column.unique}
                    </strong>
                </p>

                ${details}

            `;


            container.appendChild(
                card
            );

        }
    );

}


// ==========================================================
// POPULATE COLUMN DROPDOWN
// ==========================================================

function populateExplorerColumns(
    profile
) {

    const select =
        document.getElementById(
            "explorerColumn"
        );


    select.innerHTML = `

        <option value="">
            Select Column
        </option>

    `;


    profile.forEach(
        function(column) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                column.column;


            option.innerText =
                column.column;


            select.appendChild(
                option
            );

        }
    );

}


// ==========================================================
// SEARCH DATA
// ==========================================================

async function runExplorerSearch() {

    const column =
        document.getElementById(
            "explorerColumn"
        ).value;


    const search =
        document.getElementById(
            "explorerSearch"
        ).value;


    if (!column) {

        alert(
            "Please select a column."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "filename",
        explorerFilename
    );


    formData.append(
        "column",
        column
    );


    formData.append(
        "search",
        search
    );


    try {

        const response =
            await fetch(
                "/explorer/filter",
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        displayExplorerTable(
            result.data
        );


    }
    catch (error) {

        console.error(
            error
        );

    }

}


// ==========================================================
// EXPLORER TABLE
// ==========================================================

function displayExplorerTable(
    data
) {

    const container =
        document.getElementById(
            "explorerTable"
        );


    const count =
        document.getElementById(
            "explorerResultCount"
        );


    container.innerHTML = "";


    count.innerText =
        `${data.length} rows`;


    if (
        !data ||
        data.length === 0
    ) {

        container.innerHTML =
            "<p>No records found.</p>";

        return;

    }


    const table =
        document.createElement(
            "table"
        );


    const thead =
        document.createElement(
            "thead"
        );


    const tbody =
        document.createElement(
            "tbody"
        );


    const header =
        document.createElement(
            "tr"
        );


    Object.keys(
        data[0]
    ).forEach(
        function(column) {

            const th =
                document.createElement(
                    "th"
                );


            th.innerText =
                column;


            header.appendChild(
                th
            );

        }
    );


    thead.appendChild(
        header
    );


    data.forEach(
        function(row) {

            const tr =
                document.createElement(
                    "tr"
                );


            Object.values(
                row
            ).forEach(
                function(value) {

                    const td =
                        document.createElement(
                            "td"
                        );


                    td.innerText =
                        value;


                    tr.appendChild(
                        td
                    );

                }
            );


            tbody.appendChild(
                tr
            );

        }
    );


    table.appendChild(
        thead
    );

    table.appendChild(
        tbody
    );


    container.appendChild(
        table
    );

}



// ==========================================================
// PHASE 4 - AUTOMATIC DASHBOARD
// ==========================================================

let dashboardFilename = "";

let dashboardData = null;
// ==========================================================
// ADVANCED CHART INSTANCES
// ==========================================================

let profitTrendChartInstance = null;

let orderTypeChartInstance = null;

let stateChartInstance = null;

let customerChartInstance = null;

// ==========================================================
// CREATE DASHBOARD
// ==========================================================

async function createDashboard() {

    const fileElement =
        document.getElementById(
            "fileName"
        );


    if (!fileElement) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    dashboardFilename =
        fileElement.innerText.trim();


    if (
        !dashboardFilename ||
        dashboardFilename === "File"
    ) {

        alert(
            "Please upload a file first."
        );

        return;

    }


    const dashboardSection =
        document.getElementById(
            "dashboardSection"
        );


    dashboardSection.classList.remove(
        "hidden"
    );


    dashboardSection.scrollIntoView({

        behavior: "smooth"

    });


    await generateDashboard();

}


// ==========================================================
// GENERATE DASHBOARD
// ==========================================================

async function generateDashboard() {

    const formData =
        new FormData();


    formData.append(
        "filename",
        dashboardFilename
    );


    try {

        const response =
            await fetch(
                "/dashboard/build",
                {

                    method: "POST",

                    body: formData

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(
                result.message
            );

            return;

        }


        dashboardData =
            result.dashboard;


        renderDashboard(
            dashboardData
        );


    }
    catch (error) {

        console.error(
            error
        );


        alert(
            "Dashboard generation failed: "
            + error.message
        );

    }

}


// ==========================================================
// RENDER DASHBOARD
// ==========================================================

function renderDashboard(
    data
) {

    renderDashboardKPIs(
        data.kpis
    );


    renderDataModel(
        data
    );


    renderSalesTrend(
        data.monthly_trend
    );


    renderProductChart(
        data.products
    );


    renderCategoryChart(
        data.categories
    );

}


// ==========================================================
// PHASE 5.1
// ADVANCED EXECUTIVE KPI ENGINE
// ==========================================================

function renderDashboardKPIs(kpis) {

    const container =
        document.getElementById("dashboardKPIs");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!kpis) {
        container.innerHTML =
            "<p>No KPI data available.</p>";
        return;
    }


    // ======================================================
    // SAFE VALUES
    // ======================================================

    const totalSales =
        Number(kpis.total_sales || 0);

    const totalCost =
        Number(kpis.total_cost || 0);

    const profit =
        Number(
            kpis.profit !== undefined
                ? kpis.profit
                : totalSales - totalCost
        );

    const profitMargin =
        Number(
            kpis.profit_margin !== undefined
                ? kpis.profit_margin
                : (
                    totalSales !== 0
                        ? (profit / totalSales) * 100
                        : 0
                )
        );

    const totalOrders =
        Number(kpis.total_orders || 0);

    const totalUnits =
        Number(kpis.total_units || 0);

    const aov =
        Number(
            kpis.average_order_value !== undefined
                ? kpis.average_order_value
                : (
                    totalOrders !== 0
                        ? totalSales / totalOrders
                        : 0
                )
        );

    const uniqueCustomers =
        Number(kpis.unique_customers || 0);


    // ======================================================
    // OPTIONAL YOY / GROWTH VALUES
    // ======================================================

    const salesGrowth =
        getGrowthValue(
            kpis.sales_growth,
            kpis.sales_yoy
        );

    const profitGrowth =
        getGrowthValue(
            kpis.profit_growth,
            kpis.profit_yoy
        );

    const orderGrowth =
        getGrowthValue(
            kpis.orders_growth,
            kpis.orders_yoy
        );

    const unitGrowth =
        getGrowthValue(
            kpis.units_growth,
            kpis.units_yoy
        );


    // ======================================================
    // KPI DEFINITIONS
    // ======================================================

    const cards = [

        {
            title: "Total Sales",
            value: formatCurrency(totalSales),
            icon: "💰",
            growth: salesGrowth,
            type: "currency"
        },

        {
            title: "Total Cost",
            value: formatCurrency(totalCost),
            icon: "💳",
            growth: null,
            type: "currency"
        },

        {
            title: "Gross Profit",
            value: formatCurrency(profit),
            icon: "📈",
            growth: profitGrowth,
            type: "currency",
            positiveWhenUp: true
        },

        {
            title: "Profit Margin",
            value: formatPercent(profitMargin),
            icon: "🎯",
            growth: null,
            type: "percent"
        },

        {
            title: "Total Orders",
            value: formatNumber(totalOrders),
            icon: "🧾",
            growth: orderGrowth,
            type: "number"
        },

        {
            title: "Units Sold",
            value: formatNumber(totalUnits),
            icon: "📦",
            growth: unitGrowth,
            type: "number"
        },

        {
            title: "Average Order Value",
            value: formatCurrency(aov),
            icon: "🛒",
            growth: null,
            type: "currency"
        },

        {
            title: "Unique Customers",
            value: formatNumber(uniqueCustomers),
            icon: "👥",
            growth: null,
            type: "number"
        }

    ];


    // ======================================================
    // CREATE CARDS
    // ======================================================

    cards.forEach(function(card) {

        const element =
            document.createElement("div");

        element.className =
            "stat-card dashboard-kpi advanced-kpi-card";


        let growthHTML = "";

        if (card.growth !== null) {

            const growth =
                Number(card.growth || 0);

            const direction =
                growth > 0
                    ? "up"
                    : growth < 0
                        ? "down"
                        : "neutral";

            const arrow =
                growth > 0
                    ? "▲"
                    : growth < 0
                        ? "▼"
                        : "•";

            growthHTML = `

                <div class="kpi-growth ${direction}">

                    <span class="growth-arrow">
                        ${arrow}
                    </span>

                    <span>
                        ${Math.abs(growth).toFixed(1)}%
                    </span>

                    <small>
                        vs previous period
                    </small>

                </div>

            `;

        }


        element.innerHTML = `

            <div class="kpi-top">

                <div class="kpi-icon">
                    ${card.icon}
                </div>

                <span class="kpi-status">
                    Live
                </span>

            </div>


            <div class="kpi-title">

                ${card.title}

            </div>


            <div class="kpi-value">

                ${card.value}

            </div>


            ${growthHTML}


        `;


        container.appendChild(element);

    });

}


// ==========================================================
// SAFE GROWTH VALUE
// ==========================================================

function getGrowthValue(primary, secondary) {

    if (
        primary !== undefined &&
        primary !== null &&
        primary !== ""
    ) {

        return Number(primary);

    }

    if (
        secondary !== undefined &&
        secondary !== null &&
        secondary !== ""
    ) {

        return Number(secondary);

    }

    return null;

}
// ==========================================================
// DATA MODEL
// ==========================================================

function renderDataModel(
    data
) {

    const container =
        document.getElementById(
            "dashboardDataModel"
        );


    const business =
        data.business_columns;


    container.innerHTML = `

        <div class="analysis-card">

            <h3>
                🤖 Automatic Detection
            </h3>

            <p>
                Date:
                <strong>
                    ${data.date_column || "Not detected"}
                </strong>
            </p>

            <p>
                Sales:
                <strong>
                    ${business.sales || "Not detected"}
                </strong>
            </p>

            <p>
                Cost:
                <strong>
                    ${business.cost || "Not detected"}
                </strong>
            </p>

            <p>
                Quantity:
                <strong>
                    ${business.quantity || "Not detected"}
                </strong>
            </p>

        </div>


        <div class="analysis-card">

            <h3>
                Product
            </h3>

            <p>
                ${
                    business.product
                    || "Not detected"
                }
            </p>

        </div>


        <div class="analysis-card">

            <h3>
                Category
            </h3>

            <p>
                ${
                    business.category
                    || "Not detected"
                }
            </p>

        </div>


        <div class="analysis-card">

            <h3>
                Location
            </h3>

            <p>
                State:
                ${
                    business.state
                    || "Not detected"
                }
            </p>

            <p>
                City:
                ${
                    business.city
                    || "Not detected"
                }
            </p>

        </div>

    `;

}


// ==========================================================
// PHASE 5.2
// ADVANCED SALES & PROFIT TREND
// ==========================================================

function renderSalesTrend(data) {

    const canvas =
        document.getElementById(
            "salesTrendChart"
        );

    if (!canvas) {
        return;
    }


    if (!Array.isArray(data) || data.length === 0) {

        if (window.salesTrendChartInstance) {

            window.salesTrendChartInstance.destroy();

            window.salesTrendChartInstance = null;

        }

        return;
    }


    // ------------------------------------------------------
    // Destroy previous chart
    // ------------------------------------------------------

    if (window.salesTrendChartInstance) {

        window.salesTrendChartInstance.destroy();

        window.salesTrendChartInstance = null;

    }


    // ------------------------------------------------------
    // Detect columns
    // ------------------------------------------------------

    const business =
        dashboardData &&
        dashboardData.business_columns
            ? dashboardData.business_columns
            : {};


    const salesColumn =
        business.sales;


    const costColumn =
        business.cost;


    const labels =
        data.map(function(item) {

            return (
                item.Year_Month ||
                item.year_month ||
                item.month ||
                item.Month ||
                ""
            );

        });


    // ------------------------------------------------------
    // SALES DATA
    // ------------------------------------------------------

    const salesValues =
        data.map(function(item) {

            return Number(
                item[salesColumn] ||
                item.sales ||
                item.Sales ||
                item.total_sales ||
                0
            );

        });


    // ------------------------------------------------------
    // COST DATA
    // ------------------------------------------------------

    const costValues =
        data.map(function(item) {

            return Number(
                item[costColumn] ||
                item.cost ||
                item.Cost ||
                item.total_cost ||
                0
            );

        });


    // ------------------------------------------------------
    // PROFIT DATA
    // ------------------------------------------------------

    const profitValues =
        salesValues.map(function(
            sales,
            index
        ) {

            return (
                sales -
                costValues[index]
            );

        });


    // ------------------------------------------------------
    // CREATE CHART
    // ------------------------------------------------------

    window.salesTrendChartInstance =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        // SALES
                        {

                            label:
                                "Sales",

                            data:
                                salesValues,

                            tension:
                                0.35,

                            borderWidth:
                                3,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                6,

                            fill:
                                false

                        },


                        // PROFIT
                        {

                            label:
                                "Gross Profit",

                            data:
                                profitValues,

                            tension:
                                0.35,

                            borderWidth:
                                3,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                6,

                            fill:
                                false

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    plugins: {

                        legend: {

                            display:
                                true,

                            position:
                                "top"

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        const value =
                                            Number(
                                                context.raw ||
                                                0
                                            );

                                        return (
                                            context.dataset.label +
                                            ": ₹ " +
                                            value.toLocaleString(
                                                "en-IN"
                                            )
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    function(
                                        value
                                    ) {

                                        return (
                                            "₹ " +
                                            Number(
                                                value
                                            ).toLocaleString(
                                                "en-IN"
                                            )
                                        );

                                    }

                            }

                        },


                        x: {

                            ticks: {

                                maxRotation:
                                    45,

                                minRotation:
                                    0

                            }

                        }

                    }

                }

            }
        );

}
// ==========================================================
// PRODUCT CHART
// ==========================================================

function renderProductChart(
    data
) {

    const canvas =
        document.getElementById(
            "productChart"
        );


    if (!canvas || !data.length) {

        return;

    }


    const productColumn =
        dashboardData
        .business_columns
        .product;


    const salesColumn =
        dashboardData
        .business_columns
        .sales;


    if (
        window.productChartInstance
    ) {

        window.productChartInstance.destroy();

    }


    window.productChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels:
                        data.map(
                            item =>
                                item[
                                    productColumn
                                ]
                        ),

                    datasets: [

                        {

                            label:
                                "Sales",

                            data:
                                data.map(
                                    item =>
                                        item[
                                            salesColumn
                                        ]
                                )

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    plugins: {

                        legend: {

                            display:
                                false

                        }

                    }

                }

            }
        );

}


// ==========================================================
// CATEGORY CHART
// ==========================================================

function renderCategoryChart(
    data
) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );


    if (!canvas || !data.length) {

        return;

    }


    const categoryColumn =
        dashboardData
        .business_columns
        .category;


    const salesColumn =
        dashboardData
        .business_columns
        .sales;


    if (
        window.categoryChartInstance
    ) {

        window.categoryChartInstance.destroy();

    }


    window.categoryChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels:
                        data.map(
                            item =>
                                item[
                                    categoryColumn
                                ]
                        ),

                    datasets: [

                        {

                            data:
                                data.map(
                                    item =>
                                        item[
                                            salesColumn
                                        ]
                                )

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    }

                }

            }
        );

}


// ==========================================================
// REFRESH
// ==========================================================

async function refreshDashboard() {

    if (!dashboardFilename) {

        return;

    }


    await generateDashboard();

}


// ==========================================================
// FORMATTERS
// ==========================================================

function formatCurrency(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "N/A";

    }


    return "₹ " +
        Number(
            value
        ).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );

}


function formatNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "N/A";

    }


    return Number(
        value
    ).toLocaleString(
        "en-IN"
    );

}


function formatPercent(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "N/A";

    }


    return Number(
        value
    ).toFixed(1)
        + "%";

}


// ==========================================================
// DATAVISION BI
// FIXED INTERACTIVE DASHBOARD FILTER ENGINE
// ==========================================================

let dashboardFilterOptions = {};
let activeDashboardFilters = {};


// ==========================================================
// LOAD DASHBOARD FILTER OPTIONS
// ==========================================================

async function loadDashboardFilters() {

    if (!dashboardFilename) {
        console.warn("No dashboard filename found.");
        return;
    }

    const formData = new FormData();

    formData.append(
        "filename",
        dashboardFilename
    );

    try {

        const response = await fetch(
            "/dashboard/filter-options",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {

            throw new Error(
                "Server returned " + response.status
            );

        }

        const result = await response.json();

        if (!result.success) {

            console.error(
                "Filter options error:",
                result.message
            );

            return;
        }

        dashboardFilterOptions =
            result.options || {};

        // Populate dropdowns
        populateFilter(
            "filterProduct",
            dashboardFilterOptions.product || [],
            "All Products"
        );

        populateFilter(
            "filterCategory",
            dashboardFilterOptions.category || [],
            "All Categories"
        );

        populateFilter(
            "filterState",
            dashboardFilterOptions.state || [],
            "All States"
        );

        populateFilter(
            "filterCity",
            dashboardFilterOptions.city || [],
            "All Cities"
        );

        populateFilter(
            "filterOrderType",
            dashboardFilterOptions.order_type || [],
            "All Order Types"
        );

        populateFilter(
            "filterCustomer",
            dashboardFilterOptions.customer || [],
            "All Customers"
        );


        // Date filters
        const dateFrom =
            document.getElementById(
                "filterDateFrom"
            );

        const dateTo =
            document.getElementById(
                "filterDateTo"
            );


        if (
            dateFrom &&
            dashboardFilterOptions.date_min
        ) {

            dateFrom.min =
                dashboardFilterOptions.date_min;

        }


        if (
            dateTo &&
            dashboardFilterOptions.date_max
        ) {

            dateTo.max =
                dashboardFilterOptions.date_max;

        }


        console.log(
            "Dashboard filters loaded."
        );

    }
    catch (error) {

        console.error(
            "Filter options failed:",
            error
        );

        showMessage(
            "Unable to load dashboard filters: " +
            error.message,
            "error"
        );

    }

}


// ==========================================================
// POPULATE FILTER DROPDOWN
// ==========================================================

function populateFilter(
    elementId,
    values,
    defaultText
) {

    const select =
        document.getElementById(
            elementId
        );

    if (!select) {
        return;
    }


    // Save current value
    const oldValue =
        select.value;


    select.innerHTML = "";


    // Default option
    const defaultOption =
        document.createElement(
            "option"
        );

    defaultOption.value = "";

    defaultOption.textContent =
        defaultText;

    select.appendChild(
        defaultOption
    );


    // Make sure values is array
    if (!Array.isArray(values)) {
        values = [];
    }


    values.forEach(
        function(value) {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(value);

            option.textContent =
                String(value);

            select.appendChild(
                option
            );

        }
    );


    // Restore previous value
    if (
        oldValue &&
        values.includes(oldValue)
    ) {

        select.value =
            oldValue;

    }

}


// ==========================================================
// GET FILTER ELEMENT
// ==========================================================

function getFilterValue(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();

}


// ==========================================================
// GET ALL CURRENT FILTERS
// ==========================================================

function getDashboardFilters() {

    const filters = {};


    // -------------------------------
    // DATE FROM
    // -------------------------------

    const dateFrom =
        getFilterValue(
            "filterDateFrom"
        );

    if (dateFrom) {

        filters.date_from =
            dateFrom;

    }


    // -------------------------------
    // DATE TO
    // -------------------------------

    const dateTo =
        getFilterValue(
            "filterDateTo"
        );

    if (dateTo) {

        filters.date_to =
            dateTo;

    }


    // -------------------------------
    // PRODUCT
    // -------------------------------

    const product =
        getFilterValue(
            "filterProduct"
        );

    if (product) {

        filters.product =
            [product];

    }


    // -------------------------------
    // CATEGORY
    // -------------------------------

    const category =
        getFilterValue(
            "filterCategory"
        );

    if (category) {

        filters.category =
            [category];

    }


    // -------------------------------
    // STATE
    // -------------------------------

    const state =
        getFilterValue(
            "filterState"
        );

    if (state) {

        filters.state =
            [state];

    }


    // -------------------------------
    // CITY
    // -------------------------------

    const city =
        getFilterValue(
            "filterCity"
        );

    if (city) {

        filters.city =
            [city];

    }


    // -------------------------------
    // ORDER TYPE
    // -------------------------------

    const orderType =
        getFilterValue(
            "filterOrderType"
        );

    if (orderType) {

        filters.order_type =
            [orderType];

    }


    // -------------------------------
    // CUSTOMER
    // -------------------------------

    const customer =
        getFilterValue(
            "filterCustomer"
        );

    if (customer) {

        filters.customer =
            [customer];

    }


    return filters;

}


// ==========================================================
// APPLY DASHBOARD FILTERS
// ==========================================================

async function applyDashboardFilters() {

    if (!dashboardFilename) {

        showMessage(
            "Please upload a file first.",
            "error"
        );

        return;

    }


    const filters =
        getDashboardFilters();


    // Save globally
    activeDashboardFilters =
        filters;


    console.log(
        "Applying filters:",
        filters
    );


    const requestData = {

        filename:
            dashboardFilename,

        filters:
            filters,

        // Also send filters at root level
        // for compatibility with backend
        ...filters

    };


    try {

        showDashboardLoading();


        const response =
            await fetch(
                "/dashboard/filter",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            requestData
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Filter operation failed."
            );

        }


        // Replace dashboard data
        dashboardData =
            result.dashboard;


        // Render everything again
        renderDashboard(
            dashboardData
        );


        // Update filter status
        updateActiveFilterText(
            filters
        );


        hideDashboardLoading();


        console.log(
            "Dashboard successfully filtered."
        );


    }
    catch (error) {

        hideDashboardLoading();


        console.error(
            "Dashboard Filter Error:",
            error
        );


        showMessage(
            "Filter failed: " +
            error.message,
            "error"
        );

    }

}


// ==========================================================
// DASHBOARD LOADING INDICATOR
// ==========================================================

function showDashboardLoading() {

    const section =
        document.getElementById(
            "dashboardSection"
        );

    if (!section) {
        return;
    }


    section.classList.add(
        "dashboard-loading"
    );

}


function hideDashboardLoading() {

    const section =
        document.getElementById(
            "dashboardSection"
        );

    if (!section) {
        return;
    }


    section.classList.remove(
        "dashboard-loading"
    );

}


// ==========================================================
// RESET DASHBOARD FILTERS
// ==========================================================

async function resetDashboardFilters() {

    console.log(
        "Resetting dashboard filters..."
    );


    // Clear date
    const dateFrom =
        document.getElementById(
            "filterDateFrom"
        );

    const dateTo =
        document.getElementById(
            "filterDateTo"
        );


    if (dateFrom) {
        dateFrom.value = "";
    }


    if (dateTo) {
        dateTo.value = "";
    }


    // Clear select filters
    const filterIds = [

        "filterProduct",
        "filterCategory",
        "filterState",
        "filterCity",
        "filterOrderType",
        "filterCustomer"

    ];


    filterIds.forEach(
        function(id) {

            const element =
                document.getElementById(id);

            if (element) {

                element.value = "";

            }

        }
    );


    // Clear global state
    activeDashboardFilters = {};


    updateActiveFilterText({});


    // Rebuild original dashboard
    await generateDashboard();


    console.log(
        "Dashboard filters reset."
    );

}


// ==========================================================
// ACTIVE FILTER STATUS
// ==========================================================

function updateActiveFilterText(
    filters
) {

    const title =
        document.querySelector(
            ".filter-header span"
        );


    if (!title) {
        return;
    }


    let count = 0;


    Object.keys(
        filters || {}
    ).forEach(
        function(key) {

            const value =
                filters[key];


            if (
                Array.isArray(value)
            ) {

                if (
                    value.length > 0
                ) {

                    count++;

                }

            }
            else if (value) {

                count++;

            }

        }
    );


    if (count === 0) {

        title.textContent =
            "Filters automatically update the dashboard";

    }
    else {

        title.textContent =
            count +
            " active filter(s)";

    }

}


// ==========================================================
// INITIALIZE FILTER EVENTS
// ==========================================================

function initializeDashboardFilters() {

    const filterIds = [

        "filterDateFrom",
        "filterDateTo",
        "filterProduct",
        "filterCategory",
        "filterState",
        "filterCity",
        "filterOrderType",
        "filterCustomer"

    ];


    filterIds.forEach(
        function(id) {

            const element =
                document.getElementById(id);


            if (!element) {
                return;
            }


            // Remove old event
            element.removeEventListener(
                "change",
                applyDashboardFilters
            );


            // Add new event
            element.addEventListener(
                "change",
                applyDashboardFilters
            );

        }
    );


    console.log(
        "Dashboard filter events initialized."
    );

}


// ==========================================================
// ENHANCED CREATE DASHBOARD
// ==========================================================

async function createDashboard() {

    const fileElement =
        document.getElementById(
            "fileName"
        );


    if (!fileElement) {

        showMessage(
            "Please upload a file first.",
            "error"
        );

        return;

    }


    dashboardFilename =
        fileElement.innerText.trim();


    if (
        !dashboardFilename ||
        dashboardFilename === "File"
    ) {

        showMessage(
            "Please upload a file first.",
            "error"
        );

        return;

    }


    const dashboardSection =
        document.getElementById(
            "dashboardSection"
        );


    if (!dashboardSection) {

        showMessage(
            "Dashboard section not found.",
            "error"
        );

        return;

    }


    dashboardSection.classList.remove(
        "hidden"
    );


    dashboardSection.scrollIntoView({
        behavior: "smooth"
    });


    try {

        // Load filter values first
        await loadDashboardFilters();


        // Initialize events
        initializeDashboardFilters();


        // Build dashboard
        await generateDashboard();


    }
    catch (error) {

        console.error(
            "Dashboard creation error:",
            error
        );

        showMessage(
            "Dashboard creation failed: " +
            error.message,
            "error"
        );

    }

}


// ==========================================================
// ENHANCED GENERATE DASHBOARD
// ==========================================================

async function generateDashboard() {

    if (!dashboardFilename) {

        console.warn(
            "No dashboard filename."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "filename",
        dashboardFilename
    );


    try {

        showDashboardLoading();


        const response =
            await fetch(
                "/dashboard/build",
                {

                    method:
                        "POST",

                    body:
                        formData

                }
            );


        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Dashboard build failed."
            );

        }


        dashboardData =
            result.dashboard;


        renderDashboard(
            dashboardData
        );


        hideDashboardLoading();


        console.log(
            "Dashboard generated successfully."
        );

    }
    catch (error) {

        hideDashboardLoading();


        console.error(
            "Dashboard generation error:",
            error
        );


        showMessage(
            "Dashboard generation failed: " +
            error.message,
            "error"
        );

    }

}


// ==========================================================
// REFRESH DASHBOARD
// ==========================================================

async function refreshDashboard() {

    if (!dashboardFilename) {

        showMessage(
            "Please upload a file first.",
            "error"
        );

        return;

    }


    // First rebuild base dashboard
    await generateDashboard();


    // Then reload filter options
    await loadDashboardFilters();


    // Re-initialize events
    initializeDashboardFilters();


    // Reset active filters
    activeDashboardFilters = {};


    updateActiveFilterText({});

}


function renderDashboard(data) {

    renderDashboardKPIs(
        data.kpis
    );

    renderDataModel(
        data
    );

    renderSalesTrend(
        data.monthly_trend || []
    );

    renderProductChart(
        data.products || []
    );

    renderCategoryChart(
        data.categories || []
    );

    renderProfitTrend(
        data.monthly_trend || []
    );

    renderOrderTypeChart(
        data.order_types || []
    );

    renderStateChart(
        data.states || []
    );

    renderCustomerChart(
        data.customers || []
    );

    generateDashboardInsights(
        data
    );

}

// ==========================================================
// DATE VALIDATION
// ==========================================================

function validateDashboardDates() {

    const dateFrom =
        getFilterValue(
            "filterDateFrom"
        );

    const dateTo =
        getFilterValue(
            "filterDateTo"
        );


    if (
        dateFrom &&
        dateTo &&
        dateFrom > dateTo
    ) {

        showMessage(
            "From Date cannot be greater than To Date.",
            "error"
        );

        return false;

    }


    return true;

}


// ==========================================================
// REPLACE FILTER FUNCTION
// ==========================================================

const originalApplyDashboardFilters =
    applyDashboardFilters;


// Override with validation
applyDashboardFilters = async function() {

    if (
        !validateDashboardDates()
    ) {

        return;

    }


    await originalApplyDashboardFilters();

};


// ==========================================================
// START FILTER ENGINE
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeDashboardFilters();

        console.log(
            "DATAVISION BI Filter Engine Ready."
        );

    }
);// ==========================================================
// PROFIT TREND
// ==========================================================

function renderProfitTrend(data) {

    const canvas =
        document.getElementById(
            "profitTrendChart"
        );

    if (!canvas || !data.length) {
        return;
    }

    if (profitTrendChartInstance) {

        profitTrendChartInstance.destroy();

    }

    const salesColumn =
        dashboardData.business_columns.sales;

    const costColumn =
        dashboardData.business_columns.cost;

    const labels =
        data.map(
            item => item.Year_Month
        );

    const sales =
        data.map(
            item =>
                Number(
                    item[salesColumn] || 0
                )
        );

    const costs =
        data.map(
            item =>
                Number(
                    item[costColumn] || 0
                )
        );

    const profit =
        sales.map(
            (value, index) =>
                value - costs[index]
        );

    profitTrendChartInstance =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: "Sales",
                            data: sales,
                            tension: 0.3
                        },

                        {
                            label: "Profit",
                            data: profit,
                            tension: 0.3
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },

                    plugins: {

                        legend: {
                            display: true
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            context.dataset.label
                                            + ": "
                                            + formatCurrency(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}// ==========================================================
// ORDER TYPE CHART
// ==========================================================

function renderOrderTypeChart(data) {

    const canvas =
        document.getElementById(
            "orderTypeChart"
        );

    if (!canvas || !data.length) {
        return;
    }

    if (orderTypeChartInstance) {

        orderTypeChartInstance.destroy();

    }

    const column =
        dashboardData.business_columns.order_type;

    const salesColumn =
        dashboardData.business_columns.sales;

    orderTypeChartInstance =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels:
                        data.map(
                            item =>
                                item[column]
                        ),

                    datasets: [

                        {

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item[salesColumn] || 0
                                        )
                                )

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            context.label
                                            + ": "
                                            + formatCurrency(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}// ==========================================================
// STATE PERFORMANCE
// ==========================================================

function renderStateChart(data) {

    const canvas =
        document.getElementById(
            "stateChart"
        );

    if (!canvas || !data.length) {
        return;
    }

    if (stateChartInstance) {

        stateChartInstance.destroy();

    }

    const stateColumn =
        dashboardData.business_columns.state;

    const salesColumn =
        dashboardData.business_columns.sales;

    stateChartInstance =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        data.map(
                            item =>
                                item[stateColumn]
                        ),

                    datasets: [

                        {

                            label: "Sales",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item[salesColumn] || 0
                                        )
                                )

                        }

                    ]

                },

                options: {

                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );

}// ==========================================================
// CUSTOMER PERFORMANCE
// ==========================================================

function renderCustomerChart(data) {

    const canvas =
        document.getElementById(
            "customerChart"
        );

    if (!canvas || !data.length) {
        return;
    }

    if (customerChartInstance) {

        customerChartInstance.destroy();

    }

    const customerColumn =
        dashboardData.business_columns.customer;

    const salesColumn =
        dashboardData.business_columns.sales;

    customerChartInstance =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        data.map(
                            item =>
                                item[customerColumn]
                        ),

                    datasets: [

                        {

                            label:
                                "Revenue",

                            data:
                                data.map(
                                    item =>
                                        Number(
                                            item[salesColumn] || 0
                                        )
                                )

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }

        );

}// ==========================================================
// AUTOMATIC BUSINESS INSIGHTS
// ==========================================================

function generateDashboardInsights(data) {

    const container =
        document.getElementById(
            "dashboardInsights"
        );

    if (!container) {
        return;
    }

    const insights = [];

    // -----------------------------------------
    // PRODUCT
    // -----------------------------------------

    if (
        data.products &&
        data.products.length > 0
    ) {

        const salesColumn =
            data.business_columns.sales;

        const productColumn =
            data.business_columns.product;

        const sortedProducts =
            [...data.products]
                .sort(
                    (a, b) =>
                        Number(
                            b[salesColumn] || 0
                        )
                        -
                        Number(
                            a[salesColumn] || 0
                        )
                );

        const best =
            sortedProducts[0];

        insights.push({

            icon: "🏆",

            title: "Best Product",

            text:
                `${best[productColumn]} is the highest-selling product with ${formatCurrency(best[salesColumn])} revenue.`

        });

    }


    // -----------------------------------------
    // CATEGORY
    // -----------------------------------------

    if (
        data.categories &&
        data.categories.length > 0
    ) {

        const salesColumn =
            data.business_columns.sales;

        const categoryColumn =
            data.business_columns.category;

        const sorted =
            [...data.categories]
                .sort(
                    (a, b) =>
                        Number(
                            b[salesColumn] || 0
                        )
                        -
                        Number(
                            a[salesColumn] || 0
                        )
                );

        const best =
            sorted[0];

        insights.push({

            icon: "📦",

            title: "Best Category",

            text:
                `${best[categoryColumn]} generated the highest revenue.`

        });

    }


    // -----------------------------------------
    // PROFIT
    // -----------------------------------------

    if (data.kpis) {

        insights.push({

            icon: "💰",

            title: "Profitability",

            text:
                `Gross profit is ${formatCurrency(data.kpis.profit)} with a profit margin of ${formatPercent(data.kpis.profit_margin)}.`

        });

    }


    // -----------------------------------------
    // ORDERS
    // -----------------------------------------

    if (data.kpis) {

        insights.push({

            icon: "🧾",

            title: "Order Performance",

            text:
                `${formatNumber(data.kpis.total_orders)} orders generated an average order value of ${formatCurrency(data.kpis.average_order_value)}.`

        });

    }


    container.innerHTML = "";

    insights.forEach(
        function(insight) {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "analysis-card";

            card.innerHTML = `

                <h3>
                    ${insight.icon}
                    ${insight.title}
                </h3>

                <p>
                    ${insight.text}
                </p>

            `;

            container.appendChild(
                card
            );

        }
    );

}// ==========================================================
// DATAVISION BI
// PHASE 5 - POWER QUERY JAVASCRIPT ENGINE
// ==========================================================

let queryFilename = "";


// ==========================================================
// OPEN QUERY EDITOR
// ==========================================================

async function openQueryEditor() {

    const fileElement =
        document.getElementById("fileName");


    if (!fileElement) {

        alert("Please upload a file first.");

        return;
    }


    queryFilename =
        fileElement.innerText.trim();


    if (
        !queryFilename ||
        queryFilename === "File"
    ) {

        alert("Please upload a file first.");

        return;
    }


    const querySection =
        document.getElementById("querySection");


    if (!querySection) {

        alert(
            "Query Editor section was not found."
        );

        return;
    }


    querySection.classList.remove("hidden");


    querySection.scrollIntoView({
        behavior: "smooth"
    });


    await startQuery();

}


// ==========================================================
// START QUERY
// ==========================================================

async function startQuery() {

    if (!queryFilename) {

        const fileElement =
            document.getElementById("fileName");


        if (!fileElement) {

            alert("Please upload a file first.");

            return;
        }


        queryFilename =
            fileElement.innerText.trim();
    }


    if (
        !queryFilename ||
        queryFilename === "File"
    ) {

        alert("Please upload a file first.");

        return;
    }


    try {

        const response =
            await fetch(
                "/query/start",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        updateQueryColumns(
            result.columns
        );


        displayQueryTable(
            result.preview
        );


        displayQuerySteps(
            result.steps
        );


    }
    catch (error) {

        console.error(
            "Query Start Error:",
            error
        );


        alert(
            "Unable to start Query Editor: "
            + error.message
        );

    }

}


// ==========================================================
// REFRESH QUERY PREVIEW
// ==========================================================

async function refreshQueryPreview() {

    if (!queryFilename) {

        alert("Please load a file first.");

        return;
    }


    try {

        const response =
            await fetch(
                "/query/preview",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        updateQueryColumns(
            result.columns
        );


        displayQueryTable(
            result.preview
        );


        displayQuerySteps(
            result.steps
        );


    }
    catch (error) {

        console.error(error);


        alert(
            "Preview failed: "
            + error.message
        );

    }

}


// ==========================================================
// REMOVE EMPTY ROWS
// ==========================================================

async function queryRemoveEmptyRows() {

    if (!queryFilename) {

        alert("Please load a file first.");

        return;
    }


    try {

        const response =
            await fetch(
                "/query/remove-empty",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        displayQueryTable(
            result.preview
        );


        displayQuerySteps(
            result.steps
        );


        updateQueryColumns(
            result.columns ||
            getColumnsFromPreview(
                result.preview
            )
        );


    }
    catch (error) {

        console.error(error);


        alert(
            "Remove empty rows failed: "
            + error.message
        );

    }

}


// ==========================================================
// REMOVE DUPLICATES
// ==========================================================

async function queryRemoveDuplicates() {

    if (!queryFilename) {

        alert("Please load a file first.");

        return;
    }


    try {

        const response =
            await fetch(
                "/query/remove-duplicates",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        displayQueryTable(
            result.preview
        );


        displayQuerySteps(
            result.steps
        );


        updateQueryColumns(
            result.columns ||
            getColumnsFromPreview(
                result.preview
            )
        );


    }
    catch (error) {

        console.error(error);


        alert(
            "Remove duplicates failed: "
            + error.message
        );

    }

}


// ==========================================================
// OPEN REMOVE COLUMNS
// ==========================================================

function openRemoveColumns() {

    if (!queryFilename) {

        alert("Please load a file first.");

        return;
    }


    const list =
        document.getElementById(
            "removeColumnsList"
        );


    if (!list) {

        return;
    }


    list.innerHTML = "";


    const columns =
        document.querySelectorAll(
            "#queryColumns .query-column"
        );


    columns.forEach(
        function(columnElement) {

            const column =
                columnElement.dataset.column;


            const label =
                document.createElement(
                    "label"
                );


            label.className =
                "remove-column-item";


            label.innerHTML = `

                <input
                    type="checkbox"
                    value="${escapeHtml(column)}"
                >

                <span>
                    ${escapeHtml(column)}
                </span>

            `;


            list.appendChild(label);

        }
    );


    const modal =
        document.getElementById(
            "removeColumnsModal"
        );


    if (modal) {

        modal.classList.remove("hidden");

    }

}


// ==========================================================
// CLOSE REMOVE COLUMNS
// ==========================================================

function closeRemoveColumns() {

    const modal =
        document.getElementById(
            "removeColumnsModal"
        );


    if (modal) {

        modal.classList.add("hidden");

    }

}


// ==========================================================
// CONFIRM REMOVE COLUMNS
// ==========================================================

async function confirmRemoveColumns() {

    const checked =
        document.querySelectorAll(
            "#removeColumnsList input:checked"
        );


    const columns =
        Array.from(checked)
        .map(
            function(input) {
                return input.value;
            }
        );


    if (columns.length === 0) {

        alert(
            "Please select at least one column."
        );

        return;
    }


    try {

        const response =
            await fetch(
                "/query/remove-columns",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename,

                        columns:
                            columns

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        closeRemoveColumns();


        displayQueryTable(
            result.preview
        );


        updateQueryColumns(
            result.columns
        );


        displayQuerySteps(
            result.steps
        );


    }
    catch (error) {

        console.error(error);


        alert(
            "Remove columns failed: "
            + error.message
        );

    }

}


// ==========================================================
// OPEN RENAME COLUMN
// ==========================================================

function openRenameColumn() {

    if (!queryFilename) {

        alert("Please load a file first.");

        return;
    }


    const select =
        document.getElementById(
            "renameColumnSelect"
        );


    if (!select) {

        return;
    }


    select.innerHTML = `

        <option value="">
            Select Column
        </option>

    `;


    const columnElements =
        document.querySelectorAll(
            "#queryColumns .query-column"
        );


    columnElements.forEach(
        function(element) {

            const column =
                element.dataset.column;


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                column;


            option.textContent =
                column;


            select.appendChild(
                option
            );

        }
    );


    document.getElementById(
        "newColumnName"
    ).value = "";


    const modal =
        document.getElementById(
            "renameColumnModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ==========================================================
// CLOSE RENAME
// ==========================================================

function closeRenameColumn() {

    const modal =
        document.getElementById(
            "renameColumnModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ==========================================================
// CONFIRM RENAME
// ==========================================================

async function confirmRenameColumn() {

    const oldName =
        document.getElementById(
            "renameColumnSelect"
        ).value;


    const newName =
        document.getElementById(
            "newColumnName"
        ).value.trim();


    if (!oldName) {

        alert("Please select a column.");

        return;
    }


    if (!newName) {

        alert(
            "Please enter a new column name."
        );

        return;
    }


    try {

        const response =
            await fetch(
                "/query/rename",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename,

                        old_name:
                            oldName,

                        new_name:
                            newName

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        closeRenameColumn();


        displayQueryTable(
            result.preview
        );


        updateQueryColumns(
            result.columns
        );


        displayQuerySteps(
            result.steps
        );


    }
    catch (error) {

        console.error(error);


        alert(
            "Rename failed: "
            + error.message
        );

    }

}


// ==========================================================
// RESET QUERY
// ==========================================================

async function resetQuery() {

    if (!queryFilename) {

        return;
    }


    const confirmReset =
        confirm(
            "Reset all query transformations?"
        );


    if (!confirmReset) {

        return;
    }


    try {

        const response =
            await fetch(
                "/query/reset",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        filename:
                            queryFilename

                    })

                }
            );


        const result =
            await response.json();


        if (!result.success) {

            alert(result.message);

            return;
        }


        displayQueryTable(
            result.preview
        );


        updateQueryColumns(
            result.columns
        );


        displayQuerySteps(
            result.steps
        );


    }
    catch (error) {

        console.error(error);


        alert(
            "Reset failed: "
            + error.message
        );

    }

}


// ==========================================================
// DISPLAY QUERY COLUMNS
// ==========================================================

function updateQueryColumns(columns) {

    const container =
        document.getElementById(
            "queryColumns"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        !columns ||
        columns.length === 0
    ) {

        container.innerHTML = `

            <span>
                No columns
            </span>

        `;

        return;
    }


    columns.forEach(
        function(column) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "query-column";


            element.dataset.column =
                column;


            element.innerHTML = `

                <span>
                    ▦
                </span>

                <strong>
                    ${escapeHtml(column)}
                </strong>

            `;


            container.appendChild(
                element
            );

        }
    );

}


// ==========================================================
// DISPLAY QUERY TABLE
// ==========================================================

function displayQueryTable(data) {

    const container =
        document.getElementById(
            "queryTable"
        );


    const rowCount =
        document.getElementById(
            "queryRowCount"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        !data ||
        data.length === 0
    ) {

        container.innerHTML = `

            <div class="query-empty">

                <div>
                    📭
                </div>

                <h3>
                    No records found
                </h3>

                <p>
                    The current query returned
                    no rows.
                </p>

            </div>

        `;


        if (rowCount) {

            rowCount.innerText =
                "0 rows";

        }

        return;
    }


    if (rowCount) {

        rowCount.innerText =
            `${data.length} preview rows`;

    }


    const table =
        document.createElement(
            "table"
        );


    table.className =
        "query-preview-table";


    const thead =
        document.createElement(
            "thead"
        );


    const tbody =
        document.createElement(
            "tbody"
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    Object.keys(
        data[0]
    ).forEach(
        function(column) {

            const th =
                document.createElement(
                    "th"
                );


            th.textContent =
                column;


            headerRow.appendChild(
                th
            );

        }
    );


    thead.appendChild(
        headerRow
    );


    data.forEach(
        function(row) {

            const tr =
                document.createElement(
                    "tr"
                );


            Object.values(
                row
            ).forEach(
                function(value) {

                    const td =
                        document.createElement(
                            "td"
                        );


                    td.textContent =
                        value === null ||
                        value === undefined
                            ? ""
                            : value;


                    tr.appendChild(
                        td
                    );

                }
            );


            tbody.appendChild(
                tr
            );

        }
    );


    table.appendChild(
        thead
    );


    table.appendChild(
        tbody
    );


    container.appendChild(
        table
    );

}


// ==========================================================
// DISPLAY APPLIED STEPS
// ==========================================================

function displayQuerySteps(steps) {

    const container =
        document.getElementById(
            "querySteps"
        );


    const count =
        document.getElementById(
            "queryStepCount"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    const sourceStep =
        document.createElement(
            "div"
        );


    sourceStep.className =
        "query-step active";


    sourceStep.innerHTML = `

        <span>
            1
        </span>

        <strong>
            Source
        </strong>

    `;


    container.appendChild(
        sourceStep
    );


    if (
        steps &&
        steps.length > 0
    ) {

        steps.forEach(
            function(step, index) {

                const element =
                    document.createElement(
                        "div"
                    );


                element.className =
                    "query-step";


                element.innerHTML = `

                    <span>
                        ${index + 2}
                    </span>

                    <strong>
                        ${escapeHtml(step)}
                    </strong>

                `;


                container.appendChild(
                    element
                );

            }
        );

    }


    if (count) {

        const total =
            (steps ? steps.length : 0)
            + 1;


        count.innerText =
            `${total} step${total === 1 ? "" : "s"}`;

    }

}


// ==========================================================
// GET COLUMNS FROM PREVIEW
// ==========================================================

function getColumnsFromPreview(data) {

    if (
        !data ||
        data.length === 0
    ) {

        return [];

    }


    return Object.keys(
        data[0]
    );

}


// ==========================================================
// HTML ESCAPE
// ==========================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}