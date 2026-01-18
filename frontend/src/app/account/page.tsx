'use client'
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { User, LogOut } from 'lucide-react';

export default function AccountPage() {
  const { user, signOut } = useAuth();
  
  return (
    <ProtectedRoute>
      {/* FIXED WRAPPER: Matches Closet Page exactly 
        - max-w-[1920px] 
        - px-6 md:px-12 
        - py-12
      */}
      <div className="min-h-[calc(100vh-80px)] w-full max-w-[1920px] mx-auto px-6 md:px-12 py-12 enter-fade">
        
        {/* PAGE HEADER */}
        {/* Same margin and border structure as Closet Page */}
        <div className="mb-12 border-b border-primary-800 pb-8">
          <h1 className="text-3xl md:text-3xl font-bold uppercase tracking-tighter text-white mb-2">
            Account Overview
          </h1>
        </div>
        
        {/* DATA GRID */}
        {/* We constrain the width of the content ONLY, so the header stays aligned left but lines don't stretch too far */}
        <div className="max-w-4xl">
          
          {/* ROW 1: EMAIL */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-8 border-b border-primary-800 items-center group">
            
            {/* LABEL COLUMN */}
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="p-2 bg-primary-800 rounded-full text-neutral-400 group-hover:text-white transition-colors">
                <User size={16} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 transition-colors">
                Email Address
              </span>
            </div>

            {/* VALUE COLUMN */}
            <div className="md:col-span-8">
              <span className="text-lg md:text-xl font-medium text-white tracking-tight">
                {user?.email}
              </span>
            </div>
          </div>

        </div>

      </div>
    </ProtectedRoute>
  )
}
