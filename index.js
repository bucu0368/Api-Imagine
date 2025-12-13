
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

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
