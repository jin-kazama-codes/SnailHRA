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
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        if (error) {
          console.warn("Supabase auth fetch error:", error.message);
        } else if (data) {
          employee = {
            id: data.id,
            fullName: data.full_name || data.fullName || "",
            email: data.email || "",
            phone: data.phone || "",
            role: data.role || "employee",
            designationId: data.designation_id || data.designationId || "des-4",
            department: data.department || "Loans",
            branch: data.branch || "Mumbai Branch",
            joiningDate: data.joining_date || data.joiningDate || "2024-03-15",
            status: data.status || "Active",
            salary: typeof data.salary === "string" ? JSON.parse(data.salary) : (data.salary || { basic: 45000, hra: 18000, allowances: 10000, pfDeduction: 3200 }),
            bankDetails: typeof data.bank_details === "string" ? JSON.parse(data.bank_details) : (data.bankDetails || { accountNumber: "", bankName: "SBI", ifsc: "" }),
            address: data.address || "",
            emergencyContact: typeof data.emergency_contact === "string" ? JSON.parse(data.emergency_contact) : (data.emergencyContact || { name: "", relation: "", phone: "" }),
            documents: typeof data.documents === "string" ? JSON.parse(data.documents) : (data.documents || []),
            onboardingTasks: typeof data.onboarding_tasks === "string" ? JSON.parse(data.onboarding_tasks) : (data.onboardingTasks || []),
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
