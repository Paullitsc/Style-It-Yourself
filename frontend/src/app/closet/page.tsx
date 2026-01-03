'use client'
import ProtectedRoute from "@/components/ProtectedRoute";
import { Shirt, Plus, Search, SlidersHorizontal } from 'lucide-react';

export default function ClosetPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-80px)] w-full max-w-[1920px] mx-auto px-6 md:px-12 py-12">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-primary-800 pb-8">
          <div>
            <h1 className="text-3xl md:text-3xl font-bold uppercase tracking-tighter text-white mb-2">
              My Closet
            </h1>
            <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">
              Total Items: <span className="text-white">0</span>
            </p>
          </div>

          {/* PRIMARY ACTION: Add Item */}
          <button className="group flex items-center justify-center gap-3 bg-white text-black px-6 py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all">
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            Add New Item
          </button>
        </div>

        {/* TOOLBAR (Search & Filter) */}
        {/* This adds the "System" feel even when empty */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          
          {/* SEARCH BAR */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH ITEMS..." 
              className="w-full bg-primary-800 border border-primary-700 text-white text-xs font-medium tracking-wide py-4 pl-12 pr-4 focus:outline-none focus:border-accent-500 transition-colors placeholder-neutral-600"
            />
          </div>

          {/* FILTER BUTTONS (Visual only for now) */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button className="flex items-center gap-2 px-6 py-3 bg-primary-800 border border-primary-700 text-white text-xs font-bold uppercase tracking-wider hover:border-white transition-colors whitespace-nowrap">
              <SlidersHorizontal size={14} />
              Filter
            </button>
            {/* Categories */}
            {['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories'].map((cat, i) => (
              <button 
                key={cat}
                className={`px-6 py-3 border text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  i === 0 
                  ? 'bg-white text-black border-white' // Active State
                  : 'bg-transparent text-neutral-500 border-primary-700 hover:text-white hover:border-primary-500' // Inactive State
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* MAIN CONTENT AREA: Empty State */}
        {/* Designed to look like a "blueprint" area waiting for content */}
        <div className="w-full h-[500px] border border-dashed border-primary-700 bg-primary-800/20 rounded-lg flex flex-col items-center justify-center text-center group hover:bg-primary-800/30 hover:border-primary-600 transition-all cursor-pointer">
          
          <div className="bg-primary-800 p-6 rounded-full mb-6 text-neutral-500 group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-xl">
            <Shirt size={48} strokeWidth={1} />
          </div>
          
          <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
            Your closet is empty
          </h3>
          <p className="text-neutral-500 text-xs uppercase tracking-wide max-w-xs mx-auto mb-8">
            Upload tops, bottoms, and shoes to start building your digital wardrobe.
          </p>
          
          <button className="text-accent-500 text-xs font-bold uppercase tracking-widest hover:text-accent-400 hover:underline underline-offset-4 decoration-1 flex items-center gap-2">
            <Plus size={14} />
            Upload First Item
          </button>

        </div>

      </div>
    </ProtectedRoute>
  )
}