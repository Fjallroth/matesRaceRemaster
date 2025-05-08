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
  Lock,
  Globe,
  Users,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formSchema = z
  .object({
    raceName: z.string().min(3, {
      message: "Race name must be at least 3 characters.",
    }),
    description: z.string().optional(),
    startDate: z.date({
      required_error: "Start date is required.",
    }),
    endDate: z
      .date({
        required_error: "End date is required.",
      })
      .refine((date) => date > new Date(), {
        message: "End date must be in the future.",
      }),
    segments: z.array(z.string()).min(1, {
      message: "At least one segment is required.",
    }),
    privacy: z.enum(["public", "private"]),
    password: z
      .string()
      .optional()
      .refine(
        (val, ctx) => {
          if (ctx.parent.privacy === "private" && (!val || val.length < 4)) {
            return false;
          }
          return true;
        },
        {
          message:
            "Password is required for private races and must be at least 4 characters.",
        },
      ),
    categories: z.object({
      useAgeCategories: z.boolean().default(false),
      useSexCategories: z.boolean().default(false),
      ageRanges: z
        .array(
          z.object({
            min: z.number().min(0).max(100),
            max: z.number().min(0).max(100),
            label: z.string(),
          }),
        )
        .optional(),
    }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

interface CreateRaceFormProps {
  onSubmit?: (data: FormValues) => void;
  isLoading?: boolean;
}

export default function CreateRaceForm({
  onSubmit = () => {},
  isLoading = false,
}: CreateRaceFormProps) {
  const navigate = useNavigate();
  const [segmentInput, setSegmentInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      raceName: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      segments: [],
      privacy: "public",
      password: "",
      categories: {
        useAgeCategories: false,
        useSexCategories: false,
        ageRanges: [
          { min: 18, max: 29, label: "18-29" },
          { min: 30, max: 39, label: "30-39" },
          { min: 40, max: 49, label: "40-49" },
          { min: 50, max: 59, label: "50-59" },
          { min: 60, max: 100, label: "60+" },
        ],
      },
    },
  });

  const segments = form.watch("segments");
  const privacy = form.watch("privacy");

  const handleAddSegment = () => {
    if (!segmentInput.trim()) return;

    // Basic validation for Strava segment URL or ID
    const segmentPattern = /^(https:\/\/www\.strava\.com\/segments\/\d+|\d+)$/;
    if (!segmentPattern.test(segmentInput)) {
      form.setError("segments", {
        type: "manual",
        message: "Please enter a valid Strava segment URL or ID",
      });
      return;
    }

    // Extract ID if URL was provided
    let segmentId = segmentInput;
    if (segmentInput.includes("strava.com/segments/")) {
      segmentId = segmentInput.split("/").pop() || "";
    }

    // Check if segment already exists
    if (segments.includes(segmentId)) {
      form.setError("segments", {
        type: "manual",
        message: "This segment has already been added",
      });
      return;
    }

    form.setValue("segments", [...segments, segmentId]);
    form.clearErrors("segments");
    setSegmentInput("");
  };

  const handleRemoveSegment = (index: number) => {
    const updatedSegments = [...segments];
    updatedSegments.splice(index, 1);
    form.setValue("segments", updatedSegments);
  };

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    // In a real app, we would submit to an API and then navigate
    // For now, just navigate back to home after a short delay
    setTimeout(() => {
      navigate("/");
    }, 500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-background p-6 rounded-xl shadow-sm">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-center">Create New Race</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                <FormLabel>Race Description</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe your race, rules, and any special instructions"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Optional details about your race to help participants
                  understand what to expect.
                </FormDescription>
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
                        disabled={(date) => date < new Date()}
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
                        disabled={(date) => date <= form.getValues("startDate")}
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

                {segments.length > 0 && (
                  <div className="mt-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="text-sm font-medium mb-2">
                          Added Segments:
                        </h4>
                        <ul className="space-y-2">
                          {segments.map((segment, index) => (
                            <li
                              key={index}
                              className="flex items-center justify-between bg-muted p-2 rounded-md"
                            >
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  {index + 1}
                                </Badge>
                                <span className="text-sm">{segment}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSegment(index)}
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
            control={form.control}
            name="privacy"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Race Privacy</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <label
                        htmlFor="public"
                        className="flex items-center cursor-pointer"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        <span>Public (Anyone can join)</span>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <label
                        htmlFor="private"
                        className="flex items-center cursor-pointer"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        <span>Private (Password required)</span>
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {privacy === "private" && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Race Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Set a password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Participants will need this password to join your race.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="categories.useAgeCategories"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Age Categories</FormLabel>
                  <FormDescription>
                    Allow filtering leaderboard by age groups
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categories.useSexCategories"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Enable Sex Categories</FormLabel>
                  <FormDescription>
                    Allow filtering leaderboard by sex (male/female)
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Race"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
