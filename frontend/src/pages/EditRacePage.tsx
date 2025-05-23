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
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, AlertTriangle, Plus, X } from 'lucide-react';
import { Race } from '@/types/raceTypes';
import { parseISO, format } from 'date-fns';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the Zod schema for form validation
const raceFormSchema = z.object({
  raceName: z.string().min(3, 'Race name must be at least 3 characters long').max(100),
  raceInfo: z.string().max(500, 'Race info cannot exceed 500 characters').optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  segments: z.array(z.string()).min(1, {
    message: "At least one segment is required.",
  }),
  isPrivate: z.boolean(),
  password: z.string().optional(),
}).refine(data => {
  if (data.isPrivate && (!data.password || data.password.length < 4)) {
    return false;
  }
  return true;
}, {
  message: 'Private races require a password of at least 4 characters.',
  path: ['password'],
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
  const [segmentInput, setSegmentInput] = useState("");

  const form = useForm<RaceFormData>({
    resolver: zodResolver(raceFormSchema),
    defaultValues: {
      raceName: '',
      raceInfo: '',
      startDate: '',
      endDate: '',
      segments: [],
      isPrivate: false,
      password: '',
    },
  });

  const { control, handleSubmit, register, watch, setValue, formState: { errors }, setError: setFormError, clearErrors } = form;

  const isPrivateWatch = watch('isPrivate');
  const currentSegments = watch('segments');

  const fetchRaceDetails = useCallback(async () => {
    if (!raceId) {
      setError("Race ID is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
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
      setValue('raceName', data.raceName);
      setValue('raceInfo', data.raceInfo || '');
      setValue('startDate', format(parseISO(data.startDate), "yyyy-MM-dd'T'HH:mm"));
      setValue('endDate', format(parseISO(data.endDate), "yyyy-MM-dd'T'HH:mm"));
      setValue('segments', data.segmentIds.map(String));
      setValue('isPrivate', data.isPrivate);
      setValue('password', '');

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

  const handleAddSegment = () => {
    if (!segmentInput.trim()) return;
    const segmentPattern = /^(https:\/\/www\.strava\.com\/segments\/\d+|\d+)$/;
    if (!segmentPattern.test(segmentInput)) {
      setFormError("segments", {
        type: "manual",
        message: "Please enter a valid Strava segment URL or ID",
      });
      return;
    }
    let segmentIdToAdd = segmentInput;
    if (segmentInput.includes("strava.com/segments/")) {
      segmentIdToAdd = segmentInput.split("/").pop() || "";
    }
    if (currentSegments.includes(segmentIdToAdd)) {
      setFormError("segments", {
        type: "manual",
        message: "This segment has already been added",
      });
      return;
    }
    setValue("segments", [...currentSegments, segmentIdToAdd]);
    clearErrors("segments");
    setSegmentInput("");
  };

  const handleRemoveSegment = (index: number) => {
    const updatedSegments = [...currentSegments];
    updatedSegments.splice(index, 1);
    setValue("segments", updatedSegments);
  };

  const onSubmit = async (data: RaceFormData) => {
    setIsSubmitting(true);
    setError(null);

    const segmentIdsAsNumbers = data.segments
      .map(Number)
      .filter(id => !isNaN(id) && id > 0);

    if (segmentIdsAsNumbers.length !== data.segments.length) {
      toast({
        variant: "destructive",
        title: "Invalid Segment ID",
        description: "One or more segment IDs are not valid numbers.",
      });
      setIsSubmitting(false);
      return;
    }

    const raceUpdatePayload = {
      raceName: data.raceName,
      description: data.raceInfo, // Ensure backend DTO field name is 'description' or map accordingly
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      segmentIds: segmentIdsAsNumbers,
      privacy: data.isPrivate, // Ensure backend DTO field name is 'privacy'
      password: data.isPrivate ? data.password : undefined,
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
      navigate(`/race/${raceId}`);
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

  if (error && !race) {
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

  if (!race) {
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
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={control}
                name="raceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Race Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Race" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="raceInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Race Information (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your race, rules, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="segments"
                render={() => (
                  <FormItem>
                    <FormLabel>Strava Segments</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Paste Strava segment URL or ID"
                        value={segmentInput}
                        onChange={(e) => setSegmentInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" onClick={handleAddSegment} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      Add one or more Strava segments for this race (enter numeric ID or full URL).
                    </FormDescription>
                    <FormMessage />

                    {currentSegments.length > 0 && (
                      <div className="mt-4">
                        <Card>
                          <CardContent className="p-4">
                            <h4 className="text-sm font-medium mb-2">
                              Added Segments:
                            </h4>
                            <ul className="space-y-2">
                              {currentSegments.map((segment, index) => (
                                <li
                                  key={index}
                                  className="flex items-center justify-between bg-muted p-2 rounded-md"
                                >
                                  <div className="flex items-center overflow-hidden">
                                    <Badge variant="secondary" className="mr-2 flex-shrink-0">
                                      {index + 1}
                                    </Badge>
                                    <span className="text-sm truncate">{segment}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSegment(index)}
                                    className="flex-shrink-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Private Race</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isPrivateWatch && (
                <FormField
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password (leave blank to keep current, or enter new)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min. 4 characters if setting new"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        If this is already a private race and you want to keep the existing password, you can leave this blank.
                        If you want to change the password, enter a new one.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
        </Form>
      </Card>
    </div>
  );
};

export default EditRacePage;