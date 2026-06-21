import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm font-['Futura',Arial,sans-serif] font-medium text-[#414042]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2 border border-[#E6E7E8] rounded-md font-['Futura',Arial,sans-serif] text-sm text-[#414042] placeholder:text-[#A6A9AC] focus:outline-none focus:border-[#ED1C24] ${
          error ? 'border-[#ED1C24]' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[#ED1C24] font-['Futura',Arial,sans-serif]">{error}</p>
      )}
    </div>
  );
}
