'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// Define the password change schema with Zod for validation
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Type for the form values
type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export default function ChangePasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Initialize React Hook Form with Zod validation
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Handle form submission
  const onSubmit = async (data: PasswordChangeValues) => {
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    
    try {
      // Get the current user first using the secure getUser() method
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error('You must be logged in to change your password');
      }
      
      // Now use the email from the securely fetched user data
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email ?? '',
        password: data.currentPassword
      });

      // Check if the current password is correct
      if (signInError) {
        setErrorMessage('The current password you entered is incorrect');
        return;
      }
      
      // Current password is correct, proceed to update
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Password updated successfully
      setSuccessMessage('Your password has been updated successfully');
      reset(); // Clear form fields
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update password');
      console.error('Password update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        {/* Current Password Field */}
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            placeholder="Enter your current password"
            {...register('currentPassword')}
            disabled={isSubmitting}
          />
          {errors.currentPassword && (
            <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password Field */}
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Enter your new password"
            {...register('newPassword')}
            disabled={isSubmitting}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-500">{errors.newPassword.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your new password"
            {...register('confirmPassword')}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert className="bg-red-50 border-red-200 text-red-800">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Password...
            </>
          ) : (
            'Change Password'
          )}
        </Button>
      </div>
    </form>
  );
} 