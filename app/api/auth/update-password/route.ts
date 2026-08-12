import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabase";
import bcrypt from "bcryptjs";
import { Employee } from "@/src/types";

export async function POST(request: Request) {
  try {
    const { employeeId, oldPassword, newPassword, isAdminReset } = await request.json();

    if (!employeeId || !newPassword) {
      return NextResponse.json(
        { error: "Employee ID and new password are required." },
        { status: 400 }
      );
    }

    if (!isAdminReset && !oldPassword) {
      return NextResponse.json(
        { error: "Old password is required for personal password update." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const db = loadDatabase();
    if (!db.employees) db.employees = [];

    // Find employee locally
    let employee = db.employees.find((e: Employee) => e.id === employeeId);

    // Also check Supabase if available
    let supabaseRecord: any = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("id", employeeId)
          .maybeSingle();

        if (!error && data) {
          supabaseRecord = data;
        }
      } catch (sbErr) {
        console.warn("Supabase fetch exception in update-password:", sbErr);
      }
    }

    // Only verify old password if not an admin override
    if (!isAdminReset) {
      const storedHash = supabaseRecord?.password || employee?.password;

      let isOldPasswordCorrect = false;
      if (!storedHash) {
        // Fallback for accounts without a set password
        isOldPasswordCorrect = oldPassword === "Nawaz123#";
      } else {
        try {
          isOldPasswordCorrect = bcrypt.compareSync(oldPassword, storedHash);
        } catch {
          isOldPasswordCorrect = false;
        }
        if (!isOldPasswordCorrect && oldPassword === storedHash) {
          isOldPasswordCorrect = true;
        }
      }

      if (!isOldPasswordCorrect) {
        return NextResponse.json(
          { error: "Enter old password is incorrect." },
          { status: 400 }
        );
      }
    }

    // Hash the new password
    const salt = bcrypt.genSaltSync(10);
    const hashedNewPassword = bcrypt.hashSync(newPassword, salt);

    // Update local database
    const empIndex = db.employees.findIndex((e: Employee) => e.id === employeeId);
    if (empIndex >= 0) {
      db.employees[empIndex].password = hashedNewPassword;
    } else if (employee) {
      employee.password = hashedNewPassword;
      db.employees.push(employee);
    }
    saveDatabase(db);

    // Update Supabase if available
    if (supabase) {
      try {
        await supabase
          .from("employees")
          .update({ password: hashedNewPassword })
          .eq("id", employeeId);
      } catch (sbErr) {
        console.warn("Supabase sync warning in update-password:", sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: isAdminReset
        ? "Employee password reset successfully by Admin!"
        : "Password updated successfully!"
    });
  } catch (error: any) {
    console.error("Update password route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update password." },
      { status: 500 }
    );
  }
}
