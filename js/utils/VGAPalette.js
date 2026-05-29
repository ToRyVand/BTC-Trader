/**
 * VGAPalette - VGA 16-color palette matching dashboard CSS
 */
export const VGAPalette = {
  // Base colors
  black:    '#000000',
  dgray:    '#333333',
  gray:     '#555555',
  lgray:    '#888888',
  white:    '#cccccc',
  
  // Blue
  dblue:    '#0000aa',
  blue:     '#5555ff',
  
  // Cyan
  dcyan:    '#00aaaa',
  cyan:     '#55ffff',
  
  // Green
  dgreen:   '#00aa00',
  green:    '#55ff55',
  
  // Red
  dred:     '#aa0000',
  red:      '#ff5555',
  
  // Magenta
  dmagenta: '#aa00aa',
  magenta:  '#ff55ff',
  
  // Yellow/Brown
  dyellow:  '#aa5500',
  yellow:   '#ffff55',
  brown:    '#aa5500',
  
  // UI colors
  bg:       '#000000',
  panel:    '#0c0c0c',
  panel2:   '#111111',
  border:   '#2a2a2a',
  borderLight: '#3f3f3f',
  text:     '#999999',
  dim:      '#444444'
};

/**
 * Agent color themes
 */
export const AgentColors = {
  tech:     VGAPalette.blue,
  quant:    VGAPalette.green,
  fund:     VGAPalette.yellow,
  sent:     VGAPalette.magenta,
  risk:     VGAPalette.red,
  director: VGAPalette.dmagenta
};
