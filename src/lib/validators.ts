import { z } from 'zod'

const email = z.string().trim().email('Enter a valid email address.')
const password = z.string().min(10, 'Use at least 10 characters.').max(128, 'Password must be 128 characters or fewer.')

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.') })
export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100, 'Name must be 100 characters or fewer.'),
  email,
  password,
  confirmPassword: z.string().min(1, 'Confirm your password.'),
  agreed: z.literal(true, { errorMap: () => ({ message: 'Please agree to the terms and privacy policy.' }) }),
}).refine((value) => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] })

export const resetPasswordSchema = z.object({
  password,
  confirmPassword: z.string().min(1, 'Confirm your password.'),
}).refine((value) => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] })

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  university: z.string().trim().max(160).optional().or(z.literal('')),
  degree: z.string().trim().max(120).optional().or(z.literal('')),
  major: z.string().trim().max(120).optional().or(z.literal('')),
  academic_year: z.string().trim().max(40).optional().or(z.literal('')),
  semester: z.string().trim().max(40).optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
})
