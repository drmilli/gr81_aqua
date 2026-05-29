const theme = {
  colors: {
    bg: '#071325',
    card: '#0c1f38',
    cardAlt: '#091a30',
    text: '#f2f6ff',
    subtext: '#9fb1c7',
    primary: '#d4af37',
    secondary: '#2b8cff',
    border: '#173052',
    success: '#2ecc71',
    danger: '#e74c3c',
  },
  spacing: (n = 1) => 8 * n,
  radius: 12,
  text: {
    title: { fontSize: 22, fontWeight: '700', color: '#f2f6ff' },
    body: { fontSize: 16, color: '#f2f6ff' },
    small: { fontSize: 13, color: '#9fb1c7' },
  }
};

export default theme;
