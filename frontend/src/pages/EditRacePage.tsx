import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Race } from '@/types/raceTypes'; // Corresponds to RaceResponseDTO
import { parseISO, format } from 'date-fns'; // For date formatting and parsing

// Define the Zod schema for form validation (similar to RaceCreateDTO structure)
// Password is optional here, only relevant if isPrivate is true.
// Segment IDs are handled as a string initially, then converted.
const raceFormSchema = z.object({
  raceName: z.string().min(3, 'Race name must be at least 3 characters long').max(100),
  raceInfo: z.string().max(500, 'Race info cannot exceed 500 characters').optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  segmentIdsString: z.string().refine(value => {
    if (!value.trim()) return true; // Allow empty if no segments initially or to clear them
    return value.split(',').every(id => /^\d+$/.test(id.trim()));
  }, 'Segment IDs must be numbers, separated by commas. Leave empty if none.'),
  isPrivate: z.boolean(),
  password: z.string().optional(),
}).refine(data => {
  if (data.isPrivate && (!data.password || data.password.length < 4)) {
    return false;
  }
  return true;
}, {
  message: 'Private races require a password of at least 4 characters.',
  path: ['password'], // Show error on password field
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date.",
    path: ["endDate"],
});


type RaceFormData = z.infer<typeof raceFormSchema>;

const EditRacePage: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [race, setRace] = useState<Race | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, register, watch, setValue, formState: { errors } } = useForm<RaceFormData>({
    resolver: zodResolver(raceFormSchema),
    defaultValues: {
      raceName: '',
      raceInfo: '',
      startDate: '',
      endDate: '',
      segmentIdsString: '',
      isPrivate: false,
      password: '',
    },
  });

  const isPrivateWatch = watch('isPrivate');

  const fetchRaceDetails = useCallback(async () => {
    if (!raceId) {
        setError("Race ID is missing.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      // This endpoint should return RaceResponseDTO
      const response = await fetch(`/api/races/${raceId}`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized to edit this race or your session expired." });
            navigate("/home");
        } else if (response.status === 404) {
            toast({ variant: "destructive", title: "Not Found", description: "Race not found." });
            navigate("/home");
        }
        throw new Error(`Failed to fetch race details: ${response.statusText}`);
      }
      const data: Race = await response.json();
      setRace(data);
      // Pre-fill form
      setValue('raceName', data.raceName);
      setValue('raceInfo', data.raceInfo || '');
      // Dates from backend are ISO strings, format them for datetime-local input
      setValue('startDate', format(parseISO(data.startDate), "yyyy-MM-dd'T'HH:mm"));
      setValue('endDate', format(parseISO(data.endDate), "yyyy-MM-dd'T'HH:mm"));
      setValue('segmentIdsString', data.segmentIds.join(', '));
      setValue('isPrivate', data.isPrivate);
      // Password is not sent in RaceResponseDTO for security.
      // If you want to allow changing password, you'll need a specific flow.
      // For now, we'll leave it blank. If it's a private race, the user must re-enter if they want to change it.
      // Or, if they don't touch it and isPrivate is true, the backend should retain the old password.
      // The RaceCreateDTO (used for PUT body) has `password`.
      setValue('password', ''); // Or handle password update more carefully

    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching race details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [raceId, navigate, setValue, toast]);

  useEffect(() => {
    fetchRaceDetails();
  }, [fetchRaceDetails]);

  const onSubmit = async (data: RaceFormData) => {
    setIsSubmitting(true);
    setError(null);

    const segmentIds = data.segmentIdsString.split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));

    // This DTO should match backend's RaceCreateDTO or a new RaceUpdateDTO
    const raceUpdatePayload = {
      raceName: data.raceName,
      raceInfo: data.raceInfo,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      segmentIds: segmentIds,
      isPrivate: data.isPrivate,
      password: data.isPrivate ? data.password : undefined, // Only send password if private
    };

    try {
      const response = await fetch(`/api/races/${raceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(raceUpdatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to update race. Status: ${response.statusText}` }));
        if (response.status === 401 || response.status === 403) {
            toast({ variant: "destructive", title: "Unauthorized", description: errorData.message || "You are not authorized to perform this action or your session expired." });
        } else {
            toast({ variant: "destructive", title: "Update Failed", description: errorData.message || "Could not update the race." });
        }
        throw new Error(errorData.message || `Failed to update race`);
      }

      toast({ title: 'Race Updated!', description: 'The race details have been successfully updated.' });
      navigate(`/race/${raceId}`); // Navigate to race detail page or home
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating race:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading race details...</p>
      </div>
    );
  }

  if (error && !race) { // Show critical error if race data couldn't be loaded
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Race</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate('/home')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }
  
  if (!race) { // Should be covered by previous error, but as a fallback
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-muted-foreground">Race data not available.</p>
             <Button onClick={() => navigate('/home')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
        </div>
    )
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <Button variant="outline" size="sm" className="mb-4 w-fit" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <CardTitle className="text-2xl font-bold">Edit Race: {race?.raceName}</CardTitle>
          <CardDescription>Update the details for your race.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="raceName">Race Name</Label>
              <Input id="raceName" {...register('raceName')} placeholder="My Awesome Race" />
              {errors.raceName && <p className="text-sm text-destructive">{errors.raceName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="raceInfo">Race Information (Optional)</Label>
              <Textarea id="raceInfo" {...register('raceInfo')} placeholder="Describe your race, rules, etc." />
              {errors.raceInfo && <p className="text-sm text-destructive">{errors.raceInfo.message}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date & Time</Label>
                    <Input id="startDate" type="datetime-local" {...register('startDate')} />
                    {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate">End Date & Time</Label>
                    <Input id="endDate" type="datetime-local" {...register('endDate')} />
                    {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
                </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="segmentIdsString">Strava Segment IDs</Label>
              <Input
                id="segmentIdsString"
                {...register('segmentIdsString')}
                placeholder="e.g., 12345, 67890 (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Find segment IDs from Strava segment URLs (e.g., strava.com/segments/YOUR_ID). Separate multiple IDs with a comma.
              </p>
              {errors.segmentIdsString && <p className="text-sm text-destructive">{errors.segmentIdsString.message}</p>}
            </div>

            <div className="flex items-center space-x-3">
                <Controller
                    name="isPrivate"
                    control={control}
                    render={({ field }) => (
                        <Switch
                        id="isPrivate"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    )}
                />
              <Label htmlFor="isPrivate" className="cursor-pointer">Private Race</Label>
            </div>
            {errors.isPrivate && <p className="text-sm text-destructive">{errors.isPrivate.message}</p>}


            {isPrivateWatch && (
              <div className="space-y-2">
                <Label htmlFor="password">Password (leave blank to keep current, or enter new)</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Min. 4 characters if setting new"
                />
                 <p className="text-xs text-muted-foreground">
                    If this is already a private race and you want to keep the existing password, you can leave this blank.
                    If you want to change the password, enter a new one.
                 </p>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
            )}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Race
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EditRacePage;