"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  role: string;
}

interface OwnerFilterProps {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  owner: string | undefined;
  basePath: string;
  extraParams?: Record<string, string>;
}

export function OwnerFilter({
  users,
  currentUserId,
  isAdmin,
  owner,
  basePath,
  extraParams = {},
}: OwnerFilterProps) {
  const router = useRouter();

  if (isAdmin) {
    // Collapse "my customers" to empty string regardless of whether owner is
    // undefined (default) or the admin's own ID.
    const selectedValue =
      owner === "all" ? "all" : !owner || owner === currentUserId ? "" : owner;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const params = new URLSearchParams();
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      if (value === "all") {
        params.set("owner", "all");
      } else if (value !== "") {
        params.set("owner", value);
      }
      // empty string → "Mine" → no owner param → defaults to current user
      router.push(`${basePath}?${params.toString()}`);
    };

    return (
      <select
        value={selectedValue}
        onChange={handleChange}
        className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Customers</option>
        <option value="">My Customers</option>
        {users.length > 0 && (
          <>
            <option disabled value="__divider__">──────────────</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </>
        )}
      </select>
    );
  }

  // Non-admin: keep the existing pill toggle
  const isFiltered = owner !== "all";
  const extraQs = Object.entries(extraParams)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return (
    <div className="flex gap-2 text-sm">
      <Link
        href={`${basePath}${extraQs ? `?${extraQs}` : ""}`}
        className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
          isFiltered
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
        }`}
      >
        My Customers
      </Link>
      <Link
        href={`${basePath}?owner=all${extraQs ? `&${extraQs}` : ""}`}
        className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
          !isFiltered
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
        }`}
      >
        All Customers
      </Link>
    </div>
  );
}
