// ⚠️ WARNING: Token di-hardcode di sini - GANTI dengan token kamu!
const VERCEL_TOKEN = 'Xi4Stun3smmDj1geUS27UTAu';

// Global quota & cooldown tracker (in-memory)
let dailyQuota = 50;
let lastResetTime = Date.now();
let lastDeployTime = 0;

const DAILY_LIMIT = 50;
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 menit
const RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 jam

// Reset quota setiap 24 jam
function checkAndResetQuota() {
  const now = Date.now();
  if (now - lastResetTime >= RESET_INTERVAL) {
    dailyQuota = DAILY_LIMIT;
    lastResetTime = now;
  }
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check & reset quota jika sudah 24 jam
    checkAndResetQuota();

    // Check daily quota
    if (dailyQuota <= 0) {
      return res.status(429).json({ 
        error: 'Quota harian sudah habis. Silakan coba lagi besok.',
        remainingQuota: 0,
        quotaExceeded: true
      });
    }

    // Check global cooldown
    const now = Date.now();
    const timeSinceLastDeploy = now - lastDeployTime;
    
    if (lastDeployTime > 0 && timeSinceLastDeploy < COOLDOWN_DURATION) {
      const remainingTime = Math.ceil((COOLDOWN_DURATION - timeSinceLastDeploy) / 1000);
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      
      return res.status(429).json({ 
        error: `Sistem sedang cooldown. Tunggu ${minutes} menit ${seconds} detik lagi.`,
        remainingSeconds: remainingTime,
        remainingQuota: dailyQuota,
        cooldown: true
      });
    }

    const { name, fileData, fileName } = req.body;

    // Validation
    if (!name || !fileData || !fileName) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    // Validate name format
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'Format nama website tidak valid' });
    }

    // Check if token is configured
    if (VERCEL_TOKEN === 'GANTI_DENGAN_TOKEN_KAMU_DISINI') {
      return res.status(500).json({ error: 'Token Vercel belum dikonfigurasi' });
    }

    const headers = {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    };

    // Check if domain is available
    try {
      const checkResponse = await fetch(`https://${name}.vercel.app`, { 
        method: 'HEAD',
        redirect: 'manual'
      });
      if (checkResponse.status === 200 || checkResponse.status === 308) {
        return res.status(409).json({ 
          error: `Nama "${name}" sudah digunakan. Silakan pilih nama lain.`,
          remainingQuota: dailyQuota
        });
      }
    } catch (e) {
      // Domain not found - good, we can use it
    }

    // Prepare files array
    const files = [];
    
    if (fileName.endsWith('.html')) {
      // Single HTML file
      files.push({
        file: 'index.html',
        data: fileData,
        encoding: 'base64'
      });
    } else if (fileName.endsWith('.zip')) {
      return res.status(400).json({ 
        error: 'Support ZIP segera hadir. Gunakan file HTML untuk saat ini.',
        remainingQuota: dailyQuota
      });
    } else {
      return res.status(400).json({ 
        error: 'Tipe file tidak valid',
        remainingQuota: dailyQuota
      });
    }

    // Create project (ignore if exists)
    await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name })
    }).catch(() => {});

    // Create deployment
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        project: name,
        files,
        projectSettings: {
          framework: null
        }
      })
    });

    if (!deployResponse.ok) {
      const errorData = await deployResponse.json();
      console.error('Vercel API Error:', errorData);
      return res.status(deployResponse.status).json({ 
        error: errorData.error?.message || 'Deploy gagal',
        remainingQuota: dailyQuota
      });
    }

    const deployData = await deployResponse.json();

    // Update trackers setelah deploy berhasil
    dailyQuota--;
    lastDeployTime = Date.now();

    return res.status(200).json({
      success: true,
      url: `https://${name}.vercel.app`,
      deploymentUrl: deployData.url,
      remainingQuota: dailyQuota,
      message: `Deploy berhasil! Quota tersisa: ${dailyQuota}/${DAILY_LIMIT}`
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return res.status(500).json({ 
      error: error.message || 'Terjadi kesalahan server',
      remainingQuota: dailyQuota
    });
  }
}
