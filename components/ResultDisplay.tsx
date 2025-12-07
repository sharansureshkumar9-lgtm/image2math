import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Code, Eye, FileText, FunctionSquare, Layout, Download, FileArchive, Columns, Rows, ZoomIn, ZoomOut, Sparkles, Trash2, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { ResultItem, UploadedFile } from '../types';
import JSZip from 'jszip';

interface ResultDisplayProps {
  results: ResultItem[];
  images: UploadedFile[];
  onRemoveImage: (id: string) => void;
}

// Utility to download a blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Utility to extract LaTeX and convert to clean MathML
const generateMathML = (markdown: string): string => {
  if (!(window as any).katex) return "KaTeX library not found.";

  const latexRegex = /\$\$([\s\S]*?)\$\$|\$((?!\$)[\s\S]*?)\$/g;
  let match;
  let output = "";
  let count = 0;

  while ((match = latexRegex.exec(markdown)) !== null) {
    const latex = match[1] || match[2];
    const isBlock = !!match[1];
    try {
      const rawRender = (window as any).katex.renderToString(latex, {
        output: 'mathml',
        throwOnError: false,
        displayMode: isBlock,
        strict: false
      });
      
      const mathMatch = rawRender.match(/<math[\s\S]*?<\/math>/);
      if (mathMatch) {
        // Parse the MathML string into a DOM structure for manipulation
        const parser = new DOMParser();
        const doc = parser.parseFromString(mathMatch[0], "text/xml");
        const mathRoot = doc.documentElement;

        // 1. Remove <annotation> tags (contains the raw LaTeX)
        const annotations = mathRoot.getElementsByTagName("annotation");
        while(annotations.length > 0) {
            annotations[0].parentNode?.removeChild(annotations[0]);
        }

        // 2. Unwrap <semantics> tags (promote children)
        const semantics = mathRoot.getElementsByTagName("semantics");
        while(semantics.length > 0) {
            const elem = semantics[0];
            const parent = elem.parentNode;
            if (parent) {
                while(elem.firstChild) parent.insertBefore(elem.firstChild, elem);
                parent.removeChild(elem);
            }
        }

        // 3. Unwrap top-level <mrow> if strictly wrapping the whole content
        // This makes the structure flatter, e.g., <math><mtext>...</mtext><mo>=</mo>...</math>
        if (mathRoot.children.length === 1 && mathRoot.children[0].tagName === 'mrow') {
            const mrow = mathRoot.children[0];
            while (mrow.firstChild) {
                mathRoot.insertBefore(mrow.firstChild, mrow);
            }
            mathRoot.removeChild(mrow);
        }

        // Serialize back to string
        const serializer = new XMLSerializer();
        let cleanMathML = serializer.serializeToString(mathRoot);

        if (count > 0) output += "\n\n";
        output += cleanMathML;
        count++;
      }
    } catch (e) {
      console.warn("Error converting equation to MathML", e);
    }
  }

  return output || "No mathematical formulas detected.";
};

// Internal Component: Image Panel
const ImagePanel = ({ 
  image, 
  imageViewMode, 
  setImageViewMode, 
  compact = false 
}: { 
  image: UploadedFile, 
  imageViewMode: 'fit' | 'original', 
  setImageViewMode: (m: 'fit' | 'original') => void,
  compact?: boolean
}) => (
  <div className="flex flex-col w-full h-full relative">
     <div className={`w-full flex justify-between items-center text-xs text-neutral-500 font-medium uppercase tracking-wider shrink-0 ${compact ? 'px-4 py-2 bg-neutral-950/80 border-b border-neutral-800' : 'px-4 pt-4 md:px-6 md:pt-6 mb-2'}`}>
        <span>Original Image</span>
        <div className="flex bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
            <button 
              onClick={() => setImageViewMode('fit')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center ${imageViewMode === 'fit' ? 'bg-neutral-700 shadow-sm text-gold-500' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Fit to screen"
            >
              <ZoomIn size={12} className="mr-1" /> FIT
            </button>
            <button 
              onClick={() => setImageViewMode('original')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center ${imageViewMode === 'original' ? 'bg-neutral-700 shadow-sm text-gold-500' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Original Size (1:1)"
            >
              <ZoomOut size={12} className="mr-1" /> 1:1
            </button>
        </div>
     </div>
     <div className={`flex-1 overflow-auto bg-neutral-900 flex relative min-h-0 ${compact ? '' : 'mx-4 mb-4 md:mx-6 md:mb-6 rounded-lg border border-neutral-800'}`}>
         {image ? (
           <img 
             src={image.previewUrl} 
             alt="Input" 
             className={`
               shadow-sm transition-all duration-200
               ${imageViewMode === 'fit' 
                 ? 'w-full h-full object-contain' 
                 : 'max-w-none m-auto' 
               }
             `}
           />
         ) : (
           <span className="m-auto text-neutral-600 text-sm">Image not found</span>
         )}
     </div>
  </div>
);

// Internal Component: Preview Panel
const PreviewPanel = ({ result, compact = false }: { result: ResultItem, compact?: boolean }) => (
  <div className={`overflow-auto h-full w-full flex items-center justify-center bg-neutral-900 ${compact ? 'p-4' : 'p-8'}`}>
    <div className={`prose prose-invert max-w-none text-center w-full prose-headings:font-serif prose-headings:text-gold-500 prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-neutral-800 leading-relaxed
      ${compact 
        ? 'prose-lg [&_.katex-display]:my-4 [&_.katex-display]:text-2xl [&_.katex]:text-xl' 
        : 'prose-xl md:prose-2xl [&_.katex-display]:my-6 [&_.katex-display]:text-3xl md:[&_.katex-display]:text-5xl [&_.katex]:text-2xl md:[&_.katex]:text-4xl'
      }
    `}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {result.markdown}
      </ReactMarkdown>
    </div>
  </div>
);

const SingleResultView: React.FC<{ result?: ResultItem; image: UploadedFile; index: number; onRemove: () => void }> = ({ result, image, index, onRemove }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'preview' | 'comparison' | 'source' | 'mathml'>('comparison');
  const [imageViewMode, setImageViewMode] = useState<'fit' | 'original'>('original');
  const [copied, setCopied] = useState(false);
  const [mathmlContent, setMathmlContent] = useState<string | null>(null);

  // Reset MathML content if result changes (e.g. re-processed)
  useEffect(() => {
    if (!result) {
      setMathmlContent(null);
    }
  }, [result]);

  // Generate MathML when tab is active and content is null
  useEffect(() => {
    if (result && activeTab === 'mathml' && mathmlContent === null) {
      setMathmlContent(generateMathML(result.markdown));
    }
  }, [activeTab, result, mathmlContent]);

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = (activeTab === 'mathml' && mathmlContent !== null) ? mathmlContent : result.markdown;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    
    const baseName = image.file.name.replace(/\.[^/.]+$/, "");

    if (activeTab === 'mathml') {
        const content = mathmlContent !== null ? mathmlContent : generateMathML(result.markdown);
        const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
        downloadBlob(blob, `${baseName}.xml`);
    } else {
        const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, `${baseName}.md`);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => result && setActiveTab(id)}
      disabled={!result}
      className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
        activeTab === id 
          ? 'bg-neutral-800 text-gold-500 shadow-sm border border-gold-500/30' 
          : !result 
            ? 'text-neutral-700 cursor-not-allowed'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-gray-200'
      }`}
    >
      <Icon size={16} className="mr-2" />
      {label}
    </button>
  );

  return (
    <div className="bg-neutral-900/50 rounded-xl shadow-2xl border border-neutral-800 overflow-hidden mb-8 flex flex-col backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80">
        <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar mask-gradient-right">
          <span className="text-xs font-bold text-gold-500 uppercase tracking-widest mr-2 hidden sm:inline-block font-serif">
            {image.file.name}
          </span>
          <div className="flex bg-neutral-950 p-1 rounded-lg space-x-1 border border-neutral-800">
            <TabButton id="comparison" label="Compare" icon={Rows} />
            <TabButton id="image" label="Input Image" icon={ImageIcon} />
            <TabButton id="preview" label="Preview" icon={Eye} />
            <TabButton id="source" label="LaTeX" icon={Code} />
            <TabButton id="mathml" label="MathML" icon={FunctionSquare} />
          </div>
        </div>
        <div className="flex items-center space-x-2 pl-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDownload} 
            title={activeTab === 'mathml' ? "Download XML" : "Download Markdown"}
            icon={<Download size={16} />} 
            disabled={!result}
          >
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy} 
            icon={copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            disabled={!result}
          >
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <div className="w-px h-4 bg-neutral-700 mx-1"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-neutral-500 hover:text-red-400 hover:bg-red-900/20"
            title="Remove item"
            icon={<Trash2 size={16} />}
          >
          </Button>
        </div>
      </div>

      {/* Editor Area - Fixed min-height for all tabs */}
      <div className="flex-1 overflow-visible relative min-h-[75vh] bg-neutral-900 flex flex-col">
        {activeTab === 'image' && (
           <div className="flex flex-col w-full h-full min-h-[inherit]">
              <ImagePanel image={image} imageViewMode={imageViewMode} setImageViewMode={setImageViewMode} />
           </div>
        )}

        {activeTab === 'comparison' && result && (
          <div className="flex flex-col h-full min-h-[inherit]">
            <div className="flex-1 h-[50%] min-h-[35vh] border-b border-neutral-800 relative">
               <ImagePanel 
                 image={image} 
                 imageViewMode={imageViewMode} 
                 setImageViewMode={setImageViewMode} 
                 compact={true} 
               />
            </div>
            <div className="flex-1 h-[50%] min-h-[35vh] relative bg-neutral-900">
               <PreviewPanel result={result} compact={true} />
            </div>
          </div>
        )}

        {activeTab === 'preview' && result && (
          <div className="h-full min-h-[inherit] relative">
             <PreviewPanel result={result} />
          </div>
        )}

        {activeTab === 'source' && result && (
          <textarea
            readOnly
            value={result.markdown}
            className="w-full h-full min-h-[inherit] resize-none font-mono text-sm text-gray-300 bg-neutral-950 p-6 focus:outline-none"
          />
        )}

        {activeTab === 'mathml' && result && (
           <div className="h-full min-h-[inherit] flex flex-col p-6 bg-neutral-900">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">MathML Output (Editable)</p>
                <button 
                  onClick={() => setMathmlContent(generateMathML(result.markdown))}
                  className="flex items-center text-[10px] text-gold-500 hover:text-gold-400 uppercase font-bold tracking-wider transition-colors"
                >
                  <RotateCcw size={12} className="mr-1" /> Reset
                </button>
              </div>
              <textarea
                value={mathmlContent || ''}
                onChange={(e) => setMathmlContent(e.target.value)}
                className="flex-1 w-full resize-none font-mono text-sm text-gold-500/90 bg-neutral-950 p-4 rounded-lg border border-neutral-800 focus:outline-none focus:border-gold-500/50 shadow-inner"
                spellCheck={false}
              />
           </div>
        )}
      </div>
    </div>
  );
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ results, images, onRemoveImage }) => {
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadAll = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      const usedNames: Record<string, number> = {};

      results.forEach((result) => {
        const image = images.find(img => img.id === result.imageId);
        let baseName = "page";
        
        if (image) {
          baseName = image.file.name.replace(/\.[^/.]+$/, "");
        }

        if (usedNames[baseName]) {
          usedNames[baseName]++;
          baseName = `${baseName}_${usedNames[baseName]}`;
        } else {
          usedNames[baseName] = 1;
        }

        const mathmlContent = generateMathML(result.markdown);
        zip.file(`${baseName}.xml`, mathmlContent);
      });

      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "gemini-mathml-results.zip");
    } catch (error) {
      console.error("Failed to create zip:", error);
      alert("Failed to create zip file.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-auto bg-transparent">
       {/* Header */}
       <div className="flex items-center justify-between px-2 py-4">
         <div className="flex items-center space-x-2">
            <Layout className="text-gold-500" size={20} />
            <span className="font-serif font-bold text-gray-200 text-xl tracking-wide">Results Comparison</span>
         </div>
         <div className="flex items-center space-x-3">
            <span className="text-sm text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800 hidden sm:inline-block">
              {results.length} items
            </span>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleDownloadAll} 
              isLoading={isZipping}
              disabled={results.length === 0}
              icon={<FileArchive size={16} />}
            >
              Download MathML (ZIP)
            </Button>
         </div>
       </div>

       {/* List of Results */}
       <div className="flex-1 flex flex-col gap-8 pb-10 custom-scrollbar">
         {images.map((image, index) => {
           const result = results.find(r => r.imageId === image.id);
           return (
             <SingleResultView 
               key={image.id} 
               result={result} 
               image={image} 
               index={index} 
               onRemove={() => onRemoveImage(image.id)}
             />
           );
         })}
       </div>
    </div>
  );
};