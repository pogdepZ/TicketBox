import React, { useMemo, useState, useEffect, useRef } from "react";

import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";

import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { styled } from "@mui/system";

import DatePickerCore from "../DatePickerCore";
import { isEqualDate } from "../../../utilities/datetime";

const CalendarHeader = styled("div")({
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "1.2rem",
    position: "relative",
    margin: "0.5rem 0",
});

const createDate = date => {
    return new Date(date.year, date.month, date.date);
};

const DateRangePicker = ({
    onChange,
    initialMonth,
    initialYear,
    value,
    maxRange,
    defaultValue,
}) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [month, setMonth] = useState({
        month: initialMonth || (new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1),
        year:
            initialYear ||
            (new Date().getMonth() - 1 < 0
                ? new Date().getFullYear() - 1
                : new Date().getFullYear()),
    });

    const nextMonth = useMemo(() => {
        return {
            month: month.month + 1 > 11 ? 0 : month.month + 1,
            year: month.month + 1 > 11 ? month.year + 1 : month.year,
        };
    }, [month]);

    const increaseMonth = () => {
        setMonth(prev => {
            return {
                month: prev.month + 1 > 11 ? 0 : prev.month + 1,
                year: prev.month + 1 > 11 ? prev.year + 1 : prev.year,
            };
        });
    };

    const decreaseMonth = () => {
        setMonth(prev => {
            return {
                month: prev.month - 1 < 0 ? 11 : prev.month - 1,
                year: prev.month - 1 < 0 ? prev.year - 1 : prev.year,
            };
        });
    };

    const selectedRange = {
        start: startDate ? createDate(startDate) : null,
        end: endDate ? createDate(endDate) : null,
    };

    const minDate = useMemo(() => {
        if (maxRange && endDate) {
            const result = new Date(
                createDate(endDate).setDate(createDate(endDate).getDate() - maxRange)
            );
            result.setMilliseconds(0);
            result.setSeconds(0);
            result.setMinutes(0);
            result.setHours(0);
            return result;
        }
        return null;
    }, [endDate, maxRange]);

    const maxDate = useMemo(() => {
        if (maxRange && startDate) {
            const result = new Date(
                createDate(startDate).setDate(createDate(startDate).getDate() + maxRange)
            );
            result.setMilliseconds(99);
            result.setSeconds(59);
            result.setMinutes(59);
            result.setHours(23);
            return result;
        }
        return null;
    }, [startDate, maxRange]);

    const datePickerChange = date => {
        if (date) {
            if (startDate) {
                if (isEqualDate(date, startDate)) {
                    if (!endDate) {
                        setStartDate(null);
                    } else {
                        setStartDate(endDate);
                        setEndDate(null);
                    }
                    return;
                }
            }
            if (endDate) {
                if (isEqualDate(date, endDate)) {
                    setEndDate(null);
                    return;
                }
            }
            if (!startDate) {
                setStartDate(date);
            } else if (createDate(date).getTime() < createDate(startDate).getTime()) {
                setStartDate(date);
            } else if (!endDate) {
                setEndDate(date);
            } else if (
                createDate(date).getTime() > createDate(startDate).getTime() &&
                createDate(date).getTime() < createDate(endDate).getTime()
            ) {
                setStartDate(date);
            } else if (createDate(date).getTime() > createDate(endDate).getTime()) {
                setEndDate(date);
            }
        }
    };

    const isFirstMountRef = useRef(true);
    const isDefaultUpdate = useRef(false);
    useEffect(() => {
        if (onChange && !isFirstMountRef.current && !isDefaultUpdate.current) {
            onChange(selectedRange);
        }
        isFirstMountRef.current = false;
        isDefaultUpdate.current = false;
    }, [startDate, endDate]);

    useEffect(() => {
        if (defaultValue) {
            if (defaultValue.start) {
                isDefaultUpdate.current = true;
                setStartDate(prev => {
                    return {
                        date: defaultValue.start.getDate(),
                        month: defaultValue.start.getMonth(),
                        year: defaultValue.start.getFullYear(),
                    };
                });
            }
            if (defaultValue.end) {
                isDefaultUpdate.current = true;
                setEndDate(prev => {
                    return {
                        date: defaultValue.end.getDate(),
                        month: defaultValue.end.getMonth(),
                        year: defaultValue.end.getFullYear(),
                    };
                });
            }
        }
    }, [defaultValue]);

    return (
        <Stack direction={"row"} spacing={2}>
            <Box>
                <CalendarHeader sx={{ fontWeight: "var(--boxTitleFontWeight)" }}>
                    Tháng {month.month + 1} - {month.year}
                    <IconButton
                        size="small"
                        sx={{
                            left: "1rem",
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                        onClick={decreaseMonth}
                    >
                        <ArrowBackIosNewIcon sx={{ fontSize: "1rem" }}></ArrowBackIosNewIcon>
                    </IconButton>
                </CalendarHeader>
                <DatePickerCore
                    month={month.month}
                    year={month.year}
                    onChange={datePickerChange}
                    selectedRange={selectedRange}
                    startDate={startDate}
                    endDate={endDate}
                    minDate={minDate}
                    maxDate={maxDate}
                ></DatePickerCore>
            </Box>
            <Box>
                <CalendarHeader sx={{ fontWeight: "var(--boxTitleFontWeight)" }}>
                    Tháng {nextMonth.month + 1} - {nextMonth.year}
                    <IconButton
                        size="small"
                        sx={{
                            right: "1rem",
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                        onClick={increaseMonth}
                    >
                        <ArrowForwardIosIcon sx={{ fontSize: "1rem" }}></ArrowForwardIosIcon>
                    </IconButton>
                </CalendarHeader>
                <DatePickerCore
                    onChange={datePickerChange}
                    month={nextMonth.month}
                    year={nextMonth.year}
                    selectedRange={selectedRange}
                    startDate={startDate}
                    endDate={endDate}
                    minDate={minDate}
                    maxDate={maxDate}
                ></DatePickerCore>
            </Box>
        </Stack>
    );
};

export default DateRangePicker;
