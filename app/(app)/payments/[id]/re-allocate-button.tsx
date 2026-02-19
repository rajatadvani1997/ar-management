"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

export function ReAllocateButton({ paymentId }: { paymentId: string }) {
  return (
    <Link href={`/payments/${paymentId}/allocate`}>
      <Button variant="outline" size="sm">
        <ArrowLeftRight className="h-4 w-4 mr-1" />
        Allocate
      </Button>
    </Link>
  );
}
