'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Modal, TextInput } from '@/components/ui'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault()
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLogin ? 'Welcome Back' : 'Join Us'}
      size="sm"
    >
      <div className="space-y-[var(--space-6)]">
        {error && (
          <div
            className="rounded-[var(--radius-md)] border border-error-500/40 bg-error-500/10 px-[var(--space-3)] py-[var(--space-3)] text-xs font-medium uppercase tracking-wide text-error-400"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-[var(--space-4)]">
          <TextInput
            type="email"
            label="Email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
          />

          <TextInput
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <Button type="submit" fullWidth loading={loading}>
            {isLogin ? 'Log In' : 'Create Account'}
          </Button>
        </form>

        <div className="border-t border-primary-800 pt-[var(--space-4)] text-center">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-[var(--space-2)]"
            onClick={() => setIsLogin((value) => !value)}
          >
            {isLogin ? 'Sign Up Here' : 'Log In Here'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
