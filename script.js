// Elements
const fileUpload = document.getElementById('fileUpload');
const fileName = document.getElementById('fileName');
const websiteName = document.getElementById('websiteName');
const deployBtn = document.getElementById('deployBtn');
const statusMessage = document.getElementById('statusMessage');
const resultCard = document.getElementById('resultCard');
const deployedUrl = document.getElementById('deployedUrl');
const newDeployBtn = document.getElementById('newDeployBtn');

let selectedFile = null;

// File upload handler
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        fileName.textContent = file.name;
        
        // Validate file type
        const validExtensions = ['.html', '.zip'];
        const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValid) {
            showStatus('error', 'Harap upload file HTML atau ZIP saja');
            selectedFile = null;
            fileName.textContent = 'Pilih file HTML atau ZIP';
        }
    }
});

// Website name validation
websiteName.addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
});

// Deploy button handler
deployBtn.addEventListener('click', async () => {
    // Validate inputs
    if (!websiteName.value.trim()) {
        showStatus('error', 'Silakan masukkan nama website');
        return;
    }
    
    if (!selectedFile) {
        showStatus('error', 'Silakan pilih file untuk diupload');
        return;
    }
    
    // Start deployment
    await deployToVercel(websiteName.value.trim(), selectedFile);
});

// New deploy button
newDeployBtn.addEventListener('click', () => {
    resultCard.classList.add('hidden');
    websiteName.value = '';
    fileUpload.value = '';
    fileName.textContent = 'Pilih file HTML atau ZIP';
    selectedFile = null;
    statusMessage.classList.add('hidden');
});

// Show status message
function showStatus(type, message) {
    statusMessage.className = `status-message ${type}`;
    statusMessage.textContent = message;
}

// Read file as base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Deploy to Vercel via backend API
async function deployToVercel(name, file) {
    try {
        deployBtn.disabled = true;
        deployBtn.classList.add('loading');
        showStatus('info', 'Mempersiapkan deployment...');
        
        // Read file
        showStatus('info', 'Membaca file...');
        const fileData = await readFileAsBase64(file);
        
        // Call backend API
        showStatus('info', 'Sedang deploy ke Vercel...');
        const response = await fetch('/api/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                fileData: fileData,
                fileName: file.name
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Deploy gagal');
        }
        
        // Success
        deployBtn.disabled = false;
        deployBtn.classList.remove('loading');
        statusMessage.classList.add('hidden');
        
        // Show result
        deployedUrl.href = data.url;
        deployedUrl.textContent = data.url.replace('https://', '');
        resultCard.classList.remove('hidden');
        
    } catch (error) {
        console.error('Deployment error:', error);
        showStatus('error', `Deploy gagal: ${error.message}`);
        deployBtn.disabled = false;
        deployBtn.classList.remove('loading');
    }
}