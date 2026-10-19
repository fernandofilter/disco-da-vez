import { Route, Routes } from 'react-router-dom'
import { SetupNotice } from '@/components/SetupNotice'
import { Toaster } from '@/components/ui/sonner'
import { supabaseConfigured } from '@/lib/supabase'
import GroupPage from '@/pages/Group'
import GroupHistoryPage from '@/pages/History'
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
          <Route path="/g/:id/historico" element={<GroupHistoryPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      ) : (
        <SetupNotice />
      )}
      <Toaster position="top-center" />
    </>
  )
}
