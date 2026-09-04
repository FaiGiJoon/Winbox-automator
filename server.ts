import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { registerAgentConnector } from "./server/agent-connector";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for external Hermes Agent / OpenClaw local processes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Register Hermes Agent & Model Context Protocol (MCP) server endpoints
registerAgentConnector(app);

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Gemini script generation post endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { role, task } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Task description is required." });
    }

    const modelName = "gemini-3.5-flash";
    const prompt = `You are a MikroTik RouterOS Expert Agent specializing in the role of: ${role || "Network Architect"}.
Your goal is to help a user learn networking and program their MikroTik router cleanly.

Task: ${task}

Provide your response in a clear JSON structure to assist the Frontend. It MUST fit this JSON format:
{
  "commands": [
    {
      "command": "/ip firewall nat add chain=srcnat out-interface=ether1-wan action=masquerade",
      "explanation": "Enable source NAT (Masquerade) on the WAN interface so inside LAN devices can access the public internet using the router's public IP."
    }
  ],
  "overallSummary": "A brief explanation of how this solution implements the transport layer (e.g. tracking TCP/UDP ports, modifying IP headers) and why it helps a beginner understand the network flow."
}

Do not include any other markdown formatting outside of the raw JSON object itself in your output. Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const text = response.text || "";
    // Clean JSON padding if generated
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch {
      // Fallback if parsing fails
      res.json({
        rawText: text,
        commands: [
          {
            command: text,
            explanation: "Raw script returned from AI model."
          }
        ],
        overallSummary: "Executed raw prompt generation. Please try again with a simpler task description to retrieve an annotated breakdown."
      });
    }

  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Internal server error during script generation." });
  }
});

// Proxy route for local Ollama running on user machine
app.post("/api/ollama", async (req, res) => {
  try {
    const { baseUrl, model, role, task } = req.body;
    const resolvedUrl = baseUrl || "http://localhost:11434";
    const resolvedModel = model || "llama3";

    const prompt = `You are a MikroTik RouterOS Expert Agent specializing in: ${role || "Network Architect"}.
Task: ${task}

Return your response in a clear JSON format:
{
  "commands": [
    {
      "command": "/ip address add address=192.168.88.1/24 interface=ether2",
      "explanation": "Set the IP address on the internal interface ether2."
    }
  ],
  "overallSummary": "Summary of the script."
}
Only output the JSON object. Do not output conversational filler.`;

    const response = await fetch(`${resolvedUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolvedModel,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Ollama failed: ${response.statusText}` });
    }

    const data: any = await response.json();
    const resultText = data.response || "";
    const cleanedText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch {
      res.json({
        commands: [
          {
            command: resultText,
            explanation: "Ollama output (raw)."
          }
        ],
        overallSummary: "Ollama executed successfully."
      });
    }
  } catch (error: any) {
    console.error("Ollama Proxy Error:", error);
    res.status(500).json({ error: `Connection failed to local Ollama server. Ensure it is running and accessible: ${error.message}` });
  }
});

// In-memory state store for live local network adapter scans
let localTelemetry = {
  lastUpdated: null as string | null,
  adapters: [] as any[],
  mikrotikDevices: [] as any[],
  events: [] as string[]
};

// POST endpoint for a local script to report adapter & neighbor information
app.post("/api/local-adapters", (req, res) => {
  const { adapters, mikrotikDevices, events } = req.body;
  
  // Format incoming items nicely and limit history length for events
  const newEvents = events || [];
  const currentEvents = [...newEvents, ...(localTelemetry.events || [])].slice(0, 15);

  localTelemetry = {
    lastUpdated: new Date().toISOString(),
    adapters: adapters || [],
    mikrotikDevices: mikrotikDevices || [],
    events: currentEvents
  };
  
  res.json({ 
    status: "success", 
    message: "Adapter telemetry synchronized", 
    synchronizedAt: localTelemetry.lastUpdated 
  });
});

// GET endpoint for the React frontend to fetch live status
app.get("/api/local-adapters", (req, res) => {
  res.json(localTelemetry);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
