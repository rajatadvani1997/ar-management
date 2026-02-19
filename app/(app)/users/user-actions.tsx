"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserX, UserCheck, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  isActive: boolean;
  role: string;
}

export function UserActions({ user }: { user: User }) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState("");

  async function toggleActive() {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete user "${user.name}"? This cannot be undone.`)) return;
    setDeleteError("");
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setDeleteError(data.error || "Failed to delete user");
    }
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={toggleActive}>
            {user.isActive ? (
              <><UserX className="mr-2 h-4 w-4" />Deactivate</>
            ) : (
              <><UserCheck className="mr-2 h-4 w-4" />Activate</>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {deleteError && <p className="text-xs text-red-600 mt-1">{deleteError}</p>}
    </div>
  );
}
