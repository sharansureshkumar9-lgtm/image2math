import React, { useState, useRef } from 'react';
import { UploadedFile, AppState, ResultItem } from './types';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Button } from './components/Button';
import { convertImageToMarkdown } from './services/geminiService';
import { Sparkles, ArrowRight, Github, Layers, ChevronDown } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [images, setImages] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Progress state: current count, total count, and estimated time remaining (seconds)
  const [progress, setProgress] = useState<{current: number, total: number, etr: number} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleImagesSelected = (newFiles: UploadedFile[]) => {
    setImages(prev => [...prev, ...newFiles]);
    setAppState(AppState.IDLE);
    setErrorMsg(null);
    // Smooth scroll to content if not already there
    if (images.length === 0 && contentRef.current) {
        contentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setResults(prev => prev.filter(res => res.imageId !== id));
  };

  const handleClearAll = () => {
    setImages([]);
    setResults([]);
    setAppState(AppState.IDLE);
    setErrorMsg(null);
    setProgress(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: UploadedFile[] = [];
      const filesArray = Array.from(e.target.files) as File[];
      let processedCount = 0;

      filesArray.forEach(file => {
        if (!file.type.startsWith('image/')) {
          processedCount++;
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          const base64 = result.split(',')[1];
          newFiles.push({
            id: Math.random().toString(36).substring(7) + Date.now(),
            file,
            previewUrl: result,
            base64,
            mimeType: file.type
          });
          processedCount++;
          if (processedCount === filesArray.length) {
            handleImagesSelected(newFiles);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  const processImages = async () => {
    if (images.length === 0) return;

    setAppState(AppState.PROCESSING);
    setErrorMsg(null);
    setResults([]); // Clear previous results
    
    // Initialize progress
    const startTime = Date.now();
    setProgress({ current: 0, total: images.length, etr: 0 });

    let completed = 0;

    try {
      // Process sequentially
      for (const img of images) {
        try {
          const markdown = await convertImageToMarkdown(img.base64, img.mimeType);
          const resultItem: ResultItem = {
            imageId: img.id,
            markdown: markdown
          };
          setResults(prev => [...prev, resultItem]);
        } catch (e) {
          console.error(`Error processing image ${img.id}`, e);
          const errorItem: ResultItem = {
            imageId: img.id,
            markdown: `> **Error processing Page**\n> ${e instanceof Error ? e.message : "Unknown error"}`
          };
          setResults(prev => [...prev, errorItem]);
        }
        
        completed++;
        
        // Calculate ETR
        const now = Date.now();
        const elapsed = now - startTime;
        const avgTimePerItem = elapsed / completed; // ms per item
        const remainingItems = images.length - completed;
        const etrSeconds = Math.ceil((avgTimePerItem * remainingItems) / 1000);

        setProgress({ current: completed, total: images.length, etr: etrSeconds });
      }

      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setErrorMsg(err.message || "Failed to process images. Please try again.");
    } finally {
      setProgress(null);
    }
  };

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-gray-200 font-sans selection:bg-gold-500 selection:text-black">
      
      {/* Navbar - Fixed & Glassmorphism */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 glass-nav border-b border-white/5 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="bg-gradient-to-br from-gold-400 to-gold-600 p-2 rounded-lg text-black shadow-lg shadow-gold-500/20 shrink-0">
               <Sparkles size={20} />
             </div>
             <span className="text-lg sm:text-xl font-serif font-bold text-gray-100 tracking-tight truncate">Gemini <span className="text-gold-500">Math</span> Snip</span>
          </div>
          <div>
            <a href="#" className="text-neutral-400 hover:text-gold-500 transition-colors">
              <Github size={22} />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden shrink-0 py-32">
         {/* Background Image with Overlay */}
         <div className="absolute inset-0 z-0">
            <img 
               src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2940&auto=format&fit=crop" 
               alt="Dark Math Background" 
               className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-neutral-950/80 bg-gradient-to-b from-neutral-950/90 via-neutral-950/70 to-neutral-950"></div>
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
         </div>

         <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs sm:text-sm font-medium backdrop-blur-md mb-2 sm:mb-4">
               <Sparkles size={14} className="mr-2" /> Powered by Gemini Vision AI
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-white leading-tight">
               Extract <span className="text-gold-500 italic">Math</span> from <br/> Images Instantly
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto font-light leading-relaxed">
               Convert complex equations, scientific papers, and tables into clean LaTeX, Markdown, and MathML with the precision of AI.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button onClick={scrollToContent} size="lg" className="min-w-[180px] rounded-full text-base">
                  Get Started
               </Button>
               <Button onClick={() => window.open('https://github.com', '_blank')} variant="secondary" size="lg" className="min-w-[180px] rounded-full text-base border-white/20 text-white hover:bg-white/10 hover:border-white/40">
                  View on GitHub
               </Button>
            </div>
         </div>

         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-neutral-500 hidden sm:block">
            <ChevronDown size={32} />
         </div>
      </header>

      {/* Main Content */}
      <main ref={contentRef} className="flex-1 bg-neutral-950 relative z-10 -mt-20 pt-20 pb-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          
          {/* Controls Section (Top) */}
          <div className="w-full">
            {images.length > 0 && (
              <div className="bg-neutral-900/50 backdrop-blur-sm p-6 rounded-2xl border border-neutral-800 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Actions</span>
                    <Button 
                      onClick={handleClearAll} 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2"
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  {/* Progress */}
                  {appState === AppState.PROCESSING && progress && (
                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-medium text-gold-500 mb-2 uppercase tracking-wide">
                        <span className="flex items-center">Processing... {Math.round((progress.current / progress.total) * 100)}%</span>
                        <span className="text-neutral-500">~{progress.etr}s left</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-700">
                        <div 
                          className="bg-gold-500 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                          style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileInputChange} 
                        className="hidden" 
                        multiple 
                        accept="image/*" 
                      />
                      <Button 
                        onClick={processImages} 
                        disabled={images.length === 0 || appState === AppState.PROCESSING} 
                        isLoading={appState === AppState.PROCESSING}
                        size="lg"
                        className="w-full sm:flex-1"
                      >
                        {appState === AppState.PROCESSING ? 'Processing Files...' : 'Convert Images'}
                      </Button>
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        variant="secondary"
                        size="md"
                        disabled={appState === AppState.PROCESSING}
                        className="w-full sm:flex-1"
                      >
                        Add More Files
                      </Button>
                  </div>
              </div>
            )}
          </div>

          {/* Upload & Results Section (Bottom) */}
          <div className="w-full flex flex-col gap-8">
            
            {/* Uploader Card */}
            <div className="bg-neutral-900/80 backdrop-blur-md rounded-2xl p-1 border border-neutral-800 shadow-2xl">
                <div className="bg-neutral-950/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h2 className="text-xl font-serif font-bold text-white flex items-center">
                          <Layers className="mr-3 text-gold-500" size={24}/>
                          Upload Queue 
                          <span className="ml-3 text-xs font-sans font-medium text-neutral-400 bg-neutral-800 px-2 py-1 rounded-full border border-neutral-700">{images.length}</span>
                      </h2>
                    </div>
                    <ImageUploader 
                      images={images} 
                      onImagesSelected={handleImagesSelected} 
                      onRemoveImage={handleRemoveImage}
                    />
                </div>
            </div>

            {/* Results Section */}
            <div className="min-h-[400px]">
                {results.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                      <ResultDisplay 
                        results={results} 
                        images={images} 
                        onRemoveImage={handleRemoveImage}
                      />
                  </div>
                )}
                
                {results.length === 0 && images.length > 0 && appState !== AppState.PROCESSING && (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                      <div className="w-16 h-16 rounded-full border border-dashed border-neutral-700 flex items-center justify-center mb-4 text-neutral-500">
                        <ArrowRight size={24} />
                      </div>
                      <p className="text-neutral-400 font-light">Uploaded images are ready.</p>
                      <p className="text-neutral-500 text-sm">Click "Convert Images" to start.</p>
                  </div>
                )}
            </div>

          </div>
        </div>
      </main>

      <footer className="bg-neutral-950 border-t border-neutral-900 py-8 px-6 text-center">
         <p className="text-neutral-600 text-sm font-light">
            &copy; {new Date().getFullYear()} Gemini Math Snip. Designed with precision.
         </p>
      </footer>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;