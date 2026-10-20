import './globals.css'

export const metadata = {
  title: 'Dynamic Family Tree',
  description: 'Interactive and collaborative family tree',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
