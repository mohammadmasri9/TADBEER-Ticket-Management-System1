interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyles = "px-6 py-2 rounded-md font-['Ooredoo-Beta',Arial,sans-serif] font-bold text-sm transition-colors";
  
  const variants = {
    primary: "bg-[#ED1C24] hover:bg-[#C41A20] text-white shadow-sm",
    secondary: "bg-[#808285] hover:bg-[#414042] text-white",
    ghost: "text-[#ED1C24] hover:bg-[#FFF0F0]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
