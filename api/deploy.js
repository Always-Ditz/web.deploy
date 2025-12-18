// ⚠️ WARNING: Token di-hardcode di sini - GANTI dengan token kamu!
const VERCEL_TOKEN = 'Xi4Stun3smmDj1geUS27UTAu';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, fileData, fileName } = req.body;

    // Validation
    if (!name || !fileData || !fileName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate name format
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid website name format' });
    }

    // Check if token is configured
    if (VERCEL_TOKEN === 'GANTI_DENGAN_TOKEN_KAMU_DISINI') {
      return res.status(500).json({ error: 'Please configure your Vercel token in api/deploy.js' });
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
          error: `The name "${name}" is already taken. Please choose another name.` 
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
      // For ZIP, we'll need to extract on client side first
      // Or use unzipper library here
      return res.status(400).json({ 
        error: 'ZIP support coming soon. Please use HTML files for now.' 
      });
    } else {
      return res.status(400).json({ error: 'Invalid file type' });
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
        error: errorData.error?.message || 'Deployment failed' 
      });
    }

    const deployData = await deployResponse.json();

    return res.status(200).json({
      success: true,
      url: `https://${name}.vercel.app`,
      deploymentUrl: deployData.url
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
        }
