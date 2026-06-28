import React, { useEffect, useRef, useState } from "react";

import { styled } from "@mui/material/styles";

import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import Menu from "@mui/material/Menu";

import DatePicker from "../DatePicker/DatePicker";

import { ddmmyyyy } from "../../../utilities/datetime";

const CustomTextField = styled(TextField)(({ theme }) => ({
    "& .MuiFormHelperText-root": {
        marginLeft: "00px",
    },
    "& .MuiOutlinedInput-root": {
        "&.Mui-focused fieldset": {
            borderColor: theme.palette.green,
        },
    },
}));

const DatePickerInput = props => {
    const {
        onChange,
        value,
        error,
        helperText,
        showerror,
        defaultdate,
        maxdate,
        mindate,
        fontWeight,
    } = props;

    const [anchorEl, setAnchoEl] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const isUserChange = useRef(false);

    const handleClose = () => {
        setAnchoEl(null);
    };

    const handleSelectDate = date => {
        isUserChange.current = true;
        setSelectedDate(date);
    };

    const inputDisplay = (() => {
        if (selectedDate) {
            return `${ddmmyyyy(selectedDate)}`;
        }
        return "dd/mm/yyyy";
    })();

    useEffect(() => {
        if (selectedDate && isUserChange.current) {
            onChange({
                target: {
                    value: selectedDate,
                },
            });
            isUserChange.current = false;
        }
        handleClose();
    }, [selectedDate, onChange]);

    useEffect(() => {
        if (!value) {
            setSelectedDate(null);
        } else if (value instanceof Date && !isNaN(value)) {
            setSelectedDate(value);
        }
    }, [value]);

    useEffect(() => {
        if (defaultdate) {
            setSelectedDate(defaultdate);
        }
    }, [defaultdate]);

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
            }}
        >
            <CustomTextField
                {...props}
                InputProps={{
                    readOnly: true,
                    endAdornment: (
                        <InputAdornment position="end">
                            <CalendarMonthIcon></CalendarMonthIcon>
                        </InputAdornment>
                    ),
                    style: {
                        color: selectedDate ? "#000" : "#BEBDBD",
                    },
                }}
                onChange={() => {}}
                value={inputDisplay}
                onClick={e => {
                    setAnchoEl(e.currentTarget);
                }}
                sx={{
                    ...props.sx,
                    "& .MuiInputBase-root": {
                        "& input": {
                            cursor: "pointer",
                        },
                        cursor: "pointer",
                    },
                }}
                className={props.className}
                error={showerror && error}
                helperText={showerror && helperText}
            />
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
                sx={{
                    "& .MuiMenu-list": {
                        padding: 0,
                        background: "none",
                        widht: "100%",
                    },
                    "& .MuiMenu-paper": {
                        borderRadius: "20px",
                    },
                }}
                transitionDuration={100}
            >
                <Box
                    sx={{
                        padding: "1rem",
                        widht: "100%",
                    }}
                >
                    <DatePicker
                        value={value}
                        onChange={date => handleSelectDate(date)}
                        defaultDate={selectedDate}
                        maxDate={maxdate}
                        minDate={mindate}
                        fontWeight={fontWeight}
                    />
                    <Stack direction={"row"} spacing={1} justifyContent="flex-end">
                        <Button
                            variant="contained"
                            disableElevation
                            sx={{
                                color: "#fff",
                                background: "#909090",
                                textTransform: "none",
                                fontSize: "1rem",
                                borderRadius: "10px",
                                "&:hover": {
                                    background: "#5f5f5f",
                                },
                            }}
                            onClick={handleClose}
                        >
                            Đóng
                        </Button>
                    </Stack>
                </Box>
            </Menu>
        </Box>
    );
};

export default DatePickerInput;
