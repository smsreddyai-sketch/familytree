import './globals.css'

export const metadata = {
  title: 'SAMA Family Tree',
  description: 'Private family tree for the SAMA family',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
