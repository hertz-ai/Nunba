import React from 'react';
import {TextField} from '@mui/material';

export default function Input(props) {
  const {
    name,
    id,
    label,
    value,
    error = null,
    onChange,
    type = 'string',
  } = props;
  return (
    <TextField
      variant="outlined"
      margin="normal"
      label={label}
      fullWidth
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      {...(error && {error: true, helperText: error})}
    />
  );
}
