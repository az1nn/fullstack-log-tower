import { vi } from 'vitest'

export function setupPrismaMock(mockPrisma: any) {
  vi.clearAllMocks()
  mockPrisma.log.createMany.mockResolvedValue({ count: 0 })
  mockPrisma.log.findMany.mockResolvedValue([])
  mockPrisma.log.count.mockResolvedValue(0)
  mockPrisma.log.groupBy.mockResolvedValue([])
  mockPrisma.$queryRaw.mockResolvedValue([])
  return mockPrisma
}
