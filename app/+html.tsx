import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

// This file overrides the default Expo Router HTML template for web builds.
// Static assets placed in public/ are served at the root of the deployment.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <title>Dial It In</title>
        <meta name="description" content="Track, learn, and perfect your brew" />
        <meta name="theme-color" content="#C68A3A" />

        {/* Favicon — served from public/favicon.png via Vercel's static file handling */}
        <link rel="icon" href="/favicon.png" type="image/png" sizes="1024x1024" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* Required for react-native-web's ScrollView to fill the viewport */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  )
}
