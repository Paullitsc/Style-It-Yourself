'use client'
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useState, useRef } from "react";
import AuthModal from "@/components/AuthModal";
import { ArrowRight, Upload, Sparkles } from 'lucide-react'; 
import { useRouter } from "next/navigation";

export default function Home() {
  const { user } = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      router.push('/style');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      
      <section className="flex-1 grid grid-cols-1 md:grid-cols-2 items-center max-w-[1920px] mx-auto px-6 md:px-12 gap-12 md:gap-24 py-12 w-full">
        
        {/* LEFT COLUMN: Centered & Minimalist */}
        <div className="flex flex-col justify-center items-center text-center space-y-10 h-full">
          <div className="space-y-6 flex flex-col items-center">
            
            {/* HEADLINE: White + Muted Grey (Luxury contrast) */}
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-white leading-[0.9]">
              STYLE IT <br/>
              {/* Changed from Gold to Neutral-700 for subtle elegance */}
              <span className="text-neutral-700">YOURSELF</span>
            </h1>
            
            <p className="text-xl text-neutral-400 font-light max-w-lg leading-relaxed">
              Be your own stylist with this tool to level up your wardrobe and refine your personal brand.
            </p>

            {/* GOLD ACCENT: Only used here for the "Premium" warning */}
            {!user && (
              <div className="flex items-center gap-2 text-sm font-medium text-accent-700 uppercase tracking-widest">
                <Sparkles size={14} />
                <span>Login required for AI Try-On</span>
              </div>
            )}
          </div>

          {/* CTA BUTTON */}
          <div className="w-full flex justify-center pt-2">
            {user ? (
              <Link 
                href="/closet"
                className="group flex items-center justify-between gap-6 px-8 py-5 bg-white text-black hover:bg-neutral-200 transition-all text-sm font-bold uppercase tracking-widest min-w-[240px]"
              >
                Go to My Closet
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="group flex items-center justify-between gap-6 px-8 py-5 bg-white text-black hover:bg-neutral-200 transition-all text-sm font-bold uppercase tracking-widest min-w-[240px]"
              >
                Create Account
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Upload Zone */}
        <div 
          onClick={triggerFileInput}
          className="relative h-[600px] w-full bg-primary-800/20 rounded-xl border border-dashed border-primary-700 hover:border-accent-500/50 hover:bg-primary-800/40 transition-all duration-500 cursor-pointer group overflow-hidden"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleFileUpload}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 group-hover:text-white transition-colors p-8 text-center">
            
            {/* Icon Circle */}
            <div className="bg-primary-800 p-8 rounded-full mb-8 shadow-2xl group-hover:scale-105 transition-transform duration-500 border border-primary-700 group-hover:border-accent-500/30">
              <Upload size={40} strokeWidth={1} className="text-neutral-400 group-hover:text-accent-500 transition-colors duration-300"/>
            </div>
            
            <h3 className="text-2xl font-bold uppercase tracking-widest mb-3 text-white group-hover:text-accent-100 transition-colors">
              Start Styling
            </h3>
            <p className="text-sm text-neutral-500 uppercase tracking-wide mb-8 group-hover:text-neutral-400 transition-colors">
              Drop an image here or click to upload
            </p>
            
            {/* Badge */}
            { !user && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 rounded-full text-[10px] font-bold uppercase tracking-wider text-neutral-400 border border-primary-700 group-hover:border-accent-500/30 group-hover:text-accent-500 transition-all">
                <Sparkles size={12} />
                Try without account
              </div>
            )}
          </div>
        </div>

      </section>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}