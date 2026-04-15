import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e65d2c',       // RI Breakers orange
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0a205a',       // RI Breakers navy
    },
    background: {
      default: '#060e24',    // deep ocean dark
      paper: '#0d1e42',      // slightly lighter navy
    },
    text: {
      primary: '#ffffff',
      secondary: '#a8bcd4',
    },
    divider: 'rgba(255,255,255,0.1)',
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
    h1: { fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em' },
    h2: { fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em' },
    h3: { fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em' },
    h4: { fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em' },
    h5: { fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em' },
    h6: { fontFamily: "'Bayon', sans-serif", letterSpacing: '0.03em' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.07)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },
  },
})

export default theme
