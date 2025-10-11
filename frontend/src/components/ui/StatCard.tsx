// frontend/src/components/ui/StatCard.tsx
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string | number;
  hint?: string;
  to?: string;
}

export default function StatCard({ title, value, hint, to }: StatCardProps) {
  const content = (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
        <dd className="mt-1 text-3xl font-semibold text-gray-900">{value}</dd>
        {hint && <p className="mt-2 text-sm text-gray-600">{hint}</p>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}