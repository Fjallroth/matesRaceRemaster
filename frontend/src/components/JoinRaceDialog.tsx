// frontend/src/components/JoinRaceDialog.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/AuthContext';

interface JoinRaceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRaceJoined: () => void;
}

const formSchema = z.object({
  raceId: z.string().min(1, { message: 'Race ID is required.' }).regex(/^\d+$/, { message: "Race ID must be a number."}),
  password: z.string().optional(),
});

type JoinRaceFormValues = z.infer<typeof formSchema>;

const JoinRaceDialog: React.FC<JoinRaceDialogProps> = ({ isOpen, onOpenChange, onRaceJoined }) => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<JoinRaceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      raceId: '',
      password: '',
    },
  });

  const handleJoinRace = async (values: JoinRaceFormValues) => {
    if (!isAuthenticated) {
      setApiError("You must be logged in to join a race.");
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Please log in to join a race.",
      });
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`/api/races/${values.raceId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', 
        },
        credentials: 'include',
        body: JSON.stringify({ password: values.password }),
      });

      if (!response.ok) {
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        // Read the body ONCE as text.
        const errorBodyText = await response.text();
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json") && errorBodyText) {
            try {
                const errorData = JSON.parse(errorBodyText); // Parse the text we already fetched
                errorMessage = errorData.message || errorData.detail || errorData.error || JSON.stringify(errorData);
            } catch (e) {
                // JSON parsing failed, use the raw text if not empty, or the status text.
                errorMessage = errorBodyText || errorMessage;
            }
        } else if (errorBodyText) {
            // Not JSON, or no content-type. Use the text directly.
            // Prevent Spring's default HTML error page from being the message
            if (errorBodyText.toLowerCase().includes("<!doctype html>") || errorBodyText.toLowerCase().includes("<html")) {
                 errorMessage = `An unexpected server error occurred (${response.status}). Please try again.`;
            } else {
                errorMessage = errorBodyText;
            }
        }
        // Ensure errorMessage isn't excessively long (e.g. full HTML page if backend misconfigured)
        if (errorMessage.length > 300) {
            errorMessage = errorMessage.substring(0, 297) + "...";
        }
        throw new Error(errorMessage);
      }

      // const result = await response.json(); // If successful, response body should be JSON
      toast({
        title: 'Successfully Joined Race!',
        description: `You are now a participant in race ${values.raceId}.`,
      });
      onRaceJoined();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error joining race:', error);
      const displayMessage = error instanceof Error ? error.message : String(error);
      setApiError(displayMessage);
      toast({
        variant: 'destructive',
        title: 'Failed to Join Race',
        description: displayMessage || 'Please check the Race ID and password, or try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset();
            setApiError(null);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Race</DialogTitle>
          <DialogDescription>
            Enter the Race ID and password (if it's a private race) to join.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleJoinRace)} className="space-y-4">
            <FormField
              control={form.control}
              name="raceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Race ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Race ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (if private)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {apiError && (
              <div className="flex items-start p-3 bg-destructive/10 border border-destructive/50 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                <span className="break-all">{apiError}</span>
              </div>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Race'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRaceDialog;