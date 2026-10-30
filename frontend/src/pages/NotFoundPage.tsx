import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-[#FFEBE6] border border-[#FF8F73] flex items-center justify-center text-[#DE350B] mb-5 shadow-xs">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="text-xs font-bold uppercase tracking-wider text-[#6B6E76] mb-1">
        HTTP 404 • Resource Not Found
      </div>

      <h1 className="text-2xl font-bold text-[#292A2E] mb-2 tracking-tight">
        Shop Floor Route Not Found
      </h1>

      <p className="text-sm text-[#505258] max-w-md mb-4">
        The route you attempted to access is not recognized by the MES routing table:
      </p>

      <div className="mb-6 font-mono text-xs px-3 py-1.5 rounded-md bg-[#F4F5F7] border border-[#0B120E24] text-[#172B4D] max-w-lg truncate">
        {location.pathname}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <button
          type="button"
          onClick={() => void navigate('/shopfloor')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#1868DB] border border-[#8FB8F6] transition-colors shadow-xs"
        >
          <span>Shop Floor Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => void navigate('/')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#1868DB] hover:bg-[#1558BC] text-[#FFFFFF] shadow-xs transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Modules Directory & Hub</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
