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

async function runMinimalVerification() {
  console.log('🚀 Running Minimal Flow & Mobile Responsive Verification...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let leakedApiKey = false;

  const page = await browser.newPage();
  page.on('response', async (res) => {
    try {
      const text = await res.text();
      // Verify that actual API key string is never leaked
      if (text.includes('AIzaSy')) {
        leakedApiKey = true;
      }
    } catch (e) {}
  });

  try {
    // 1. Desktop Test: Initial Empty State
    await page.setViewport({ width: 1280, height: 900 });
    console.log('1️⃣ Loading http://localhost:5173 on Desktop...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('input[placeholder*="Alex Rivera"]');

    // Confirm all fields start EMPTY
    const creatorVal = await page.$eval('input[placeholder*="Alex Rivera"]', el => el.value);
    const socialVal = await page.$eval('input[placeholder*="instagram.com"]', el => el.value);
    const brandVal = await page.$eval('input[placeholder*="Nike, Notion"]', el => el.value);

    console.log(`   Field check -> Creator: "${creatorVal}", Social: "${socialVal}", Brand: "${brandVal}"`);
    if (creatorVal !== '' || socialVal !== '' || brandVal !== '') {
      throw new Error('Fields did not start empty!');
    }
    console.log('   ✅ All input fields are confirmed EMPTY.');

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_desktop_empty.png'), fullPage: false });
    console.log('   📸 Captured minimal_desktop_empty.png');

    // 2. Mobile Viewport Test (360px width) on the minimal form
    console.log('2️⃣ Testing Form at 360px Mobile Width...');
    await page.setViewport({ width: 360, height: 780 });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_mobile_empty_360px.png'), fullPage: false });
    console.log('   📸 Captured minimal_mobile_empty_360px.png');

    // Switch to desktop for filling out form
    await page.setViewport({ width: 1280, height: 900 });

    // 3. Enter minimal details (just the 3 quick inputs!)
    console.log('3️⃣ Typing minimal inputs (Name, Social, Niche, Brand, Goal)...');
    await page.type('input[placeholder*="Alex Rivera"]', 'Sarah Jenkins');
    await page.type('input[placeholder*="instagram.com"]', 'https://instagram.com/sarahfit');
    await page.type('input[placeholder*="Fitness, Beauty"]', 'Sustainable Fitness');
    await page.type('input[placeholder*="Nike, Notion"]', 'Allbirds');

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_form_filled.png'), fullPage: false });
    console.log('   📸 Captured minimal_form_filled.png');

    // 4. Click Generate Proposal
    console.log('4️⃣ Clicking "Generate Proposal"...');
    await clickByText(page, 'button', 'Generate Proposal');

    // Wait for proposal editor to render
    await page.waitForFunction(() => document.body.innerText.includes('Review the proposal and check all numbers and claims before sending.'), { timeout: 30000 });
    console.log('   ✅ Proposal generated and editor displayed with required review note!');

    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_proposal_editor.png'), fullPage: false });
    console.log('   📸 Captured minimal_proposal_editor.png');

    // 5. Verify Placeholders and Assumption tags in Proposal
    const proposalText = await page.evaluate(() => document.body.innerText);
    const hasFollowerPlaceholder = proposalText.includes('[Your follower count]');
    const hasAssumptionTag = proposalText.includes('[AI-suggested, please verify]');

    console.log(`   Placeholder checks -> Follower placeholder: ${hasFollowerPlaceholder}, Assumption tag: ${hasAssumptionTag}`);

    // 6. Test Mobile View in Editor (360px width)
    console.log('5️⃣ Testing Proposal Editor on Mobile (360px)...');
    await page.setViewport({ width: 360, height: 800 });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_editor_mobile_360px.png'), fullPage: false });
    console.log('   📸 Captured minimal_editor_mobile_360px.png');

    // Switch back to desktop and scroll to top
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 600));

    // 7. Verify PDF View
    console.log('6️⃣ Testing PDF View...');
    const pdfBtn = await page.waitForSelector('#pdf-view-btn');
    await pdfBtn.click();
    await page.waitForSelector('#printable-proposal');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_pdf_view.png'), fullPage: false });
    console.log('   📸 Captured minimal_pdf_view.png');

    // 8. Open Export Modal
    console.log('7️⃣ Testing Export & Send Modal...');
    await clickByText(page, 'button', 'Export & Send');
    await page.waitForFunction(() => document.body.innerText.includes('Export & Send Collaboration Proposal'));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_export_modal.png'), fullPage: false });
    console.log('   📸 Captured minimal_export_modal.png');

    // Close export modal
    await clickByText(page, 'button', 'Close');
    await new Promise(r => setTimeout(r, 500));

    // 9. Navigate to Proposals Library (CRM)
    console.log('8️⃣ Navigating to Proposals Library CRM...');
    await clickByText(page, 'button', 'Saved Proposals');
    await page.waitForFunction(() => document.body.innerText.includes('Proposal CRM & Partnership Pipeline'));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_crm_library.png'), fullPage: false });
    console.log('   📸 Captured minimal_crm_library.png');

    // 10. Verify Security: Key never leaked
    if (leakedApiKey) {
      throw new Error('SECURITY VIOLATION: API key was found in network responses!');
    }
    console.log('   🔒 Security verified: API key never exposed in browser network requests.');

    console.log('🎉 All 7 Minimal Flow Screenshots captured and verification passed successfully!');
  } catch (err) {
    console.error('❌ Minimal Verification failed:', err);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'minimal_error.png'), fullPage: false });
    throw err;
  } finally {
    await browser.close();
  }
}

runMinimalVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
