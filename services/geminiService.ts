import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProjectBlueprint, GeneratedFile, AppSettings } from '../types';

// Default Shared Key (often rate limited)
const defaultApiKey = "AIzaSyDtE5JOi0nn7AEmfDAKJUNPGAFFZzLzIGw";

const fileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    path: { type: Type.STRING, description: "Relative file path (e.g., src/App.tsx)" },
    content: { type: Type.STRING, description: "The full source code content of the file" },
    language: { type: Type.STRING, description: "The programming language (e.g., typescript, json, css)" },
  },
  required: ["path", "content", "language"],
};

const blueprintSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "A brief technical summary of the generated architecture." },
    structure: { type: Type.STRING, description: "A visual tree string representation of the folder structure." },
    files: {
      type: Type.ARRAY,
      items: fileSchema,
      description: "List of essential files to bootstrap the project.",
    },
  },
  required: ["description", "structure", "files"],
};

const stackPrompts: Record<string, string> = {
  'react-node': 'Use React with TypeScript, TailwindCSS for frontend, and Node.js/Express for backend.',
  'nextjs': 'Use Next.js 14+ with App Router, TypeScript, and TailwindCSS.',
  'esp32': 'Target ESP32 Microcontrollers using C++ (Arduino Framework) via PlatformIO. Include "platformio.ini", "src/main.cpp", and header files. Focus on embedded efficiency, WiFi connection, and sensor handling examples if applicable.',
  'python-fastapi': 'Use Python with FastAPI for the backend and a simple HTML/JS frontend.',
  'vue-firebase': 'Use Vue 3 (Composition API) and assume Firebase SDK integration.',
  'flutter': 'Use Dart and Flutter widgets.',
  'vanilla': 'Use vanilla HTML5, CSS3, and modern JavaScript (ES6+).'
};

const cleanAndParseJson = (text: string) => {
    if (!text) throw new Error("Empty response from AI");
    
    let cleaned = text.trim();
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    }
    
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON:", cleaned);
        throw new Error("AI generated invalid JSON. Please try again.");
    }
};

const handleGeminiError = (error: any) => {
    console.error("Gemini API Error:", error);
    const msg = error?.message || error?.toString() || "Unknown error";
    
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
        throw new Error("System quota exceeded. Please switch to GitHub Models or add your own Google API Key in Settings.");
    }
    throw new Error(`AI Error: ${msg}`);
};

// --- OpenRouter Helper ---
const callOpenRouter = async (apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<any> => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://shahid-ai.app",
                "X-Title": "Shahid_AI Code Architect",
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON." },
                    { role: "user", content: userPrompt }
                ],
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) throw new Error("No content received from OpenRouter.");
        return cleanAndParseJson(content);
    } catch (e) {
        throw e;
    }
};

// --- GitHub Models Helper ---
const callGithubAI = async (token: string, model: string, systemPrompt: string, userPrompt: string): Promise<any> => {
    try {
        const response = await fetch("https://models.github.ai/inference/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON." },
                    { role: "user", content: userPrompt }
                ],
                model: model,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`GitHub API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("No content received from GitHub API.");
        return cleanAndParseJson(content);
    } catch (e) {
        throw e;
    }
};

// --- Main Functions ---

export const generateProjectBlueprint = async (projectName: string, stackId: string, settings: AppSettings): Promise<ProjectBlueprint> => {
  const techStackInstruction = stackPrompts[stackId] || stackPrompts['react-node'];

  const systemInstruction = `You are a world-class senior software architect. 
  Your goal is to provide a COMPREHENSIVE, PRODUCTION-READY code blueprint.
  
  CRITICAL RULES:
  1. Do NOT use placeholders, TODOs, or comments like "// code goes here". Write the FULL, WORKING implementation.
  2. Provide a substantial number of files (aim for 8-15 files) to form a complete working prototype.
  3. Include ALL necessary configuration files (e.g., package.json, platformio.ini, tsconfig.json).
  4. Ensure the code is clean, modular, and follows best practices for the chosen stack (e.g., separate headers/implementation for C++).
  5. Include a robust README.md with setup and wiring instructions if hardware is involved.
  
  When asked for a project name, generate:
  1. A detailed technical description.
  2. A complete visual folder structure tree.
  3. The actual code content for the files.
  
  OUTPUT FORMAT:
  You must return a single valid JSON object with the following structure:
  {
    "description": "string",
    "structure": "string",
    "files": [
      { "path": "string", "content": "string", "language": "string" }
    ]
  }`;

  const prompt = `Act as a senior developer. For the project named "${projectName}", provide the complete folder structure and EXTENSIVE, DETAILED code for the application.
  
  Technical Constraints: ${techStackInstruction}
  
  REQUIREMENTS:
  - The application must be functional, not just a shell.
  - Include distinct components, services, styles, and utility functions.
  - Ensure styling (Tailwind/CSS) is fully implemented in the components.
  - If it is an Embedded/ESP32 project: Provide wiring details in comments, handle Wi-Fi connection securely, and structure the code with clear setup() and loop() functions.
  
  Generate a high-quality, comprehensive blueprint in JSON format.`;

  // --- Provider Logic ---
  
  if (settings.activeProvider === 'github') {
      if (!settings.githubToken) throw new Error("GitHub Token is missing in settings.");
      const model = settings.githubModelId || "gpt-4o";
      
      const data = await callGithubAI(settings.githubToken, model, systemInstruction, prompt);
      
      return {
          projectName,
          description: data.description,
          structure: data.structure,
          files: data.files,
      };

  } else if (settings.activeProvider === 'openrouter') {
      if (!settings.openRouterApiKey) throw new Error("OpenRouter API Key is missing in settings.");
      const model = settings.customModelId || "openai/gpt-3.5-turbo";
      
      const data = await callOpenRouter(settings.openRouterApiKey, model, systemInstruction, prompt);
      
      return {
          projectName,
          description: data.description,
          structure: data.structure,
          files: data.files,
      };

  } else {
      // Default: Google GenAI (User key preferred, fallback to default)
      const apiKey = settings.googleApiKey || defaultApiKey;
      if (!apiKey) throw new Error("No API Key available.");
      
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: blueprintSchema,
            },
        });

        const text = response.text;
        if (!text) throw new Error("No response generated from Gemini.");
        const data = cleanAndParseJson(text);

        return {
            projectName,
            description: data.description,
            structure: data.structure,
            files: data.files,
        };
      } catch (error) {
        handleGeminiError(error);
        throw error;
      }
  }
};

export const enhanceProjectBlueprint = async (files: GeneratedFile[], instructions: string, projectName: string, settings: AppSettings): Promise<ProjectBlueprint> => {
    
    // Prepare context from files
    const fileContext = files.map(f => `### File: ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
    
    const systemInstruction = `You are an expert Code Reviewer and Architect.
    Your task is to analyze an existing codebase, apply requested enhancements, fix bugs, and return the IMPROVED full version of the project.
    
    CRITICAL RULES:
    1. Return the FULL project structure, including unchanged files (unless they are irrelevant).
    2. Apply the user's specific instructions for enhancement.
    3. If no specific instructions are given, apply general best practices: clean code, better comments, improved error handling, and modern patterns.
    
    OUTPUT FORMAT:
    You must return a single valid JSON object with the following structure:
    {
      "description": "string",
      "structure": "string",
      "files": [
        { "path": "string", "content": "string", "language": "string" }
      ]
    }`;

    const prompt = `I have an existing project named "${projectName}".
    
    User Instructions for Enhancement: "${instructions || "General code quality improvement, optimization, and bug fixing."}"
    
    Current Project Files:
    ${fileContext}
    
    Please return the enhanced project blueprint in JSON.`;

    // --- Provider Logic ---

    if (settings.activeProvider === 'github') {
        if (!settings.githubToken) throw new Error("GitHub Token is missing in settings.");
        const model = settings.githubModelId || "gpt-4o";

        const data = await callGithubAI(settings.githubToken, model, systemInstruction, prompt);

        return {
            projectName,
            description: data.description,
            structure: data.structure,
            files: data.files
        };

    } else if (settings.activeProvider === 'openrouter') {
        if (!settings.openRouterApiKey) throw new Error("OpenRouter API Key is missing in settings.");
        const model = settings.customModelId || "openai/gpt-3.5-turbo";

        const data = await callOpenRouter(settings.openRouterApiKey, model, systemInstruction, prompt);

        return {
            projectName,
            description: data.description,
            structure: data.structure,
            files: data.files
        };

    } else {
         // Default: Google GenAI
         const apiKey = settings.googleApiKey || defaultApiKey;
         if (!apiKey) throw new Error("No API Key available.");
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-flash-latest', 
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: blueprintSchema,
                },
            });
    
            const text = response.text;
            if (!text) throw new Error("No response from Gemini.");
            const data = cleanAndParseJson(text);
            
            return {
                projectName,
                description: data.description,
                structure: data.structure,
                files: data.files
            };
    
        } catch (error) {
            handleGeminiError(error);
            throw error;
        }
    }
};