import axios from "axios";
import { ERP_API_KEY, ERP_API_SECRET, ERP_URL_RESOURCE } from "@env";

export type LeaveAllocation = {
  name: string;
  employee: string;
  leave_type: string;
  new_leaves_allocated: number;
  from_date: string;
  to_date: string;
  leaves_allocated: number;
};

// Function to fetch leave allocations for a given employee
export const fetchLeaveAllocations = async (employeeId: string): Promise<LeaveAllocation[]> => {
  try {
    const response = await axios.get(
      `${ERP_URL_RESOURCE}/Leave%20Allocation`,
      {
        params: {
          filters: JSON.stringify([
            ["Leave Allocation", "employee", "=", employeeId]
          ]),
          fields: JSON.stringify([
            "name",
            "employee",
            "leave_type",
            "new_leaves_allocated",
            "from_date",
            "to_date",
            "leaves_allocated"
          ])
        },
        headers: {
          Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`
        }
      }
    );

    // Log the full response
    console.log("Full Leave Allocation Response:", response);

    // Log only the data array
    console.log("Leave Allocations Data:", response.data.data);

    const allocations = response.data.data as LeaveAllocation[];
    return allocations;
  } catch (error: any) {
    console.error("Error fetching leave allocations:", error.response?.data || error.message);
    throw error;
  }
};
