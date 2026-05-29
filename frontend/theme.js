const theme = {
  colors: {
    bg: '#0a0a0a',
    card: '#151515',
    cardAlt: '#111111',
    text: '#ffffff',
    subtext: '#aaaaaa',
    primary: '#00b8cc',
    secondary: '#00b8cc',
    border: '#2c2c2c',
    success: '#2ecc71',
    danger: '#e74c3c',
  },
  spacing: (n = 1) => 8 * n,
  radius: 12,
  text: {
    title: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
    body: { fontSize: 16, color: '#ffffff' },
    small: { fontSize: 13, color: '#aaaaaa' },
  }
};

export default theme;
