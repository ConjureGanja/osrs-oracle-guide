import React, { useState, useRef } from 'react';
import { AppMode } from '../types';
import { generateOsrsImage, editOsrsImage, generateOsrsVideo, analyzeOsrsContent } from '../services/geminiService';

interface ToolsPanelProps {
    mode: AppMode;
}

export default function ToolsPanel({ mode }: ToolsPanelProps) {
    const [prompt, setPrompt] = useState('');
    const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [generatedMedia, setGeneratedMedia] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultText, setResultText] = useState('');
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setGeneratedMedia(null);
        setResultText('');
        setError('');
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            resetState();
        }
    };

    const checkApiKey = async () => {
        if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
            await window.aistudio.openSelectKey();
            return false;
        }
        return true;
    };

    const handleAction = async () => {
        setLoading(true);
        setError('');
        setGeneratedMedia(null);
        setResultText('');

        try {
            if (mode === AppMode.IMAGE_GEN) {
                if (!await checkApiKey()) {
                    setLoading(false);
                    return;
                }
                const result = await generateOsrsImage(prompt, imageSize);
                setGeneratedMedia(result);
            } 
            else if (mode === AppMode.IMAGE_EDIT) {
                if (!selectedFile) throw new Error("Please upload an image to edit.");
                // Convert current file to base64
                 const base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                    reader.readAsDataURL(selectedFile);
                });
                const result = await editOsrsImage(base64Data, prompt);
                setGeneratedMedia(result);
            }
            else if (mode === AppMode.VIDEO_GEN) {
                if (!await checkApiKey()) {
                    setLoading(false);
                    return;
                }

                let imgBase64: string | undefined = undefined;
                if (selectedFile) {
                    imgBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                        reader.readAsDataURL(selectedFile);
                    });
                }
                const result = await generateOsrsVideo(prompt, aspectRatio, imgBase64);
                setGeneratedMedia(result);
            }
            else if (mode === AppMode.ANALYZE) {
                if (!selectedFile) throw new Error("Please upload a file to analyze.");
                const isVideo = selectedFile.type.startsWith('video/');
                const text = await analyzeOsrsContent(selectedFile, prompt || "Describe this in OSRS terms.", isVideo);
                setResultText(text);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const renderControls = () => {
        switch (mode) {
            case AppMode.IMAGE_GEN:
                return (
                    <div className="flex flex-col gap-2">
                         <div className="text-xs text-orange-400">Requires Paid API Key (Gemini 3 Pro Image)</div>
                        <div className="flex gap-4 items-center">
                            <select 
                                value={imageSize}
                                onChange={(e) => setImageSize(e.target.value as any)}
                                className="bg-[#1e1e1e] border border-[#5d5244] p-2 text-sm"
                            >
                                <option value="1K">1K (Standard)</option>
                                <option value="2K">2K (High)</option>
                                <option value="4K">4K (Ultra)</option>
                            </select>
                        </div>
                    </div>
                );
            case AppMode.VIDEO_GEN:
                return (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs text-orange-400">Requires Paid API Key (Veo)</div>
                        <div className="flex gap-2">
                            <label className="flex items-center gap-2">
                                <input type="radio" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} />
                                Landscape (16:9)
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} />
                                Portrait (9:16)
                            </label>
                        </div>
                        <input type="file" onChange={handleFileChange} accept="image/*" className="text-sm" />
                        <span className="text-xs text-gray-400">Optional: Start with an image</span>
                    </div>
                );
            case AppMode.IMAGE_EDIT:
            case AppMode.ANALYZE:
                return (
                    <div className="flex flex-col gap-2">
                        <input 
                            type="file" 
                            onChange={handleFileChange} 
                            accept={mode === AppMode.ANALYZE ? "image/*,video/*" : "image/*"}
                            className="text-sm"
                        />
                         {mode === AppMode.ANALYZE && <span className="text-xs text-gray-400">Supports Images & Video</span>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col p-6 bg-[#2b2b2b] text-[#d1d1d1] overflow-y-auto">
            <h2 className="text-2xl text-[#ff981f] mb-4 border-b border-[#5d5244] pb-2">
                {mode === AppMode.IMAGE_GEN && "Concept Art Generator"}
                {mode === AppMode.IMAGE_EDIT && "Magic Image Editor"}
                {mode === AppMode.VIDEO_GEN && "Veo Animation Studio"}
                {mode === AppMode.ANALYZE && "Crystal of Analyzing"}
            </h2>

            <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
                {/* Inputs */}
                <div className="osrs-panel p-4 flex flex-col gap-4">
                    {renderControls()}
                    
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={
                            mode === AppMode.IMAGE_GEN ? "A drawing of a dragon platebody..." :
                            mode === AppMode.IMAGE_EDIT ? "Add a retro filter, make it look 8-bit..." :
                            mode === AppMode.VIDEO_GEN ? "Animate the character running..." :
                            "What item is this? What stats does it have?"
                        }
                        className="w-full h-24 bg-[#1e1e1e] border border-[#3e3529] p-2 resize-none focus:border-[#ff981f] outline-none"
                    />

                    <button 
                        onClick={handleAction}
                        disabled={loading}
                        className="osrs-button py-3 text-lg font-bold"
                    >
                        {loading ? 'Casting Spell...' : 'Generate / Analyze'}
                    </button>
                    
                    {error && <div className="text-red-500 bg-red-900/20 p-2 border border-red-800 text-sm">{error}</div>}
                </div>

                {/* Output Display */}
                {(generatedMedia || resultText) && (
                    <div className="osrs-panel p-4 flex flex-col items-center">
                        <h3 className="text-[#ffff00] mb-2 w-full text-left">Result:</h3>
                        
                        {generatedMedia && (
                            mode === AppMode.VIDEO_GEN ? (
                                <video src={generatedMedia} controls autoPlay loop className="max-w-full max-h-[500px] border border-[#5d5244]" />
                            ) : (
                                <img src={generatedMedia} alt="Generated" className="max-w-full max-h-[500px] border border-[#5d5244]" />
                            )
                        )}

                        {resultText && (
                            <div className="w-full bg-[#1e1e1e] p-3 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                {resultText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}