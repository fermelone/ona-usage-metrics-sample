import './globals.css'

export const metadata = {
  title: 'Ona Usage Metrics Dashboard',
  description: 'Track environment usage across your Ona organization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
