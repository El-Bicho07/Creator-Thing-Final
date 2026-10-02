const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/Prinetha Kannan/.gemini/antigravity/brain/a4138f8c-48e5-4e8b-b2bc-131405b76f43';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function clickByText(page, tag, text) {
  const clicked = await page.evaluate((tag, text) => {
    const elements = Array.from(document.querySelectorAll(tag));
    const target = elements.find(el => (el.innerText || el.textContent || '').includes(text));
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.click();
      return true;
    }
    return false;
  }, tag, text);
  if (!clicked) throw new Error(`Could not find ${tag} containing text: "${text}"`);
}

async function runE2E() {
  console.log('🚀 Starting End-to-End Browser Verification...');
  console.log(`🌐 Chrome Path: ${CHROME_PATH}`);
  console.log(`📁 Artifacts Dir: ${ARTIFACTS_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 960 });

  try {
    // 1. Navigate to App
    console.log('1️⃣ Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => document.body.innerText.includes('Creator Profile & Rate Card'));
    console.log('   App loaded successfully.');

    // Screenshot Step 1: Profile
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step1_profile.png'), fullPage: false });
    console.log('   📸 Captured step1_profile.png');

    // 2. Click "Next: Brand Information"
    console.log('2️⃣ Navigating to Step 2: Brand Information...');
    await clickByText(page, 'button', 'Next: Brand Information');
    await page.waitForFunction(() => document.body.innerText.includes('Brand & Campaign Target'));

    // Test AI Extractor Accordion
    await clickByText(page, 'button', 'Open Extractor');
    await page.waitForFunction(() => document.body.innerText.includes('Extract Brand Intelligence'));
    console.log('   AI Brand Extractor opened.');

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step2_brand.png'), fullPage: false });
    console.log('   📸 Captured step2_brand.png');

    // 3. Click "Next: Proposal Generator"
    console.log('3️⃣ Navigating to Step 3: Pitch Strategy...');
    await clickByText(page, 'button', 'Next: Proposal Generator');
    await page.waitForFunction(() => document.body.innerText.includes('Pitch Strategy & Generation'));

    // Select "Bold & Disruptive" tone
    await clickByText(page, 'div', 'Bold & Disruptive');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step3_strategy.png'), fullPage: false });
    console.log('   📸 Captured step3_strategy.png');

    // 4. Click "Generate Collaboration Pitch"
    console.log('4️⃣ Generating Proposal with AI Engine...');
    await clickByText(page, 'button', 'Generate Collaboration Pitch');

    // Wait for generation to complete and step 4 editor to load
    await page.waitForFunction(() => document.body.innerText.includes('Audience & Brand Alignment Index'), { timeout: 30000 });
    console.log('   Proposal generated successfully!');

    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step4_editor.png'), fullPage: false });
    console.log('   📸 Captured step4_editor.png');

    // 5. Test Section Refinement: Click "More Persuasive"
    console.log('5️⃣ Testing Section Refinement (More Persuasive)...');
    await clickByText(page, 'button', 'More Persuasive');
    await new Promise(r => setTimeout(r, 1200));

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 400));

    // 6. Switch to Executive PDF View
    console.log('6️⃣ Switching to Executive Presentation / PDF View...');
    await clickByText(page, 'button', 'PDF View');
    await page.waitForSelector('#printable-proposal');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step5_pdf_preview.png'), fullPage: false });
    console.log('   📸 Captured step5_pdf_preview.png');

    // 7. Open Export Modal
    console.log('7️⃣ Testing Export & Send Modal...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await clickByText(page, 'button', 'Export & Send');
    await page.waitForFunction(() => document.body.innerText.includes('Export & Send Collaboration Proposal'));
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step6_export_modal.png'), fullPage: false });
    console.log('   📸 Captured step6_export_modal.png');

    // Close export modal
    await clickByText(page, 'button', 'Close');
    await new Promise(r => setTimeout(r, 600));

    // 8. Navigate to Proposals Library (CRM)
    console.log('8️⃣ Navigating to Proposals Library CRM...');
    await clickByText(page, 'button', 'Proposals Library');
    await page.waitForFunction(() => document.body.innerText.includes('Proposal CRM & Partnership Pipeline'));
    await new Promise(r => setTimeout(r, 800));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step7_crm_library.png'), fullPage: false });
    console.log('   📸 Captured step7_crm_library.png');

    // 9. Test Dark Mode / Light Mode toggle
    console.log('9️⃣ Testing Theme Toggle...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Switch to"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'step8_theme_toggle.png'), fullPage: false });
    console.log('   📸 Captured step8_theme_toggle.png');

    console.log('🎉 All 8 Screenshots captured and verification passed successfully!');
  } catch (err) {
    console.error('❌ E2E Verification failed:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_screenshot.png'), fullPage: false });
    throw err;
  } finally {
    await browser.close();
  }
}

runE2E().catch(err => {
  console.error(err);
  process.exit(1);
});
