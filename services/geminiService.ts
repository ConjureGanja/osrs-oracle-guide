import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

// Helper to get a client with the current environment key. 
// Must be called at execution time to pick up injected keys.
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOsrsResponse = async (
  prompt: string,
  config: { useSearch: boolean; useThinking: boolean; category: string },
  history: { role: string; parts: { text: string }[] }[]
): Promise<{ text: string; sources: { title: string; uri: string }[] }> => {
  const ai = getClient();
  
  let modelName = 'gemini-3-pro-preview'; // Default for intelligence
  let tools: any[] | undefined = undefined;
  let thinkingConfig: any = undefined;

  // System Instruction tailored to OSRS
  const systemInstruction = `You are the Oracle of Gielinor, an expert guide for Old School RuneScape (OSRS).
  
  CORE RULES:
  1. ACCURACY: You must provide factually accurate information based on the OSRS Wiki. Do not guess mechanics.
  2. CONTEXT: The user is asking about the game "Old School RuneScape", not real life.
  3. STYLE: Be helpful, concise, and structured. Use Markdown.
  4. CATEGORY CONTEXT: The user has selected the category: ${config.category}. Tailor your advice to this.
  
  INTERACTIVE TOOLTIPS:
  - When you mention specific equippable items, weapons, or key inventory items (e.g., "Abyssal whip", "Prayer potion", "Bandos tassets"), you MUST format them using this special tag: [[Item Name|Short Stats/Info]].
  - The Stats/Info should be very brief (under 6 words).
  - Example: "Use the [[Abyssal whip|Slash: +82, Str: +82]] for general training."
  - Example: "Sip a [[Prayer potion(4)|Restores Prayer points]] when low."
  - Do NOT use this format for NPCs, Locations, or Skills. Only Items.

  SPECIFIC GUIDANCE:
  - If asked about Diaries (e.g., Morytania Hard), list exact requirements and steps.
  - If asked about PvP (LMS, Wildy), provide gear setups, inventory layouts, and prayer switching tips.
  - If asked about PvM, explain mechanics clearly, potentially using bullet points or steps.
  
  Formatting:
  - Use bolding for key terms that are not items.
  - Create tables for gear comparisons.
  `;

  if (config.useThinking) {
    modelName = 'gemini-3-pro-preview';
    thinkingConfig = { thinkingBudget: 32768 }; // Max budget
  } 
  
  let finalPrompt = prompt;

  if (config.useSearch) {
    // If user wants search, we use Flash for speed/grounding unless they specifically wanted deep thinking.
    if (!config.useThinking) {
        modelName = 'gemini-2.5-flash';
        tools = [{ googleSearch: {} }];
        
        // STRICTLY enforce OSRS Wiki for general searches to avoid SEO spam sites
        finalPrompt = `${prompt} site:oldschool.runescape.wiki`;
    }
  }

  const reqConfig: any = {
    systemInstruction,
  };

  if (thinkingConfig) {
      reqConfig.thinkingConfig = thinkingConfig;
  }

  if (tools && !config.useThinking) {
    reqConfig.tools = tools;
  }

  // Chat approach
  const chat = ai.chats.create({
    model: modelName,
    config: reqConfig,
    history: history as any, // Cast purely for TS alignment
  });

  const result: GenerateContentResponse = await chat.sendMessage({ message: finalPrompt });
  
  const text = result.text || "The Oracle is silent...";
  
  // Extract sources if available
  const sources: { title: string; uri: string }[] = [];
  if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
    result.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });
  }

  return { text, sources };
};

export const generateOsrsImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K'): Promise<string> => {
    // Users must select key logic handled in UI for Veo and Pro Image.
    // Create new instance to pick up the selected key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); 
    
    // Enhance prompt for OSRS Style
    const styleSuffix = ", Old School RuneScape art style, 2007scape aesthetic, low poly, pixelated textures, bad graphics machine style, fantasy concept art";
    const finalPrompt = prompt + styleSuffix;

    // We use generateContent for nano banana series
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: finalPrompt }]
        },
        config: {
            imageConfig: {
                imageSize: size,
                aspectRatio: "1:1" // Default square for items/icons
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
};

export const editOsrsImage = async (base64Image: string, prompt: string): Promise<string> => {
    // Prompt: "Use Gemini 2.5 Flash Image... users can say 'Add a retro filter'"
    const ai = getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: 'image/png', // Assuming PNG for simplicity in this flow
                        data: base64Image
                    }
                },
                { text: prompt + ", keep OSRS aesthetic" }
            ]
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No edited image generated");
};

export const analyzeOsrsContent = async (file: File, prompt: string, isVideo: boolean): Promise<string> => {
    const ai = getClient();
    const model = 'gemini-3-pro-preview';
    
    // Convert File to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data url prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const mimeType = file.type;

    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                },
                { text: prompt }
            ]
        }
    });

    return response.text || "Analysis failed.";
};

export const generateOsrsVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', imageBase64?: string): Promise<string> => {
    // Prompt: veo-3.1-fast-generate-preview
    // Must handle API Key selection race condition
    
    // We assume the caller checks for key selection.
    // Create new instance to pick up the selected key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); 

    // Enhance prompt for OSRS Style
    const styleSuffix = ", Old School RuneScape gameplay style, low poly 3d animation, runescape classic aesthetic";
    const finalPrompt = prompt + styleSuffix;

    let operation;
    
    if (imageBase64) {
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: finalPrompt,
            image: {
                imageBytes: imageBase64,
                mimeType: 'image/png' // Assuming PNG
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p', // Fast preview usually 720p
                aspectRatio: aspectRatio
            }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: finalPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) throw new Error("Video generation failed");

    // Fetch the actual video bytes
    const vidResponse = await fetch(`${uri}&key=${process.env.API_KEY}`);
    const vidBlob = await vidResponse.blob();
    return URL.createObjectURL(vidBlob);
};

export const speakText = async (text: string): Promise<string> => {
    // Gemini 2.5 Flash TTS
    const ai = getClient();
    // Clean text of tooltip formatting for speech
    const cleanText = text.replace(/\[\[(.*?)\|.*?\]\]/g, "$1");

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Deep voice fits "Oracle"
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    return base64Audio;
};