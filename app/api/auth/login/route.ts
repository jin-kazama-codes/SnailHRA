import { NextResponse } from "next/server";
import { loadDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import bcrypt from "bcryptjs";
import { Employee } from "@/src/types";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    let employee: Employee | undefined = undefined;

    // 1. Attempt to fetch from Supabase
    if (supabase) {
      try {
        const queryTimeout = (ms: number) => 
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("Supabase auth timeout")), ms)
          );

        const fetchPromise = supabase
          .from("employees")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        const { data, error } = await Promise.race([fetchPromise, queryTimeout(3000)]);

        if (error) {
          console.warn("Supabase auth fetch error:", error.message);
        } else if (data) {
          const bankDetailsFromRow = typeof data.bank_details === "string" ? JSON.parse(data.bank_details) : data.bank_details;
          const salaryFromRow = typeof data.salary === "string" ? JSON.parse(data.salary) : data.salary;
          const emergencyFromRow = typeof data.emergency_contact === "string" ? JSON.parse(data.emergency_contact) : data.emergency_contact;

          employee = {
            id: data.id,
            fullName: data.full_name || data.fullName || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "employee",
            designationId: data.designation_id || data.designationId || "des-4",
            department: data.department || "Loans",
            branch: data.branch || loadDatabase().employees?.find((e: any) => e.id === data.id)?.branch || "Mumbai Branch",
            joiningDate: data.joining_date || data.joiningDate || "2024-03-15",
            status: data.status || "Active",
            salary: {
              basic: Number(data.salary_basic ?? salaryFromRow?.basic ?? 45000),
              hra: Number(data.salary_hra ?? salaryFromRow?.hra ?? 18000),
              allowances: Number(data.salary_allowances ?? salaryFromRow?.allowances ?? 10000),
              pfDeduction: Number(data.salary_pf_deduction ?? salaryFromRow?.pfDeduction ?? 3200)
            },
            bankDetails: {
              accountNumber: String(data.bank_account_number ?? bankDetailsFromRow?.accountNumber ?? ""),
              bankName: String(data.bank_name ?? bankDetailsFromRow?.bankName ?? "State Bank of India"),
              ifsc: String(data.bank_ifsc ?? bankDetailsFromRow?.ifsc ?? "")
            },
            address: data.address || "",
            emergencyContact: {
              name: data.emergency_contact_name || emergencyFromRow?.name || "",
              relation: data.emergency_contact_relation || emergencyFromRow?.relation || "",
              phone: data.emergency_contact_phone || emergencyFromRow?.phone || ""
            },
            documents: typeof data.documents === "string" ? JSON.parse(data.documents) : (data.documents || []),
            onboardingTasks: typeof data.onboarding_tasks === "string" ? JSON.parse(data.onboarding_tasks) : (data.onboardingTasks || []),
            avatarUrl: data.avatar_url || data.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop",
            bio: data.bio || "",
            password: data.password || ""
          };
        }
      } catch (sbErr) {
        console.warn("Supabase auth exception:", sbErr);
      }
    }

    // 2. Fallback to local database if not found via Supabase
    if (!employee) {
      const db = loadDatabase();
      employee = db.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    }

    if (!employee) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const storedHash = employee.password;
    if (!storedHash) {
      // Fallback for profiles created prior to hashing or unseeded profiles
      const isMatch = password === "Nawaz123#";
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    } else {
      const isMatch = bcrypt.compareSync(password, storedHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
    }

    // Success: Return user details without password for safety
    const { password: _, ...userWithoutPassword } = employee;
    return NextResponse.json({ success: true, employee: userWithoutPassword });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
