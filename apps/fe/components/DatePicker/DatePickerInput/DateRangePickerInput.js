import React, { useEffect, useState } from "react";

import { styled } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { useQueryParam } from "../../../hook/useQueryParam";

import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import PrimaryButton from "../../Button/PrimaryButton";

import DateRangePicker from "../DateRangePicker/DateRangePicker";
import { ddmmyyyy, getStartOfDate } from "../../../utilities/datetime";
import TerritoryButton from "../../Button/TerritoryButton";
import { useTranslation } from "react-i18next";

const CustomTextField = styled(TextField)(({ theme }) => ({
    "& .MuiFormHelperText-root": {
        marginLeft: "00px",
    },
    "& .MuiOutlinedInput-root": {
        "&.Mui-focused fieldset": {
            borderColor: "var(--mainColor) !important",
        },
    },
}));

const DateRangePickerInput = props => {
    const { t } = useTranslation();
    const { reset } = useForm();
    const { handleReset } = useQueryParam();
    const { onChange, value, error, helperText, height, id } = props;
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
        if (propsCopy.onSubmit) {
            propsCopy.onSubmit();
        }
        handleClose();
    };

    const handleClear = e => {
        e.stopPropagation(); // Prevent opening the picker

        // Clear internal state
        setRange({
            start: null,
            end: null,
        });

        // Trigger onChange with null value
        onChange({
            target: {
                value: {
                    start: null,
                    end: null,
                },
            },
        });

        propsCopy.id == "createdAt"
            ? reset({
                  createdAt: null,
              })
            : reset({
                  updatedAt: null,
              });

        handleReset();
        // If onSubmit exists, call it
        // if (propsCopy.onSubmit) {
        //     propsCopy.onSubmit();
        // }
    };

    const inputDisplay = (() => {
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
        return propsCopy.placeholder ? propsCopy.placeholder : "dd/mm/yyyy - dd/mm/yyyy";
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
        }
    }, [defaultValue]);

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
            }}
        >
            <CustomTextField
                {...propsCopy}
                InputProps={{
                    readOnly: true,
                    endAdornment: (
                        <InputAdornment position="end">
                            {value && value.start && value.end && (
                                <i
                                    class="bi bi-x-lg"
                                    onClick={handleClear}
                                    style={{ marginRight: "8px" }}
                                ></i>
                            )}
                            <i
                                class="bi bi-calendar-range"
                                style={{ fontSize: "16px", color: "#9f9f9f" }}
                            ></i>
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
                    "& .MuiInputBase-root": {
                        "& input": {
                            cursor: "pointer",
                        },
                        cursor: "pointer",
                        borderRadius: "10px",
                    },
                    color: (!value || (!range.start && !range.end)) && "#9f9f9f",
                }}
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
                        width: "100%",
                    },
                    "& .MuiMenu-paper": {
                        borderRadius: "var(--boxBorderRadius)",
                        boxShadow: "var(--menuBoxShadow) !important",
                    },
                    "& .MuiPaper-root": {
                        border: "var(--territoryButtonBorder)",
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
                    <DateRangePicker
                        value={value}
                        onChange={range => {
                            setRange(range);
                        }}
                        defaultValue={range}
                        maxRange={maxRange}
                    />
                    <Stack direction={"row"} spacing={1} justifyContent="flex-end">
                        <TerritoryButton variant="contained" disableElevation onClick={handleClose}>
                            {t("common.cancel")}
                        </TerritoryButton>
                        <PrimaryButton variant="contained" disableElevation onClick={handleConfirm}>
                            {t("common.confirm")}
                        </PrimaryButton>
                    </Stack>
                </Box>
            </Menu>
        </Box>
    );
};

export default DateRangePickerInput;
