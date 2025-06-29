import React from 'react'
import { FieldErrors, FieldValues, Path } from 'react-hook-form'

// ReservationFormData tipini import etmek yerine daha genel bir yaklaşım
// Veya ReservationForm dosyasından export edilip buraya import edilebilir.
// Şimdilik FieldValues kullanıyoruz, gerekirse özelleştirilebilir.
type FieldErrorProps<T extends FieldValues> = {
  name: Path<T>;
  errors: FieldErrors<T>;
};

export const FieldError = <T extends FieldValues>({ name, errors }: FieldErrorProps<T>) => {
  const error = errors[name];
  // Stil reservation-form.tsx'deki ile aynı
  return error && typeof error.message === 'string' ? (
    <p className="text-xs font-medium text-destructive mt-1">{error.message}</p>
  ) : null;
}; 