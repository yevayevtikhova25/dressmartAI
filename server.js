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

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // Example: scrape title and a meta description
    const data = await page.evaluate(() => {
      const title = document.querySelector('title')?.innerText || '';
      const description =
        document.querySelector('meta[name="description"]')?.content || '';
      return { title, description };
    });

    const end = Date.now();
    console.log(`✅ Scraping completed in ${end - start}ms`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Scraping error:', error);
    res.status(500).json({ error: 'Scraping failed' });
  } finally {
    if (browser) await browser.close();
  }
});

// 🔥 This is what was missing!
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 DressSmart server is running on port ${PORT}`);
});
