import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { GroupView } from '@/components/GroupView'
import { JoinForm } from '@/components/JoinForm'
import { Skeleton } from '@/components/ui/skeleton'
import { useGroup } from '@/hooks/useGroup'
import { rememberGroup } from '@/lib/groups'

export default function GroupPage() {
  const { id = '' } = useParams()
  const { state, refresh } = useGroup(id)
  const name = state.status === 'ready' ? state.data.group.name : null

  useEffect(() => {
    if (name) rememberGroup(id, name)
  }, [id, name])

  if (state.status === 'loading') return <Skeleton className="mx-auto mt-24 h-64 max-w-md" />
  if (state.status === 'error') return <p className="mt-24 text-center text-destructive">{state.message}</p>
  if (state.status === 'outsider') return <JoinForm gid={id} onJoined={refresh} />
  return <GroupView data={state.data} refresh={refresh} />
}
