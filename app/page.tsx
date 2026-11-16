import type { Metadata } from 'next'
import { ShowcaseHome } from '@/components/showcase-home'

export const metadata: Metadata = { title: 'Project Showcase 2026', description: 'Student Cabinet Project Showcase team check-in portal.' }

export default function HomePage() {
  return <ShowcaseHome />
}
