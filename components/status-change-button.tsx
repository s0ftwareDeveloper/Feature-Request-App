// Update the handleStatusChange function:

const handleStatusChange = async (newStatus: string) => {
  try {
    await api.patch(`/requests/${requestId}/status`, { status: newStatus })
    setStatus(newStatus)
    toast({
      title: "Status updated",
      description: `Request marked as ${newStatus}`,
    })
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to update status",
      variant: "destructive",
    })
  }
}

