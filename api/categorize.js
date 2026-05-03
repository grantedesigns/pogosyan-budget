// /api/categorize.js
// Vercel serverless function that proxies requests to Anthropic.
// API key stays on the server, never sent to the browser.

const SYSTEM_PROMPT = `You are a personal finance categorization engine for Grant Pogosyan and his wife Zara, a Los Angeles family.

CRITICAL CONTEXT ABOUT THEIR FINANCES:
- Grant runs Grantedesigns Inc., a brand strategy and design studio. His Chase Business Complete Checking is technically a business account but is heavily mixed with personal spending.
- Citi is a joint personal account between Grant and Zara.
- They have a baby — small expenses for diapers, childcare items, etc. are expected.

KNOWN VENDORS — CATEGORIZE THESE EXACTLY:

PERSONAL — HOUSING:
- Rocket Mortgage = Housing (mortgage)

PERSONAL — UTILITIES & TELECOM:
- LADWP = Utilities
- Frontier Communications = Internet
- T-Mobile = Cellphone

PERSONAL — TRANSPORTATION:
- GM Financial = Car Payment
- State Farm = Insurance
- Shell Oil, Chevron, 76, Mobil = Gas
- Acapulco Tires, any tire/auto shop = Car Maintenance
- Goodleap = Solar Loan

PERSONAL — DEBT:
- SBA Loan = SBA
- Citi Card payments (from checking) = Credit Card Payment
- Apple Card / Goldman Sachs = Credit Card Payment
- Chase Credit Card autopay = Credit Card Payment

PERSONAL — GROCERIES:
- Trader Joe's, Costco, Vons, Ralphs, St Market, Sunland Produce, Sprouts = Groceries

PERSONAL — EATING OUT (Basic Needs):
- Any restaurant: Panda Express, Panda Inn, In-N-Out, Slice House, Mama Hong's, Season Thai, Crazy Hot Wings, Giamela's, Paris Baguette, Poke House, Froyo Life, etc. = Basic Needs (Eating Out)
- AMC, movie theaters = Entertainment (NOT eating out)

PERSONAL — HOUSEHOLD:
- Target, Ikea, Amazon (general), pest control like Matz Rodent Proofing = Household
- Bath & Body Works = Personal Care

PERSONAL — PERSONAL CARE / BEAUTY:
- Vagaro, European Wax Center, Naimies, salons = Personal Care / Beauty

PERSONAL — SUBSCRIPTIONS & SOFTWARE:
- Apple.com/Bill = Apple Subscriptions
- Netflix, YouTube Premium, Spotify, Audible = Streaming
- Google One = Cloud Storage
- ChatGPT, OpenAI, Anthropic (small consumer charges) = AI Subscriptions
- Adobe (single $69.99 charge) = Adobe
- Microsoft (consumer) = Microsoft

PERSONAL — ENTERTAINMENT:
- AMC, movie theaters, Disneyland (DLR), LA Zoo, theme parks = Entertainment / Outings
- PlayStation, Apex Hosting, Minecraft, Steam = Video Games

BUSINESS — DESIGN STUDIO EXPENSES:
- 4Over, 4OverInternational = Print Vendor (business)
- Argeen Inlight Print = Print Vendor (business)
- Mcnelis CPA = CPA / Accounting (business)
- Squarespace = Web Hosting (business)
- Github = Code Hosting (business)
- WeTransfer = File Transfer (business)
- Astute Graphics, Paddle.Net Astutegrap = Design Software (business)
- Fiverr, Paypal Fiverr = Freelancers (business)
- Facebook / Facebk Ads (any small charges with cryptic codes) = Facebook Ads (business)
- Intuit / QuickBooks subscription = QuickBooks (business)
- Intuit Tran Fee = QuickBooks Transaction Fees (business)
- Microsoft 365 Business / $99.99 charge = Microsoft 365 (business)
- Gumroad, Reve.com = Design Tools (business)
- Anthropic at $25 = Anthropic API (business)

ZELLE TRANSFERS:
- Zelle TO clients/vendors (Argeen Inlight, etc.) = Business
- Zelle TO friends/family (Arlene Hovak, Makaryan, Suzan Pogosyan, Cierra, Matilda, Dre, Ruzan, Suzy, Kerin Hernandez) = Personal — Zelle to People

INCOME (DEPOSITS):
- Intuit deposits with "Grantedesigns Inc" = Business Income
- Disney WORLDWI EDI PYMNTS = Disney Income
- Airbnb = Airbnb Income
- Zelle FROM clients = Business Income
- "Card Purchase Return" = Refund

INTERNAL TRANSFERS — DO NOT COUNT AS SPENDING:
- "Transfer to Checking" / "Transfer From Checking" between same person's accounts = Internal Transfer
- "IITC" prefix on Citi statements = Internal Citi Transfer

FEES:
- Monthly Service Fee = Bank Fee

UNKNOWN VENDORS:
- If you don't recognize a vendor, make your best guess but set "needsReview": true.

DESCRIPTION FORMATTING RULES:
In the "description" field, rewrite the raw bank text into clean, human-readable format:
- For Zelle transfers: Use the person's name only. Example: "Zelle → Arlene Hovak" or "Zelle from Best Gutter Co"
- For card purchases: Extract the merchant name. Example: "Naimies" instead of "Mobile Purchase Sign Based 05/31 12:45p #1587 D527"
- For known vendors: Use the clean name. Example: "Rocket Mortgage" instead of "ROCKET MORTGAGE LOAN 2589290"
- For ACH/direct debits: Use the company name. Example: "ACH → QuickBooks" instead of "ACH Electronic Debit NSM DBAMR.C"
- Keep descriptions under 40 characters
- Remove transaction codes, reference numbers, timestamps, and internal bank identifiers
- If the merchant/person name isn't clear, keep it short and descriptive: "Card purchase" or "Unknown vendor"

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure (no preamble, no markdown):
{
  "bank": "Chase" | "Citi" | "Other",
  "accountType": "Business Checking" | "Personal Checking" | "Joint Personal Checking",
  "period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "beginningBalance": number,
  "endingBalance": number,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "clean human-readable description",
      "amount": number (positive = inflow, negative = outflow),
      "category": "category name",
      "businessPersonal": "business" | "personal" | "internal",
      "isRecurring": true | false,
      "frequency": "monthly" | "annual" | "quarterly" | "one-time",
      "needsReview": true | false,
      "note": "optional short note if anomalous"
    }
  ]
}

Be exhaustive. Capture EVERY transaction including small Facebook ad charges, Apple subscriptions, every Zelle.`;

export default async function handler(req, res) {
  // CORS — allow any origin since this is a personal tool
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY env variable' });
  }

  try {
    const { fileType, base64, filename } = req.body;

    if (!base64) {
      return res.status(400).json({ error: 'Missing base64 file data' });
    }

    const isPdf = fileType === 'application/pdf';
    const isImage = fileType?.startsWith('image/');

    if (!isPdf && !isImage) {
      return res.status(400).json({ error: 'File must be PDF or image' });
    }

    const contentBlock = isPdf ? {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 }
    } : {
      type: 'image',
      source: { type: 'base64', media_type: fileType, data: base64 }
    };

    const promptText = isImage
      ? 'Screenshot of a credit card balance or financial info. Extract what you see and return JSON in the specified format. If just a balance display, return one transaction with description "Current CC Balance" and amount as negative. RETURN ONLY THE JSON OBJECT. NO PREAMBLE. START WITH { END WITH }.'
      : 'Categorize EVERY transaction in this statement. Be exhaustive. RETURN ONLY THE JSON OBJECT. NO PREAMBLE. START WITH { END WITH }.';

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [contentBlock, { type: 'text', text: promptText }]
        }]
      })
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('Anthropic API error:', anthropicResp.status, errText);
      return res.status(anthropicResp.status).json({
        error: `Claude API error ${anthropicResp.status}`,
        detail: errText.substring(0, 500)
      });
    }

    const data = await anthropicResp.json();
    const textBlock = data.content?.find(c => c.type === 'text');

    if (!textBlock) {
      return res.status(500).json({
        error: 'No text in Claude response',
        stop_reason: data.stop_reason
      });
    }

    let jsonText = textBlock.text.trim();
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace > 0 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      return res.status(500).json({
        error: 'Could not parse Claude response as JSON',
        rawPreview: textBlock.text.substring(0, 500),
        parseError: e.message
      });
    }

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      return res.status(500).json({
        error: 'Response missing transactions array',
        receivedShape: Object.keys(parsed)
      });
    }

    return res.status(200).json(parsed);

  } catch (e) {
    console.error('Server error:', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
