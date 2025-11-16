// 1. OBTENER ELEMENTOS DEL DOM
// Esto nos permite acceder a los elementos HTML desde JavaScript
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const srcLangSpan = document.getElementById('srcLang');
const totalSegmentsSpan = document.getElementById('totalSegments');
const searchSection = document.getElementById('searchSection');
const searchInput = document.getElementById('searchInput');
const resultsSection = document.getElementById('resultsSection');
const tableBody = document.getElementById('tableBody');
const errorMessage = document.getElementById('errorMessage');

// Variable global para guardar los datos parseados
let translationsData = [];

// 2. ESCUCHAR CUANDO EL USUARIO SELECCIONA UN ARCHIVO
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0]; // Obtener el archivo seleccionado
    
    // Verificar que sea un archivo TMX
    if (!file || !file.name.endsWith('.tmx')) {
        showError('Por favor selecciona un archivo TMX válido');
        return;
    }
    
    // Leer el archivo
    readTMXFile(file);
});

// 3. FUNCIÓN PARA LEER EL ARCHIVO TMX
function readTMXFile(file) {
    const reader = new FileReader();
    
    // Cuando el archivo se haya leído completamente
    reader.onload = function(e) {
        const content = e.target.result; // Contenido del archivo como texto
        parseTMX(content); // Parsear el contenido XML
    };
    
    // Si hay un error al leer
    reader.onerror = function() {
        showError('Error al leer el archivo');
    };
    
    // Iniciar la lectura del archivo como texto
    reader.readAsText(file);
}

// 4. FUNCIÓN PARA PARSEAR (ANALIZAR) EL ARCHIVO TMX
function parseTMX(xmlString) {
    try {
        // Crear un parser de XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        
        // Verificar si hubo errores al parsear
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            showError('El archivo TMX no es válido o está corrupto');
            return;
        }
        
        // Obtener el idioma origen del header
        const header = xmlDoc.querySelector('header');
        const srcLang = header ? header.getAttribute('srclang') : 'desconocido';
        
        // Obtener todas las unidades de traducción (tu)
        const translationUnits = xmlDoc.querySelectorAll('tu');
        
        // Reiniciar el array de datos
        translationsData = [];
        
        // Procesar cada unidad de traducción
        translationUnits.forEach((tu, index) => {
            // Obtener todas las variantes (tuv) de esta unidad
            const tuvs = tu.querySelectorAll('tuv');
            
            // Crear un objeto para esta unidad de traducción
            const unit = {
                id: index + 1,
                segments: {}
            };
            
            // Extraer el texto de cada idioma
            tuvs.forEach(tuv => {
                const lang = tuv.getAttribute('xml:lang');
                const seg = tuv.querySelector('seg');
                const text = seg ? seg.textContent.trim() : '';
                
                unit.segments[lang] = text;
            });
            
            translationsData.push(unit);
        });
        
        // Mostrar la información y resultados
        displayFileInfo(srcLang, translationsData.length);
        displayTranslations(translationsData);
        
        // Ocultar mensaje de error si había alguno
        hideError();
        
    } catch (error) {
        showError('Error al procesar el archivo TMX: ' + error.message);
    }
}

// 5. FUNCIÓN PARA MOSTRAR LA INFORMACIÓN DEL ARCHIVO
function displayFileInfo(srcLang, totalSegments) {
    srcLangSpan.textContent = srcLang;
    totalSegmentsSpan.textContent = totalSegments;
    fileInfo.classList.remove('hidden');
    searchSection.classList.remove('hidden');
}

// 6. FUNCIÓN PARA MOSTRAR LAS TRADUCCIONES EN LA TABLA
function displayTranslations(data) {
    // Limpiar la tabla
    tableBody.innerHTML = '';
    
    // Si no hay datos
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No se encontraron segmentos</td></tr>';
        resultsSection.classList.remove('hidden');
        return;
    }
    
    // Crear una fila por cada unidad de traducción
    data.forEach(unit => {
        const row = document.createElement('tr');
        
        // Obtener los idiomas disponibles
        const languages = Object.keys(unit.segments);
        const firstLang = languages[0] || '';
        const secondLang = languages[1] || '';
        
        row.innerHTML = `
            <td>${unit.id}</td>
            <td><strong>${firstLang}:</strong><br>${unit.segments[firstLang] || '-'}</td>
            <td><strong>${secondLang}:</strong><br>${unit.segments[secondLang] || '-'}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    resultsSection.classList.remove('hidden');
}

// 7. FUNCIÓN DE BÚSQUEDA
searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    // Si no hay término de búsqueda, mostrar todo
    if (!searchTerm) {
        displayTranslations(translationsData);
        return;
    }
    
    // Filtrar los datos
    const filtered = translationsData.filter(unit => {
        // Buscar en todos los segmentos de todos los idiomas
        return Object.values(unit.segments).some(text => 
            text.toLowerCase().includes(searchTerm)
        );
    });
    
    displayTranslations(filtered);
});

// 8. FUNCIONES AUXILIARES PARA MOSTRAR/OCULTAR ERRORES
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // Ocultar otras secciones
    fileInfo.classList.add('hidden');
    searchSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}