import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 rounded-md cursor-pointer select-none tracking-wide";
  
  const variants = {
    primary: "bg-gold-500 text-neutral-950 hover:bg-gold-400 focus:ring-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] border border-transparent",
    secondary: "bg-transparent text-gold-500 border border-gold-500/50 hover:bg-gold-500/10 hover:border-gold-500 focus:ring-gold-500",
    ghost: "bg-transparent text-neutral-400 hover:text-gold-500 hover:bg-neutral-800 focus:ring-neutral-700",
    danger: "bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900 hover:border-red-700 focus:ring-red-500"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs uppercase tracking-wider",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base"
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isLoading || disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};