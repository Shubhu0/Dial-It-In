// Direction A — "Fieldbook" font families
// Fraunces (display) + Newsreader (body) + JetBrains Mono (labels)
// All loaded in app/_layout.tsx via useFonts
export const fonts = {
  // Display / headlines — Fraunces variable serif (editorial, warm)
  serif:       'Fraunces_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',

  // Body text — Newsreader (optical-size serif, warm and readable)
  body:        'Newsreader_400Regular',
  bodyItalic:  'Newsreader_400Regular_Italic',

  // Numerals / metadata / mono labels — JetBrains Mono
  mono:        'JetBrainsMono_400Regular',
  monoMedium:  'JetBrainsMono_500Medium',

  // Fallback alias so old references to `fonts.sans` don't break
  sans:        undefined as any,
}
