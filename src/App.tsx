import { Route, Routes } from 'react-router-dom'
import { SetupNotice } from '@/components/SetupNotice'
import { Toaster } from '@/components/ui/sonner'
import { supabaseConfigured } from '@/lib/supabase'
import GroupPage from '@/pages/Group'
import Home from '@/pages/Home'
import Demo from '@/pages/Demo'

export default function App() {
  return (
    <>
      {import.meta.env.DEV && location.pathname === '/demo' ? (
        <Demo />
      ) : supabaseConfigured ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/g/:id" element={<GroupPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      ) : (
        <SetupNotice />
      )}
      <Toaster position="top-center" />
    </>
  )
}
