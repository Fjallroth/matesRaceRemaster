import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  // Lock, // No longer needed for privacy toggle
  // Globe, // No longer needed for privacy toggle
  Loader2,
  AlertTriangle,
  Users // For sex categories
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Removed
// import { Checkbox } from "@/components/ui/checkbox"; // Keep if used for sex categories, or use Switch
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formObjectSchema = z.object({
    raceName: z.string().min(3, {
      message: "Race name must be at least 3 characters.",
    }),
    description: z.string().optional(),
    startDate: z.date({
      required_error: "Start date is required.",
    }),
    endDate: z.date({
        required_error: "End date is required.",
    }),
    segments: z.array(z.string()).min(1, {
      message: "At least one segment is required.",
    }),
    // privacy: z.enum(["public", "private"]), // Removed, forced to private
    password: z.string().min(4, { message: "Password is required and must be at least 4 characters." }), // Always required
    hideLeaderboardUntilFinish: z.boolean().default(false),
    useSexCategories: z.boolean().default(false), // New field for sex categories
    // categories object removed as age categories are gone for now
  });

const formSchema = formObjectSchema.superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.invalid_date,
            message: "End date must be after start date.",
            path: ["endDate"],
        });
    }
    // Password validation is now at field level if always required
});


type FormValues = z.infer<typeof formSchema>;

export default function CreateRaceForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [segmentInput, setSegmentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      raceName: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      segments: [],
      // privacy: "private", // No longer needed in form state, forced in payload
      password: "",
      hideLeaderboardUntilFinish: false,
      useSexCategories: false, // Default for sex categories
    },
  });

  const segmentsWatch = form.watch("segments");

  const handleAddSegment = () => { /* ... same as before ... */
    if (!segmentInput.trim()) return;
    const segmentPattern = /^(https:\/\/www\.strava\.com\/segments\/\d+|\d+)$/;
    if (!segmentPattern.test(segmentInput)) {
      form.setError("segments", {
        type: "manual",
        message: "Please enter a valid Strava segment URL or ID",
      });
      return;
    }
    let segmentId = segmentInput;
    if (segmentInput.includes("strava.com/segments/")) {
      segmentId = segmentInput.split("/").pop() || "";
    }
    if (segmentsWatch.includes(segmentId)) {
      form.setError("segments", {
        type: "manual",
        message: "This segment has already been added",
      });
      return;
    }
    form.setValue("segments", [...segmentsWatch, segmentId]);
    form.clearErrors("segments");
    setSegmentInput("");
   };
  const handleRemoveSegment = (index: number) => { /* ... same as before ... */
    const updatedSegments = [...segmentsWatch];
    updatedSegments.splice(index, 1);
    form.setValue("segments", updatedSegments);
  };

  const handleSubmitFunc = async (values: FormValues) => {
    setIsLoading(true);
    setApiError(null);

    const segmentIdsAsNumbers = values.segments
        .map(Number)
        .filter(id => !isNaN(id) && id > 0);

    if (segmentIdsAsNumbers.length !== values.segments.length) {
         toast({ /* ... */ });
        setIsLoading(false);
        return;
    }

    const payload = {
      raceName: values.raceName,
      description: values.description,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      segmentIds: segmentIdsAsNumbers,
      // privacy: "private", // Forced by backend or implicitly private now
      password: values.password, // Always send password
      hideLeaderboardUntilFinish: values.hideLeaderboardUntilFinish,
      useSexCategories: values.useSexCategories, // Include new field
    };
    // ... (fetch logic remains the same)
    console.log("Submitting payload:", payload);

    try {
      const response = await fetch("/api/races", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
         credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
        } catch (e) {
            errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      toast({
        title: "Race Created!",
        description: `"${values.raceName}" has been successfully created.`,
      });
      navigate("/");

    } catch (error: any) {
      console.error("Failed to create race:", error);
      setApiError(error.message || "An unexpected error occurred. Please try again.");
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "There was a problem creating the race.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-background p-6 rounded-xl shadow-sm">
      {/* ... (back button, title, apiError alert remain the same) ... */}
       <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-center">Create New Private Race</h2>

      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmitFunc)} className="space-y-6">
          {/* Race Name, Description, Dates, Segments fields remain the same */}
            <FormField
            control={form.control}
            name="raceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Race Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Weekend Hill Climb Challenge"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Give your race a catchy, descriptive name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Race Description (Optional)</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe your race, rules, and any special instructions"
                    {...field}
                     value={field.value ?? ""}
                  />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>When the race begins.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                            const startDate = form.getValues("startDate");
                            return startDate ? date <= startDate : false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>When submissions close.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
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
                  Add one or more Strava segments for this race.
                </FormDescription>
                <FormMessage />
                 {segmentsWatch.length > 0 && (
                  <div className="mt-4">
                    <Card><CardContent className="p-4">
                        <h4 className="text-sm font-medium mb-2">Added Segments:</h4>
                        <ul className="space-y-2">
                          {segmentsWatch.map((segment, index) => (
                            <li key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                              <div className="flex items-center overflow-hidden">
                                <Badge variant="secondary" className="mr-2 flex-shrink-0">{index + 1}</Badge>
                                <span className="text-sm truncate">{segment}</span>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSegment(index)} className="flex-shrink-0"><X className="h-4 w-4" /></Button>
                            </li>))}
                        </ul>
                    </CardContent></Card>
                  </div>
                )}
              </FormItem>
            )}
          />


          {/* Password Field (Always visible and required) */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Race Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Set a password (min 4 characters)"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  All races are private. Participants will need this password to join.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hide Leaderboard Switch (remains the same) */}
          <FormField
            control={form.control}
            name="hideLeaderboardUntilFinish"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Hide Leaderboard Until Finish</FormLabel>
                  <FormDescription>
                    If enabled, participant times on the leaderboard will be hidden from other participants until the race ends.
                    As the organizer, you will always see all results. Participants will always see their own times.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Hide leaderboard until finish"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Enable Sex Categories Switch */}
          <FormField
            control={form.control}
            name="useSexCategories"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                 <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Sex Categories</FormLabel>
                    <FormDescription>
                        If enabled, separate leaderboards for Male and Female participants will be shown.
                        Participant sex is based on their Strava profile.
                    </FormDescription>
                 </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Enable sex categories"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Age Categories Removed */}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                "Create Race"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}