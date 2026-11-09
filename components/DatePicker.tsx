// Komponent: MyDatePicker.tsx
import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function MyDatePicker(props : { onDateChange: (date: Date) => void }) {
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  // Parent state starts empty, so report the default (today) once after mount
  useEffect(() => {
    if (startDate) props.onDateChange(startDate);
  }, []);

  return (
    <DatePicker selected={startDate} dateFormat="dd-MM-yyyy" onChange={(date : Date | null) => {
        setStartDate(date)
        if (date) props.onDateChange(date)
    }} />
  );
}
