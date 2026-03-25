"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    date ? format(date, "yyyy-MM-dd") : ""
  );

  // Update input value when date prop changes
  React.useEffect(() => {
    setInputValue(date ? format(date, "yyyy-MM-dd") : "");
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Try to parse the input as a date
    const parsedDate = parse(value, "yyyy-MM-dd", new Date());
    if (isValid(parsedDate)) {
      onDateChange?.(parsedDate);
    }
  };

  const handleInputBlur = () => {
    // Validate and reformat on blur
    if (inputValue) {
      const parsedDate = parse(inputValue, "yyyy-MM-dd", new Date());
      if (isValid(parsedDate)) {
        setInputValue(format(parsedDate, "yyyy-MM-dd"));
      } else {
        // Reset to current date or empty
        setInputValue(date ? format(date, "yyyy-MM-dd") : "");
      }
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    if (selectedDate) {
      setInputValue(format(selectedDate, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={disabled}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}