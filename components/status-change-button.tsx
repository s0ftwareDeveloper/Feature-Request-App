"use client"; // Mark as a Client Component

import React from 'react'; // Import React
import api from '@/lib/axios'; // Import your API instance
import { toast } from "@/components/ui/use-toast"; // Import the toast function
import { Button } from "@/components/ui/button"; // Assuming you use a Shadcn/ui button
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Assuming a dropdown for status options

// Define the props the component expects
interface StatusChangeButtonProps {
  requestId: string;
  currentStatus: string;
  // Assuming setStatus is a function passed from the parent to update state
  setStatus: (newStatus: string) => void;
  // Optional: Define possible statuses if you want to restrict them
  possibleStatuses?: string[];
}

export function StatusChangeButton({
  requestId,
  currentStatus,
  setStatus,
  possibleStatuses = ['Pending', 'InProgress', 'Completed', 'Rejected'] // Default statuses
}: StatusChangeButtonProps) {

  const handleStatusChange = async (newStatus: string) => {
    // Prevent updating if the status is the same
    if (newStatus === currentStatus) {
        toast({
            title: "No Change",
            description: "Status is already set to " + newStatus,
        });
        return;
    }

    try {
      // Use the passed requestId and the newStatus
      await api.patch(`/api/requests/${requestId}/status`, { status: newStatus }); // Corrected API path assumption
      setStatus(newStatus); // Call the function passed via props
      toast({
        title: "Status updated",
        description: `Request marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Failed to update status:", error); // Log the actual error
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter out the current status from the options to be shown
  const availableStatuses = possibleStatuses.filter(status => status !== currentStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* You can customize this button appearance */}
        <Button variant="outline" size="sm">Change Status</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((statusOption) => (
          <DropdownMenuItem
            key={statusOption}
            onClick={() => handleStatusChange(statusOption)}
            className="cursor-pointer"
          >
            Mark as {statusOption}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

