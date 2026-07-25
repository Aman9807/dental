import AdminPageSkeleton from '@/components/AdminSkeleton'

// Shown INSTANTLY while Appointments server data loads
export default function AppointmentsLoading() {
  return <AdminPageSkeleton statCards={4} tableRows={7} showTabs={true} />
}
