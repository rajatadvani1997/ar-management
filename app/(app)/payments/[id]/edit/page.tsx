import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentEditForm } from "@/components/payments/payment-edit-form";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role === "VIEWER") redirect(`/payments/${id}`);

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Payment</h1>
        <p className="text-gray-500">{payment.paymentNumber}</p>
      </div>
      <PaymentEditForm
        payment={{
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          paymentDate: payment.paymentDate.toISOString(),
          amount: payment.amount,
          allocatedAmount: payment.allocatedAmount,
          paymentMode: payment.paymentMode,
          referenceNumber: payment.referenceNumber,
          bankName: payment.bankName,
          notes: payment.notes,
        }}
      />
    </div>
  );
}
