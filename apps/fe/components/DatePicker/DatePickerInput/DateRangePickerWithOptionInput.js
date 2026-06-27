import React, { useEffect, useState } from "react";

import { styled } from "@mui/material/styles";

import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import InputAdornment from "@mui/material/InputAdornment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import Menu from "@mui/material/Menu";

import { ddmmyyyy, getStartOfDate } from "../../../utilities/datetime";
import DateRangePickerWithOptions from "../DateRangePicker/DateRangePickerWithOptions";
import TerritoryButton from "../../Button/TerritoryButton";
import PrimaryButton from "../../Button/PrimaryButton";
import { useTranslation } from "react-i18next";
import { DATE_RANGE_OPTIONS } from "../config";

const CustomTextField = styled(TextField)(({ theme }) => ({
    "& .MuiFormHelperText-root": {
        marginLeft: "00px",
    },
    "& .MuiOutlinedInput-root": {
        "&.Mui-focused fieldset": {
            borderColor: theme.palette.green,
        },
        backgroundColor: "#FFF",
    },
}));

const DateRangePickerWithOptionInput = props => {
    const { t } = useTranslation();
    const { onChange, value, error, helperText, height } = props;
    const propsCopy = { ...props };
    const maxRange = (() => {
        if (propsCopy.maxRange) {
            const d = propsCopy.maxRange;
            delete propsCopy.maxRange;
            return d;
        }
        return null;
    })();
    const defaultValue = (() => {
        if (propsCopy.defaultValue) {
            const d = propsCopy.defaultValue;
            delete propsCopy.defaultValue;
            return d;
        }
        return null;
    })();

    const [range, setRange] = useState({
        start: null,
        end: null,
    });
    const [anchorEl, setAnchoEl] = useState(null);
    const [dateRangeSelectedOption, setDateRangeSelectedOption] = useState(
        DATE_RANGE_OPTIONS.LAST_30_DAYS
    );

    const handleClose = () => {
        setAnchoEl(null);
    };

    const handleConfirm = () => {
        if (range) {
            let newValue = { ...range };
            if (range.start && range.end) {
            } else if (range.start) {
                const start = getStartOfDate(range.start);
                const end = getStartOfDate(range.start);
                newValue = {
                    start: start,
                    end: end,
                };
            } else if (range.end) {
                const start = getStartOfDate(range.end);
                const end = getStartOfDate(range.end);
                newValue = {
                    start: start,
                    end: end,
                };
            }
            onChange({
                target: {
                    value: newValue,
                },
            });
        }
        handleClose();
    };

    const inputDisplay = (() => {
        if (defaultValue) {
            if (defaultValue.start && defaultValue.end) {
                return `${ddmmyyyy(defaultValue.start)} - ${ddmmyyyy(defaultValue.end)}`;
            }
            if (defaultValue.start) {
                return `${ddmmyyyy(defaultValue.start)} - ${ddmmyyyy(defaultValue.start)}`;
            } else if (defaultValue.end) {
                return `${ddmmyyyy(defaultValue.end)} - ${ddmmyyyy(defaultValue.end)}`;
            }
        }

        if (value) {
            if (value.start && value.end) {
                return `${ddmmyyyy(value.start)} - ${ddmmyyyy(value.end)}`;
            }
            if (value.start) {
                return `${ddmmyyyy(value.start)} - ${ddmmyyyy(value.start)}`;
            } else if (value.end) {
                return `${ddmmyyyy(value.end)} - ${ddmmyyyy(value.end)}`;
            }
        }
        return "dd/mm/yyyy - dd/mm/yyyy";
    })();

    useEffect(() => {
        if (!value) {
            setRange({
                start: null,
                end: null,
            });
        } else {
            if (value.start && value.end) {
                setRange({ ...value });
            } else if (value.start) {
                setRange(prev => {
                    const start = getStartOfDate(value.start);
                    const end = getStartOfDate(value.start);
                    return {
                        start: start,
                        end: end,
                    };
                });
            } else if (value.end) {
                setRange(prev => {
                    const start = getStartOfDate(value.end);
                    const end = getStartOfDate(value.end);
                    return {
                        start: start,
                        end: end,
                    };
                });
            }
        }
    }, [value]);

    useEffect(() => {
        if (defaultValue) {
            setRange(defaultValue);
            handleConfirm();
        }
    }, [defaultValue]);

    return (
        <Box sx={{ position: "relative" }}>
            <CustomTextField
                {...propsCopy}
                InputProps={{
                    readOnly: true,
                    endAdornment: (
                        <InputAdornment position="end">
                            <CalendarMonthIcon></CalendarMonthIcon>
                        </InputAdornment>
                    ),
                    style: {
                        color: value && value.start && value.end ? "#000" : "#BEBDBD",
                        height: height,
                    },
                }}
                onChange={e => {}}
                value={inputDisplay}
                onClick={e => {
                    setAnchoEl(e.currentTarget);
                }}
                sx={{
                    width: "230px",
                    "& .MuiInputBase-root": {
                        "& input": {
                            cursor: "pointer",
                        },
                        cursor: "pointer",
                        borderRadius: "10px",
                    },
                }}
            />
            <Menu
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                sx={{
                    "& .MuiMenu-list": {
                        padding: 0,
                        background: "none",
                        width: "100%",
                    },
                    "& .MuiMenu-paper": {
                        borderRadius: "20px 10px 20px 20px",
                        marginTop: "5px",
                    },
                }}
                transitionDuration={100}
            >
                <Box
                    sx={{
                        padding: "1rem",
                        width: "100%",
                    }}
                >
                    <DateRangePickerWithOptions
                        value={value}
                        onChange={range => {
                            setRange(range);
                        }}
                        defaultValue={range}
                        maxRange={maxRange}
                        selectedOption={dateRangeSelectedOption}
                        setSelectedOption={setDateRangeSelectedOption}
                    />
                    <Stack direction={"row"} spacing={1} justifyContent="flex-end">
                        <TerritoryButton onClick={handleClose}>{t("common.close")}</TerritoryButton>
                        <PrimaryButton onClick={handleConfirm}>{t("common.confirm")}</PrimaryButton>
                    </Stack>
                </Box>
            </Menu>
        </Box>
    );
};

export default DateRangePickerWithOptionInput;
