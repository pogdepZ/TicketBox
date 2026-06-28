import React, { useEffect, useMemo, useRef, useState } from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";

import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { styled } from "@mui/system";

import { MenuItem, MenuList } from "@mui/material";
import {
    getLastMonthFirstDate,
    getLastMonthLastDate,
    getLastWeekMonday,
    getLastWeekSunday,
    getThisMonthFirstDate,
    getThisWeekMonday,
    isEqualDate,
} from "../../../utilities/datetime";
import DatePickerCore from "../DatePickerCore";
import i18n from "../../../i18n";
import { DATE_RANGE_OPTIONS } from "../config";

const CalendarHeader = styled("div")({
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "1.2rem",
    position: "relative",
    margin: "0.5rem 0",
});

const CustomizedMenuItem = styled(MenuItem)(() => ({
    boxSizing: "border-box",
    "&:hover": {
        backgroundColor: "var(--lightMainColor) !important",
    },
    "&.Mui-selected": {
        backgroundColor: "var(--mainColor) !important",
        color: "#FFF",
    },
}));

const createDate = date => {
    return new Date(date.year, date.month, date.date);
};

const OPTIONS = [
    {
        text: i18n.t("components:datePicker.dateRangerPicker.last30Days"),
        value: DATE_RANGE_OPTIONS.LAST_30_DAYS,
    },
    {
        text: i18n.t("components:datePicker.dateRangerPicker.previousMonth"),
        value: DATE_RANGE_OPTIONS.PREVIOUS_MONTH,
    },
    {
        text: i18n.t("components:datePicker.dateRangerPicker.previousWeek"),
        value: DATE_RANGE_OPTIONS.PREVIOUS_WEEK,
    },
    {
        text: i18n.t("components:datePicker.dateRangerPicker.thisMonth"),
        value: DATE_RANGE_OPTIONS.THIS_MONTH,
    },
    {
        text: i18n.t("components:datePicker.dateRangerPicker.thisWeek"),
        value: DATE_RANGE_OPTIONS.THIS_WEEK,
    },
    // { text: i18n.t("components:datePicker.dateRangerPicker.today"), value: "TODAY" },
    {
        text: i18n.t("components:datePicker.dateRangerPicker.custom"),
        value: DATE_RANGE_OPTIONS.CUSTOM,
    },
];

const DateRangePickerWithOptions = ({
    onChange,
    initialMonth,
    initialYear,
    value,
    maxRange,
    defaultValue,
    selectedOption,
    setSelectedOption,
}) => {
    // const [selectedOption, setSelectedOption] = useState("LAST_30_DAYS");

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
        if (selectedOption !== DATE_RANGE_OPTIONS.CUSTOM) {
            setSelectedOption(DATE_RANGE_OPTIONS.CUSTOM);
        }

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

    const handleRangeOptionChange = (event, index) => {
        const value = OPTIONS[index].value;
        setSelectedOption(value);

        // based on value to set startDate and endDate
        if (value === DATE_RANGE_OPTIONS.LAST_30_DAYS) {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - 29); // 29 days before today

            setStartDate({
                date: start.getDate(),
                month: start.getMonth(),
                year: start.getFullYear(),
            });
            setEndDate({
                date: today.getDate(),
                month: today.getMonth(),
                year: today.getFullYear(),
            });
        } else if (value === DATE_RANGE_OPTIONS.PREVIOUS_MONTH) {
            /*else if (value === "TODAY") {
            let start = getToday();
            let end = start;

            setStartDate(start);
            setEndDate(end);
        }*/
            setSelectedOption(DATE_RANGE_OPTIONS.PREVIOUS_MONTH);
            const end = getLastMonthLastDate();
            const start = getLastMonthFirstDate();

            setStartDate(start);
            setEndDate(end);
        } else if (value === DATE_RANGE_OPTIONS.PREVIOUS_WEEK) {
            const lastMonday = getLastWeekMonday();
            const lastSunday = getLastWeekSunday();

            setStartDate(lastMonday);
            setEndDate(lastSunday);
        } else if (value === DATE_RANGE_OPTIONS.THIS_WEEK) {
            const today = {
                date: new Date().getDate(),
                month: new Date().getMonth(),
                year: new Date().getYear() + 1900,
            };

            const thisMonday = getThisWeekMonday();
            setStartDate(thisMonday);
            setEndDate(today);
        } else if (value === DATE_RANGE_OPTIONS.THIS_MONTH) {
            const today = {
                date: new Date().getDate(),
                month: new Date().getMonth(),
                year: new Date().getYear() + 1900,
            };

            const firstDate = getThisMonthFirstDate();

            setStartDate(firstDate);
            setEndDate(today);
        }
    };

    return (
        <Stack direction={"row"} spacing={2}>
            <Box>
                <MenuList>
                    {OPTIONS.map((option, index) => {
                        const { text, value } = option;
                        return (
                            <CustomizedMenuItem
                                key={value}
                                onClick={event => handleRangeOptionChange(event, index)}
                                selected={value === selectedOption}
                            >
                                {text}
                            </CustomizedMenuItem>
                        );
                    })}
                </MenuList>
            </Box>
            <Box>
                <CalendarHeader>
                    {i18n.t(`components:datePicker.dateRangerPicker.month${month.month}`)} -{" "}
                    {month.year}
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
                <CalendarHeader>
                    {i18n.t(`components:datePicker.dateRangerPicker.month${nextMonth.month}`)} -{" "}
                    {nextMonth.year}
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

export default DateRangePickerWithOptions;
