// static/js/modules/upload.js

const UploadModule = (function() {
    
    let currentFilename = "";
    
    function init() {
        const fileInput = document.getElementById("fileInput");
        const dropZone = document.getElementById("dropZone");
        
        if (!fileInput || !dropZone) return;
        
        fileInput.addEventListener("change", function() {
            if (this.files.length > 0) uploadFile(this.files[0]);
        });
        
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragging");
        });
        
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("dragging");
        });
        
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragging");
            if (e.dataTransfer.files.length > 0) {
                uploadFile(e.dataTransfer.files[0]);
            }
        });
    }
    
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);
        
        UI.showLoading();
        
        try {
            const data = await API.postForm("/upload", formData);
            UI.hideLoading();
            
            if (!data.success) {
                UI.showMessage(data.message, "error");
                return;
            }
            
            currentFilename = data.filename;
            UI.showMessage(data.message, "success");
            
            displayProfile(data);
            displayPreview(data.preview);
            
        } catch (error) {
            UI.hideLoading();
            UI.showMessage("Upload failed: " + error.message, "error");
        }
    }
    
    function displayProfile(data) {
        const section = document.getElementById("profileSection");
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
        const container = document.getElementById(elementId);
        if (!container) return;
        
        container.innerHTML = "";
        
        if (!items || items.length === 0) {
            container.innerHTML = "<span>None detected</span>";
            return;
        }
        
        items.forEach(item => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.innerText = item;
            container.appendChild(tag);
        });
    }
    
    function displayPreview(data) {
        const container = document.getElementById("tableContainer");
        if (!container || !data || data.length === 0) return;
        
        container.innerHTML = "";
        
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        const headerRow = document.createElement("tr");
        
        Object.keys(data[0]).forEach(col => {
            const th = document.createElement("th");
            th.innerText = col;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        
        data.forEach(row => {
            const tr = document.createElement("tr");
            Object.values(row).forEach(val => {
                const td = document.createElement("td");
                td.innerText = val;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }
    
    function getFilename() {
        return currentFilename;
    }
    
    return {
        init,
        getFilename
    };
    
})();