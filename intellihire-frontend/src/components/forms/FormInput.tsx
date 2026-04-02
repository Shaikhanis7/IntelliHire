import React from 'react';
import type { FieldError, UseFormRegister } from 'react-hook-form';

interface FormInputProps {
  name: string;
  label: string;
  type?: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  type = 'text',
  register,
  error,
  placeholder,
  required = false,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        {...register(name)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {error && <p className="text-sm text-red-600">{error.message}</p>}
    </div>
  );
};