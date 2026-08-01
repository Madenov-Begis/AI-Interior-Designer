import { createTheme, type MantineColorsTuple } from "@mantine/core";

const renoa: MantineColorsTuple = [
  "#efffd4",
  "#dcffb2",
  "#c4fb83",
  "#a9ed32",
  "#93d71d",
  "#78bd09",
  "#5a9400",
  "#3e6800",
  "#254000",
  "#102000",
];

export const theme = createTheme({
  primaryColor: "renoa",
  primaryShade: 3,
  colors: { renoa },
  fontFamily: "var(--font-geist-sans), Geist, Arial, sans-serif",
  headings: {
    fontFamily: "var(--font-geist-sans), Geist, Arial, sans-serif",
    fontWeight: "800",
  },
  defaultRadius: "md",
  black: "#111113",
  white: "#f2f2ef",
  other: {
    surface: "#232325",
    elevated: "#2c2c2f",
    border: "#343437",
    muted: "#9a9a9f",
  },
});
