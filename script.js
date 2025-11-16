// Obtener elementos del DOM
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const srcLangSpan = document.getElementById('srcLang');
const totalSegmentsSpan = document.getElementById('totalSegments');
const searchSection = document.getElementById('searchSection');
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const tableBody = document.getElementById('tableBody');
const errorMessage = document.getElementById('errorMessage');
const saveButton = document.getElementById('saveButton');
const undoButton = document.getElementById('undoButton');
const modifiedCount = document.getElementById('modifiedCount');
const modifiedNumber = document.getElementById('modifiedNumber');

// Variables globales
let translationsData = [];
let originalTranslationsData = [];
let originalXmlDoc = null;
let srcLangGlobal = '';
let modifiedSegments = new Set();

// Escuchar cuando el usuario selecciona un archivo
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (!file || !file.name.endsWith('.tmx')) {
        showError('Por favor selecciona un archivo TMX válido');
        return;
    }
    
    readTMXFile(file);
});

// Función para leer el archivo TMX
function readTMXFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        parseTMX(content);
    };
    
    reader.onerror = function() {
        showError('Error al leer el archivo');
    };
    
    reader.readAsText(file);
}

// Función para parsear el archivo TMX
function parseTMX(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            showError('El archivo TMX no es válido o está corrupto');
            return;
        }
        
        originalXmlDoc = xmlDoc;
        
        const header = xmlDoc.querySelector('header');
        const srcLang = header ? header.getAttribute('srclang') : 'desconocido';
        srcLangGlobal = srcLang;
        
        const translationUnits = xmlDoc.querySelectorAll('tu');
        
        translationsData = [];
        modifiedSegments.clear();
        
        translationUnits.forEach((tu, index) => {
            const tuvs = tu.querySelectorAll('tuv');
            
            const unit = {
                id: index + 1,
                segments: {}
            };
            
            tuvs.forEach(tuv => {
                const lang = tuv.getAttribute('xml:lang');
                const seg = tuv.querySelector('seg');
                const text = seg ? seg.textContent.trim() : '';
                
                unit.segments[lang] = text;
            });
            
            translationsData.push(unit);
        });
        
        // Guardar una copia de los datos originales
        originalTranslationsData = JSON.parse(JSON.stringify(translationsData));
        
        displayFileInfo(srcLang, translationsData.length);
        displayTranslations(translationsData);
        updateModifiedCount();
        
        hideError();
        
    } catch (error) {
        showError('Error al procesar el archivo TMX: ' + error.message);
    }
}

// Función para mostrar la información del archivo
function displayFileInfo(srcLang, totalSegments) {
    srcLangSpan.textContent = srcLang;
    totalSegmentsSpan.textContent = totalSegments;
    fileInfo.classList.remove('hidden');
    searchSection.classList.remove('hidden');
}

// Función para mostrar las traducciones en la tabla
function displayTranslations(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No se encontraron segmentos</td></tr>';
        resultsSection.classList.remove('hidden');
        return;
    }
    
    data.forEach(unit => {
        const row = document.createElement('tr');
        
        const languages = Object.keys(unit.segments);
        const firstLang = languages[0] || '';
        const secondLang = languages[1] || '';
        
        const cell1Content = unit.segments[firstLang] || '-';
        const cell2Content = unit.segments[secondLang] || '-';
        
        row.innerHTML = `
            <td>${unit.id}</td>
            <td>
                <strong>${firstLang}:</strong><br>
                <div class="editable-cell ${modifiedSegments.has(`${unit.id}-${firstLang}`) ? 'modified' : ''}" 
                     contenteditable="true" 
                     data-id="${unit.id}" 
                     data-lang="${firstLang}">${cell1Content}</div>
            </td>
            <td>
                <strong>${secondLang}:</strong><br>
                <div class="editable-cell ${modifiedSegments.has(`${unit.id}-${secondLang}`) ? 'modified' : ''}" 
                     contenteditable="true" 
                     data-id="${unit.id}" 
                     data-lang="${secondLang}">${cell2Content}</div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Añadir eventos a las celdas editables
    document.querySelectorAll('.editable-cell').forEach(cell => {
        cell.addEventListener('input', handleCellEdit);
    });
    
    resultsSection.classList.remove('hidden');
}

// Manejar la edición de celdas
function handleCellEdit(event) {
    const cell = event.target;
    const id = parseInt(cell.dataset.id);
    const lang = cell.dataset.lang;
    const newText = cell.textContent.trim();
    
    // Actualizar los datos
    const unit = translationsData.find(u => u.id === id);
    if (unit) {
        unit.segments[lang] = newText;
        
        // Marcar como modificado
        const key = `${id}-${lang}`;
        modifiedSegments.add(key);
        cell.classList.add('modified');
        
        updateModifiedCount();
    }
}

// Actualizar el contador de segmentos modificados
function updateModifiedCount() {
    if (modifiedSegments.size > 0) {
        modifiedNumber.textContent = modifiedSegments.size;
        modifiedCount.classList.remove('hidden');
        saveButton.disabled = false;
        undoButton.disabled = false;
    } else {
        modifiedCount.classList.add('hidden');
        saveButton.disabled = true;
        undoButton.disabled = true;
    }
}

// Función de búsqueda
searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        displayTranslations(translationsData);
        return;
    }
    
    const filtered = translationsData.filter(unit => {
        return Object.values(unit.segments).some(text => 
            text.toLowerCase().includes(searchTerm)
        );
    });
    
    displayTranslations(filtered);
});

// Botón de deshacer cambios
undoButton.addEventListener('click', function() {
    if (!originalTranslationsData.length) return;
    
    // Restaurar datos originales
    translationsData = JSON.parse(JSON.stringify(originalTranslationsData));
    
    // Limpiar modificaciones
    modifiedSegments.clear();
    updateModifiedCount();
    
    // Volver a mostrar la tabla
    displayTranslations(translationsData);
});

// Botón de guardar
saveButton.addEventListener('click', function() {
    if (!originalXmlDoc) return;
    
    // Actualizar el XML con los datos modificados
    const translationUnits = originalXmlDoc.querySelectorAll('tu');
    
    translationUnits.forEach((tu, index) => {
        const unit = translationsData[index];
        if (!unit) return;
        
        const tuvs = tu.querySelectorAll('tuv');
        tuvs.forEach(tuv => {
            const lang = tuv.getAttribute('xml:lang');
            const seg = tuv.querySelector('seg');
            
            if (seg && unit.segments[lang] !== undefined) {
                seg.textContent = unit.segments[lang];
            }
        });
    });
    
    // Convertir el XML a string
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(originalXmlDoc);
    
    // Crear y descargar el archivo
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'traduccion_editada.tmx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Limpiar el conjunto de modificados después de guardar
    modifiedSegments.clear();
    updateModifiedCount();
    
    // Quitar el resaltado amarillo
    document.querySelectorAll('.editable-cell').forEach(cell => {
        cell.classList.remove('modified');
    });
});

// Funciones auxiliares para mostrar/ocultar errores
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    fileInfo.classList.add('hidden');
    searchSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}