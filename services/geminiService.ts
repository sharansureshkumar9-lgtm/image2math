import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const convertImageToMarkdown = async (
  base64Data: string, 
  mimeType: string
): Promise<string> => {
  const systemInstruction = `You are an advanced Optical Character Recognition (OCR) engine specialized in mathematics, scientific papers, and technical documents.
  
  Your task is to convert the provided image into a clean, formatted Markdown document.
  
  Strict Guidelines:
  1. **Mathematics:** Identify all mathematical expressions. Convert them to LaTeX.
     - Use single dollar signs ($...$) for inline math.
     - Use double dollar signs ($$...$$) for block-level equations (displayed equations).
     - **Multi-line Equations:** If an equation spans multiple lines (e.g., a derivation, system of equations, or split long equation), **you MUST use a SINGLE LaTeX block** with \`\\begin{aligned} ... \\end{aligned}\` inside the \`$$...$$\`.
       - Use \`\\\\\` to separate lines inside the aligned environment.
       - Use \`&=\` to align equals signs.
       - **Do not** create separate \`$$...$$\` blocks for consecutive lines of the same mathematical derivation.
     - **Text in Math:** If a mathematical expression contains words, phrases, or units, enclose the ENTIRE phrase in \\text{...}. 
       - Example: $\\text{Utilization} = \\frac{\\text{12 calls}}{\\text{15 calls}}$
     - **Bold:** Use \\mathbf{...} for bold numbers/symbols and \\textbf{...} for bold text inside math mode.
  2. **Layout:** Preserve the visual structure.
     - For non-math text, preserve line breaks.
     - For math, prioritize the logical grouping (aligned blocks) over simple line breaks.
  3. **Tables:** If the image contains a table, transcribe it into a Markdown table structure.
  4. **Structure:** Use appropriate Markdown headers (#, ##) if the image clearly indicates section titles.
  5. **No Conversational Text:** Do NOT include phrases like "Here is the markdown", "I have converted...", or code block delimiters (\`\`\`markdown). Just output the raw Markdown content directly.
  6. **Accuracy:** Pay close attention to subscripts, superscripts, greek letters, and complex layouts like matrices or cases.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Convert this image to Markdown/LaTeX."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Low temperature for high deterministic accuracy
      }
    });

    if (!response.text) {
      throw new Error("No text returned from the model.");
    }

    // Clean up potential code block markers if the model ignores the instruction
    let cleanText = response.text.trim();
    if (cleanText.startsWith('```markdown')) {
      cleanText = cleanText.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return cleanText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};