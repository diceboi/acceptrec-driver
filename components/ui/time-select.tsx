import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
}

const timeOptions: string[] = [];
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    timeOptions.push(`${h}:${m}`);
  }
}

export function TimeSelect({ value, onChange, placeholder = "Select time", "data-testid": testId, className }: TimeSelectProps) {
  const handleChange = (newValue: string) => {
    onChange(newValue === "__clear__" ? "" : newValue);
  };

  return (
    <Select value={value || ""} onValueChange={handleChange}>
      <SelectTrigger data-testid={testId} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="__clear__" className="text-muted-foreground">Clear</SelectItem>
        {timeOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
