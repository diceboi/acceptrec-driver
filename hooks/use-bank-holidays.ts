import { useState, useEffect } from "react";

export interface BankHoliday {
  title: string;
  date: string; // YYYY-MM-DD
  notes: string;
  bunting: boolean;
}

export function useBankHolidays() {
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHolidays() {
      try {
        const response = await fetch("https://www.gov.uk/bank-holidays.json");
        if (!response.ok) throw new Error("Failed to fetch holidays");
        
        const data = await response.json();
        
        // We primarily use England and Wales holidays for UK standard
        const englandAndWales = data["england-and-wales"]?.events || [];
        
        // Create a set of date strings (YYYY-MM-DD)
        const holidaySet = new Set<string>();
        englandAndWales.forEach((event: BankHoliday) => {
          holidaySet.add(event.date);
        });
        
        setHolidays(holidaySet);
      } catch (error) {
        console.error("Error fetching UK bank holidays:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHolidays();
  }, []);

  const isBankHoliday = (dateString: string) => holidays.has(dateString);

  return { holidays, isBankHoliday, isLoading };
}
