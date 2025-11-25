import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Lead, ExtractionResult, PitchStrategy, ScrapeResult, CompetitorInfo } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Google Maps Grounding to find a list of potential business matches.
 * Allows the user to filter/select the correct entity.
 */
export const findBusinessCandidates = async (name: string, location: string): Promise<CompetitorInfo[]> => {
  const ai = getClient();

  // NOTE: When using googleMaps tool, we CANNOT use responseSchema or responseMimeType.
  // We must ask the model to output JSON in the text prompt and parse it manually.

  const prompt = `
    Find business candidates matching the name "${name}" near or in "${location}" using Google Maps.
    
    Return the result as a strictly formatted JSON object with a key "candidates".
    The "candidates" array should contain objects with:
    - "name" (string)
    - "address" (string)
    - "rating" (number, use 0 if unknown)
    - "placeUri" (string, the Google Maps link)

    Example format:
    {
      "candidates": [
        { "name": "Example Biz", "address": "123 Main St", "rating": 4.5, "placeUri": "https://..." }
      ]
    }
    
    Do not include markdown formatting (like \`\`\`json). Just the raw JSON string.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
    },
  });

  const text = response.text || "{}";

  // Clean markdown if present
  const cleanJson = text.replace(/```json\s*|\s*```/g, "").trim();

  try {
    const data = JSON.parse(cleanJson);
    return data.candidates || [];
  } catch (e) {
    console.error("Failed to parse candidates JSON", e, text);
    return [];
  }
};

/**
 * Acts as a Virtual Headless Scraper using Gemini's Search and Maps tools.
 * Replicates the logic of a Selenium script by actively hunting for review text.
 */
export const performCompetitorScraping = async (competitor: CompetitorInfo): Promise<ScrapeResult> => {
  const ai = getClient();

  // 1. Try Local Python Scraper First (Real Selenium)
  if (competitor.placeUri) {
    try {
      console.log("Attempting to connect to local scraper...", competitor.placeUri);
      const scraperResponse = await fetch('http://localhost:5000/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: competitor.placeUri })
      });

      if (scraperResponse.ok) {
        const data = await scraperResponse.json();
        if (data.success && data.rawText) {
          console.log("Local scraper successful!", data.count, "reviews found.");
          return {
            rawText: data.rawText,
            sources: [{ title: "Google Maps (Verified Scrape)", uri: competitor.placeUri }],
            reviewCount: data.count,
            websiteUrl: competitor.userProvidedUrl, // We could also scrape this if we wanted
            websiteSummary: "Data extracted from verified Google Maps reviews."
          };
        }
      }
    } catch (e) {
      console.warn("Local scraper unreachable or failed. Falling back to Gemini Virtual Scraper.", e);
    }
  }

  // 2. Fallback to Gemini "Virtual Scraper"
  let urlInstruction = "";
  if (competitor.userProvidedUrl && competitor.userProvidedUrl.trim() !== "") {
    urlInstruction = `
      TASK: WEBSITE RECON (Priority High)
      - The user provided this URL: ${competitor.userProvidedUrl}
      - Scan this specific URL for "About Us" or "Services" content.
      - Output the Official URL on a new line: "OFFICIAL_WEBSITE: [url]"
      - Summarize their primary value proposition in 1 sentence: "COMPANY_CLAIM: [summary]"
    `;
  } else {
    urlInstruction = `
      TASK: WEBSITE RECON (Passive)
      - Try to find the official website. If found, output "OFFICIAL_WEBSITE: [url]".
    `;
  }

  // Aggressive "Selenium-like" Prompt
  // We instruct the model to perform multiple conceptual 'searches' to dig out the reviews.
  const prompt = `
    ACTIVATE VIRTUAL SCRAPER MODE.
    TARGET: "${competitor.name}"
    LOCATION: "${competitor.address}"

    Your Mission: Simulate a browser script that extracts customer reviews, specifically COMPLAINTS and OWNER REPLIES.

    EXECUTION STEPS:
    1.  **Google Maps Deep Scan**: Search for the Google Maps listing. Look for 1-star and 2-star reviews.
    2.  **Review Aggregator Scan**: Search for "${competitor.name} reviews" on Yelp, Facebook, Trustpilot, or local directories.
    3.  **Complaint Discovery**: Search for "${competitor.name} complaints", "rude", "expensive", "bad service".

    OUTPUT FORMATTING:
    Compile all findings into a raw log format.
    You MUST extract the *actual text* of reviews you find in the search snippets or Maps data.
    
    Format each entry clearly:
    ---
    SOURCE: [e.g. Google Maps, Yelp]
    REVIEWER: [Name]
    RATING: [X/5 stars]
    COMPLAINT: "[Verbatim text of the complaint]"
    REPLY: "[Owner response if visible]"
    ---

    ${urlInstruction}

    IMPORTANT:
    - Do not summarize widely. Try to get quotes.
    - If specific reviews are blocked, find the general sentiment themes (e.g. "Multiple users mention late delivery").
    - If absolutely NO data is found, output: "SYSTEM ALERT: NO PUBLIC DATA."
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      // We use both Maps and Search. Maps for entity verification, Search for the review text hunting.
      tools: [{ googleSearch: {}, googleMaps: {} }],
    },
  });

  // Extract grounding metadata
  const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  const sources = (rawSources as any[]).map((chunk: any) => {
    if (chunk.web) {
      return { title: chunk.web.title, uri: chunk.web.uri };
    }
    if (chunk.maps) {
      return { title: chunk.maps.title || "Google Maps Listing", uri: chunk.maps.uri || "" };
    }
    return null;
  }).filter((s: any) => s && s.uri !== "");

  const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values());

  const text = response.text || "No data found.";

  // Parse structured website info from the text response
  const urlMatch = text.match(/OFFICIAL_WEBSITE:\s*(https?:\/\/[^\s]+)/i);
  const claimMatch = text.match(/COMPANY_CLAIM:\s*(.+)/i);

  return {
    rawText: text,
    sources: uniqueSources as any,
    websiteUrl: urlMatch ? urlMatch[1] : competitor.userProvidedUrl,
    websiteSummary: claimMatch ? claimMatch[1].trim() : undefined
  };
};

/**
 * Extracts structured lead data from raw text using JSON schema.
 */
export const extractLeadsFromText = async (rawText: string, competitorName: string): Promise<ExtractionResult> => {
  const ai = getClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      leads: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            complaint: { type: Type.STRING },
            painPointCategory: { type: Type.STRING, enum: ['Price', 'Service', 'Quality', 'Delivery', 'Other'] },
            sentimentScore: { type: Type.NUMBER, description: "1-10 scale, 10 is most angry" },
            suggestedPitchAngle: { type: Type.STRING }
          },
          required: ["customerName", "complaint", "painPointCategory", "sentimentScore", "suggestedPitchAngle"]
        }
      },
      summary: { type: Type.STRING }
    },
    required: ["leads", "summary"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `
      Analyze the following raw review text for business "${competitorName}".
      Extract a list of customers (leads) who have expressed dissatisfaction.
      
      Raw Text:
      ${rawText}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonStr = response.text || "{}";
  try {
    return JSON.parse(jsonStr) as ExtractionResult;
  } catch (e) {
    console.error("Failed to parse leads JSON", e);
    return { leads: [], summary: "Failed to parse extraction results." };
  }
};

/**
 * Generates the sales pitch strategy based on extracted leads.
 */
export const generateRaidPitch = async (competitorName: string, leads: Lead[]): Promise<PitchStrategy> => {
  const ai = getClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      subjectLine: { type: Type.STRING },
      emailBody: { type: Type.STRING },
      inPersonScript: { type: Type.STRING },
      keySellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["subjectLine", "emailBody", "inPersonScript", "keySellingPoints"]
  };

  const leadsSummary = leads.map(l => `${l.customerName}: ${l.complaint} (${l.painPointCategory})`).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `
      You are a strategic business consultant.
      Business: ${competitorName}
      
      We have identified the following unhappy customers or areas of improvement:
      ${leadsSummary}
      
      Create a Strategy to win these clients over (or improve the business if self-analysis).
      1. An email subject line that gets opened.
      2. An email body that addresses the pain points empathetically.
      3. A script for a direct conversation.
      4. Key Selling Points/Improvements to counter the weaknesses found.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr) as PitchStrategy;
};