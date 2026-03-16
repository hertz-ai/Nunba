/* eslint-disable */
import React from 'react';
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import {DatePicker as MuiDatePicker} from '@mui/x-date-pickers/DatePicker';
import {AdapterDateFns} from '@mui/x-date-pickers/AdapterDateFns';

export default function DatePicker(props) {
  const {id, name, label, value, onChange} = props;

  const convertToDefEventPara = (name, value) => ({
    target: {
      name,
      value,
    },
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MuiDatePicker
        format="MMM/dd/yyyy"
        label={label}
        value={value}
        onChange={(date) => onChange(convertToDefEventPara(name, date))}
        slotProps={{
          textField: {
            id: id,
            name: name,
            variant: 'outlined',
            margin: 'normal',
          },
        }}
      />
    </LocalizationProvider>
  );
}
