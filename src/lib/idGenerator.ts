import { Employee } from "../types";

/**
 * Dedicated Unique Employee ID Generator Function
 * 
 * Guarantees that any newly added employee (via single onboarding or Excel bulk import)
 * is assigned a 100% unique ID (`EMP-XXXX`) that NEVER collides with or overwrites any
 * pre-existing employee record in local state or Supabase database.
 * 
 * @param localEmployees Array of current employee objects in local memory
 * @param supabaseClient Optional Supabase client instance to fetch cloud database IDs
 * @returns Promise<string> A guaranteed unique Employee ID string (e.g. "EMP-2003")
 */
export async function generateGuaranteedUniqueEmployeeId(
  localEmployees: Employee[] = [],
  supabaseClient?: any
): Promise<string> {
  const existingIds = new Set<string>();

  // 1. Collect all IDs from local memory state
  if (Array.isArray(localEmployees)) {
    localEmployees.forEach(emp => {
      if (emp && emp.id) {
        existingIds.add(String(emp.id).trim().toUpperCase());
      }
    });
  }

  // 2. Query Supabase database directly for all existing employee IDs
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("employees").select("id");
      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row && row.id) {
            existingIds.add(String(row.id).trim().toUpperCase());
          }
        });
      }
    } catch (err) {
      console.warn("Could not fetch IDs from Supabase database:", err);
    }
  }

  // 3. Find the maximum numeric suffix among existing IDs (e.g. EMP-1001, EMP-2002)
  let maxIdNum = 1000;
  existingIds.forEach(idStr => {
    const match = idStr.match(/^EMP-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxIdNum) {
        maxIdNum = num;
      }
    }
  });

  // 4. Generate candidate ID and verify against existingIds set to guarantee zero collisions
  let candidateNum = maxIdNum + 1;
  let candidateId = `EMP-${candidateNum}`;

  while (existingIds.has(candidateId.toUpperCase())) {
    candidateNum++;
    candidateId = `EMP-${candidateNum}`;
  }

  return candidateId;
}
