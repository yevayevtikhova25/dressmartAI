const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.get('/', (req, res) => {
  res.send('🎉 DressSmart scraping server is running!');
});

app.get('/api/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  let browser;

  try {
    console.log(`🔍 Scraping URL: ${url}`);
    const start = Date.now();

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Click the "Composition" tab to expand it
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button, span')).find(el =>
        el.textContent?.toLowerCase().includes('composition')
      );
      if (tab) tab.click();
    });

    // Short wait to allow the content to expand and render
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = await page.evaluate(() => {
      const getImageSrc = img =>
        img?.getAttribute('src') ||
        img?.getAttribute('data-src') ||
        (img?.getAttribute('srcset')?.split(' ')[0]) ||
        '';

      // Find the image with the alt text "Article without model"
      const imgs = Array.from(document.querySelectorAll('img'));
      const mainImg = imgs.find(img =>
        img.alt?.toLowerCase().includes('article without model')
      );

      const image = getImageSrc(mainImg || imgs[0]);

      // Returning only the image (no composition extraction)
      return {
        image
      };
    });

    console.log('✅ Done in', (Date.now() - start) / 1000, 's');
    console.log('🖼️ Image:', result.image);

    if (!result.image) {
      console.warn('⚠️ No image found.');
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Return only image data
    res.json(result);
  } catch (err) {
    console.error('❌ Scraping failed:', err.stack || err.message || err);
    res.status(500).json({ error: 'Failed to scrape', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Puppeteer scraping server running at http://localhost:${PORT}`);
});
