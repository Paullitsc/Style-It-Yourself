'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2 } from 'lucide-react' // Added Loader icon

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true) // Default to Login now (Standard UX)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    // OVERLAY: Darker and blurrier for focus
    <div className="fixed inset-0 bg-primary-900/80 backdrop-blur-sm flex items-center justify-center z-[60]">
      
      {/* MODAL CARD: Dark theme, thin border, shadow */}
      <div className="bg-primary-900 p-8 w-full max-w-md relative border border-primary-700 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button: Neutral to White hover */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
        
        {/* HEADER */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Join US'}
          </h2>
        </div>
        
        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-error-500/10 border border-error-500/50 text-error-500 p-3 mb-6 text-xs font-medium text-center uppercase tracking-wide">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleAuth} className="space-y-5">
          
          {/* EMAIL INPUT */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 ml-1">Email</label>
            <input 
              type="email" 
              className="w-full p-4 bg-primary-800 border border-primary-700 text-white focus:outline-none focus:border-accent-500 focus:bg-primary-800/80 transition-all placeholder-primary-600 text-sm"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD INPUT */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 ml-1">Password</label>
            <input 
              type="password" 
              className="w-full p-4 bg-primary-800 border border-primary-700 text-white focus:outline-none focus:border-accent-500 focus:bg-primary-800/80 transition-all placeholder-primary-600 text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* SUBMIT BUTTON: High Contrast White */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black py-4 mt-4 hover:bg-neutral-200 disabled:opacity-50 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin"/>}
            {isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {/* FOOTER SWITCH */}
        <div className="mt-8 pt-6 border-t border-primary-800 text-center">
          <p className="text-neutral-500 text-xs uppercase tracking-wide">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="mt-2 text-white text-xs font-bold uppercase tracking-widest hover:text-accent-500 hover:underline underline-offset-4 transition-all"
          >
            {isLogin ? 'Sign Up Here' : 'Log In Here'}
          </button>
        </div>
      </div>
    </div>
  )
}