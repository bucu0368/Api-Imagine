
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyDiWYhNzVVAJ5ZLCFsv8ZgjQlbJBM4b9c0");
const app = express();

const VALID_API_KEY = "bucu";

// Store for generated API keys
const apiKeys = new Set([VALID_API_KEY]); // Include the default key

// Function to generate a random API key
function generateApiKey() {
  return 'key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Middleware to track request timing
function trackTiming(req, res, next) {
  req.startTime = Date.now();
  next();
}

// Middleware to verify API key
function verifyApiKey(req, res, next) {
  const apikey = req.query.apikey || req.headers['x-api-key'];
  
  if (!apikey) {
    return res.status(401).json({
      error: "API key required for authentication",
      message: "Provide apikey as query parameter or x-api-key header"
    });
  }
  
  if (!apiKeys.has(apikey)) {
    return res.status(401).json({
      error: "Invalid or expired api key."
    });
  }
  
  next();
}

async function generateImage(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      responseModalities: ["Text", "Image"]
    }
  });

  try {
    const response = await model.generateContent(prompt);
    
    for (const part of response.response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // Return base64 image data
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

// Store generated images in memory with unique IDs
const imageCache = new Map();

// Endpoint to generate new API keys
app.get('/apikey', trackTiming, (req, res) => {
  try {
    const newApiKey = generateApiKey();
    apiKeys.add(newApiKey);
    
    // Calculate request duration
    const endTime = Date.now();
    const duration = ((endTime - req.startTime) / 1000).toFixed(2);
    
    res.json({
      message: 'API key generated successfully',
      status: 'success',
      apikey: newApiKey,
      duration: `${duration}s`
    });
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - req.startTime) / 1000).toFixed(2);
    res.status(500).json({
      error: "Failed to generate API key",
      duration: `${duration}s`
    });
  }
});

app.get('/image', trackTiming, verifyApiKey, async (req, res) => {
  try {
    const prompt = req.query.prompt;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt parameter is required" });
    }

    const imageData = await generateImage(prompt);
    
    // Generate unique ID for the image
    const imageId = Date.now() + '-' + Math.random().toString(36).substring(2);
    
    // Store image data in cache
    imageCache.set(imageId, imageData);
    
    // Calculate request duration
    const endTime = Date.now();
    const duration = ((endTime - req.startTime) / 1000).toFixed(2);
    
    // Return JSON with image URL
    const imageUrl = `${req.protocol}://${req.get('host')}/generated/${imageId}.png`;
    
    res.json({
      message: 'Image generated successfully',
      status: 'success',
      image: imageUrl,
      imageId: imageId,
      prompt: prompt,
      duration: `${duration}s`
    });
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - req.startTime) / 1000).toFixed(2);
    res.status(500).json({ 
      error: "Failed to generate image",
      duration: `${duration}s`
    });
  }
});

// Endpoint to serve generated images
app.get('/generated/:imageId.png', (req, res) => {
  const imageId = req.params.imageId;
  const imageData = imageCache.get(imageId);
  
  if (!imageData) {
    return res.status(404).json({ error: "Image not found" });
  }
  
  const imageBuffer = Buffer.from(imageData, 'base64');
  
  res.set({
    'Content-Type': 'image/png',
    'Content-Length': imageBuffer.length
  });
  
  res.send(imageBuffer);
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
