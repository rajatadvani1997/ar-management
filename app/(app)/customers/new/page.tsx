import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Customer</h1>
        <p className="text-gray-500">Add a new customer to the system</p>
      </div>
      <CustomerForm />
    </div>
  );
}
